use std::env;
use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::{anyhow, Context, Result};
use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{Request, State},
    http::{header, HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Extension, Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::{postgres::PgPoolOptions, PgPool, Row};
use time::{Duration, OffsetDateTime};
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::info;
use uuid::Uuid;

#[derive(Clone)]
struct AppConfig {
    bind_addr: SocketAddr,
    token_ttl_hours: i64,
    cors_allowed_origin: Option<String>,
}

#[derive(Clone)]
struct AppState {
    db: PgPool,
    config: Arc<AppConfig>,
}

#[derive(Debug, Serialize, Clone)]
struct UserPayload {
    first_name: String,
    last_name: String,
    email: String,
}

#[derive(Debug, Serialize)]
struct AuthResponse {
    access_token: String,
    refresh_token: Option<String>,
    user: UserPayload,
    organization_id: Option<String>,
    organization_name: Option<String>,
}

#[derive(Debug, Serialize)]
struct ProfileResponse {
    user: UserPayload,
    organization_id: Option<String>,
    organization_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SignInRequest {
    email: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct SignUpRequest {
    email: String,
    password: String,
}

#[derive(Debug, Deserialize)]
struct UpdateProfileRequest {
    first_name: String,
    last_name: String,
}

#[derive(Debug)]
struct CurrentSession {
    session_id: Uuid,
    user_id: Uuid,
    token_hash: String,
    first_name: String,
    last_name: String,
    email: String,
    organization_id: Option<Uuid>,
    organization_name: Option<String>,
}

#[derive(Debug)]
struct AppError {
    status: StatusCode,
    message: String,
}

impl AppError {
    fn new(status: StatusCode, message: impl Into<String>) -> Self {
        Self {
            status,
            message: message.into(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (
            self.status,
            Json(json!({
                "message": self.message,
            })),
        )
            .into_response()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(error: anyhow::Error) -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, error.to_string())
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenvy::dotenv().ok();
    init_tracing();

    let config = Arc::new(load_config()?);
    let database_url =
        env::var("DATABASE_URL").context("DATABASE_URL must be set for the auth service")?;

    let db = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .context("failed to connect to Postgres")?;

    sqlx::migrate!("./migrations")
        .run(&db)
        .await
        .context("failed to run database migrations")?;

    let state = AppState { db, config };
    let app = build_router(state.clone());

    info!("starting auth service on {}", state.config.bind_addr);

    let listener = tokio::net::TcpListener::bind(state.config.bind_addr)
        .await
        .context("failed to bind auth service listener")?;

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("auth service exited unexpectedly")?;

    Ok(())
}

fn init_tracing() {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| "info,voiceflow_auth_service=debug,tower_http=info".into());
    tracing_subscriber::fmt().with_env_filter(filter).init();
}

fn load_config() -> Result<AppConfig> {
    let bind_addr = env::var("AUTH_BIND_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:4000".to_string())
        .parse::<SocketAddr>()
        .context("AUTH_BIND_ADDR must be a valid host:port")?;

    let token_ttl_hours = env::var("AUTH_TOKEN_TTL_HOURS")
        .ok()
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(24 * 30);

    if token_ttl_hours < 1 {
        return Err(anyhow!("AUTH_TOKEN_TTL_HOURS must be at least 1"));
    }

    let cors_allowed_origin = env::var("CORS_ALLOWED_ORIGIN")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());

    Ok(AppConfig {
        bind_addr,
        token_ttl_hours,
        cors_allowed_origin,
    })
}

fn build_router(state: AppState) -> Router {
    let cors = if let Some(origin) = state.config.cors_allowed_origin.clone() {
        let header_value: header::HeaderValue =
            origin.parse().expect("invalid CORS_ALLOWED_ORIGIN value");
        CorsLayer::new()
            .allow_origin(header_value)
            .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE])
            .allow_methods(Any)
    } else {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_headers([header::AUTHORIZATION, header::CONTENT_TYPE])
            .allow_methods(Any)
    };

    Router::new()
        .route("/health", get(health))
        .route("/auth/sign-up", post(sign_up))
        .route("/auth/sign-in", post(sign_in))
        .route("/auth/sign-out", post(sign_out))
        .route("/auth/me", get(get_me).patch(update_me).delete(delete_me))
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .layer(middleware::from_fn_with_state(
            state.clone(),
            attach_session,
        ))
        .with_state(state)
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };

    #[cfg(unix)]
    let terminate = async {
        let mut signal =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()).unwrap();
        signal.recv().await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

async fn health() -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "service": "voiceflow-auth-service",
    }))
}

async fn sign_up(
    State(state): State<AppState>,
    Json(payload): Json<SignUpRequest>,
) -> Result<impl IntoResponse, AppError> {
    let email = normalize_email(&payload.email)?;
    validate_password(&payload.password)?;

    let password_hash = hash_password(&payload.password)?;
    let user_id = Uuid::new_v4();

    let insert_result = sqlx::query(
        r#"
        INSERT INTO users (id, email, password_hash)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(user_id)
    .bind(&email)
    .bind(&password_hash)
    .execute(&state.db)
    .await;

    match insert_result {
        Ok(_) => {}
        Err(error) => {
            if is_unique_violation(&error) {
                return Err(AppError::new(
                    StatusCode::CONFLICT,
                    "An account already exists for that email address.",
                ));
            }

            return Err(AppError::from(anyhow!(error)));
        }
    }

    let session = create_session(
        &state,
        UserPayload {
            first_name: "".to_string(),
            last_name: "".to_string(),
            email,
        },
        user_id,
        None,
        None,
    )
    .await?;

    Ok((StatusCode::CREATED, Json(session)))
}

async fn sign_in(
    State(state): State<AppState>,
    Json(payload): Json<SignInRequest>,
) -> Result<impl IntoResponse, AppError> {
    let email = normalize_email(&payload.email)?;

    let row = sqlx::query(
        r#"
        SELECT
          users.id,
          users.email,
          users.password_hash,
          users.first_name,
          users.last_name,
          users.organization_id,
          organizations.name AS organization_name
        FROM users
        LEFT JOIN organizations ON organizations.id = users.organization_id
        WHERE users.email = $1
        "#,
    )
    .bind(&email)
    .fetch_optional(&state.db)
    .await
    .context("failed to query user for sign-in")
    .map_err(AppError::from)?;

    let Some(row) = row else {
        return Err(AppError::new(
            StatusCode::UNAUTHORIZED,
            "Email or password is incorrect.",
        ));
    };

    let password_hash: String = row.get("password_hash");
    verify_password(&payload.password, &password_hash)
        .map_err(|_| AppError::new(StatusCode::UNAUTHORIZED, "Email or password is incorrect."))?;

    let organization_id = row
        .try_get::<Option<Uuid>, _>("organization_id")
        .ok()
        .flatten()
        .map(|value| value.to_string());
    let organization_name = row
        .try_get::<Option<String>, _>("organization_name")
        .ok()
        .flatten();

    let session = create_session(
        &state,
        UserPayload {
            first_name: row.get::<String, _>("first_name"),
            last_name: row.get::<String, _>("last_name"),
            email: row.get::<String, _>("email"),
        },
        row.get::<Uuid, _>("id"),
        organization_id,
        organization_name,
    )
    .await?;

    Ok(Json(session))
}

async fn get_me(
    Extension(session): Extension<CurrentSession>,
) -> Result<impl IntoResponse, AppError> {
    Ok(Json(ProfileResponse {
        user: UserPayload {
            first_name: session.first_name,
            last_name: session.last_name,
            email: session.email,
        },
        organization_id: session.organization_id.map(|value| value.to_string()),
        organization_name: session.organization_name,
    }))
}

async fn update_me(
    State(state): State<AppState>,
    Extension(session): Extension<CurrentSession>,
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<impl IntoResponse, AppError> {
    let first_name = normalize_name(&payload.first_name)?;
    let last_name = normalize_name(&payload.last_name)?;

    sqlx::query(
        r#"
        UPDATE users
        SET first_name = $1, last_name = $2, updated_at = NOW()
        WHERE id = $3
        "#,
    )
    .bind(&first_name)
    .bind(&last_name)
    .bind(session.user_id)
    .execute(&state.db)
    .await
    .context("failed to update user profile")
    .map_err(AppError::from)?;

    Ok(Json(ProfileResponse {
        user: UserPayload {
            first_name,
            last_name,
            email: session.email,
        },
        organization_id: session.organization_id.map(|value| value.to_string()),
        organization_name: session.organization_name,
    }))
}

async fn sign_out(
    State(state): State<AppState>,
    Extension(session): Extension<CurrentSession>,
) -> Result<impl IntoResponse, AppError> {
    sqlx::query(
        r#"
        UPDATE sessions
        SET revoked_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(session.session_id)
    .execute(&state.db)
    .await
    .context("failed to revoke auth session")
    .map_err(AppError::from)?;

    Ok(StatusCode::NO_CONTENT)
}

async fn delete_me(
    State(state): State<AppState>,
    Extension(session): Extension<CurrentSession>,
) -> Result<impl IntoResponse, AppError> {
    let mut tx = state
        .db
        .begin()
        .await
        .context("failed to start delete-account transaction")
        .map_err(AppError::from)?;

    sqlx::query("DELETE FROM sessions WHERE user_id = $1")
        .bind(session.user_id)
        .execute(&mut *tx)
        .await
        .context("failed to delete user sessions")
        .map_err(AppError::from)?;

    sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(session.user_id)
        .execute(&mut *tx)
        .await
        .context("failed to delete user account")
        .map_err(AppError::from)?;

    tx.commit()
        .await
        .context("failed to finalize delete-account transaction")
        .map_err(AppError::from)?;

    Ok(StatusCode::NO_CONTENT)
}

async fn attach_session(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let requires_auth = matches!(request.uri().path(), "/auth/me" | "/auth/sign-out");

    match authenticate(&state, request.headers()).await {
        Ok(session) => {
            request.extensions_mut().insert(session);
            Ok(next.run(request).await)
        }
        Err(error) if requires_auth => Err(error),
        Err(_) => Ok(next.run(request).await),
    }
}

async fn authenticate(state: &AppState, headers: &HeaderMap) -> Result<CurrentSession, AppError> {
    let auth_header = headers
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| AppError::new(StatusCode::UNAUTHORIZED, "Missing authorization header."))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::new(StatusCode::UNAUTHORIZED, "Invalid bearer token."))?;

    let token_hash = hash_token(token);

    let row = sqlx::query(
        r#"
        SELECT
          sessions.id AS session_id,
          sessions.user_id,
          sessions.token_hash,
          users.first_name,
          users.last_name,
          users.email,
          users.organization_id,
          organizations.name AS organization_name
        FROM sessions
        INNER JOIN users ON users.id = sessions.user_id
        LEFT JOIN organizations ON organizations.id = users.organization_id
        WHERE sessions.token_hash = $1
          AND sessions.revoked_at IS NULL
          AND sessions.expires_at > NOW()
        "#,
    )
    .bind(&token_hash)
    .fetch_optional(&state.db)
    .await
    .context("failed to authenticate session")
    .map_err(AppError::from)?;

    let Some(row) = row else {
        return Err(AppError::new(
            StatusCode::UNAUTHORIZED,
            "Your session is no longer valid. Sign in again.",
        ));
    };

    sqlx::query("UPDATE sessions SET last_used_at = NOW() WHERE id = $1")
        .bind(row.get::<Uuid, _>("session_id"))
        .execute(&state.db)
        .await
        .context("failed to update session usage timestamp")
        .map_err(AppError::from)?;

    Ok(CurrentSession {
        session_id: row.get("session_id"),
        user_id: row.get("user_id"),
        token_hash: row.get("token_hash"),
        first_name: row.get("first_name"),
        last_name: row.get("last_name"),
        email: row.get("email"),
        organization_id: row
            .try_get::<Option<Uuid>, _>("organization_id")
            .ok()
            .flatten(),
        organization_name: row
            .try_get::<Option<String>, _>("organization_name")
            .ok()
            .flatten(),
    })
}

async fn create_session(
    state: &AppState,
    user: UserPayload,
    user_id: Uuid,
    organization_id: Option<String>,
    organization_name: Option<String>,
) -> Result<AuthResponse, AppError> {
    let access_token = generate_token();
    let token_hash = hash_token(&access_token);
    let expires_at = OffsetDateTime::now_utc() + Duration::hours(state.config.token_ttl_hours);

    sqlx::query(
        r#"
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(Uuid::new_v4())
    .bind(user_id)
    .bind(&token_hash)
    .bind(expires_at)
    .execute(&state.db)
    .await
    .context("failed to create auth session")
    .map_err(AppError::from)?;

    Ok(AuthResponse {
        access_token,
        refresh_token: None,
        user,
        organization_id,
        organization_name,
    })
}

fn normalize_email(value: &str) -> Result<String, AppError> {
    let normalized = value.trim().to_lowercase();
    if normalized.is_empty() || !normalized.contains('@') {
        return Err(AppError::new(
            StatusCode::BAD_REQUEST,
            "Enter a valid email address.",
        ));
    }
    if normalized.len() > 320 {
        return Err(AppError::new(
            StatusCode::BAD_REQUEST,
            "Email address is too long.",
        ));
    }
    Ok(normalized)
}

fn normalize_name(value: &str) -> Result<String, AppError> {
    let normalized = value.trim().to_string();
    if normalized.len() > 100 {
        return Err(AppError::new(
            StatusCode::BAD_REQUEST,
            "Names must be 100 characters or fewer.",
        ));
    }
    Ok(normalized)
}

fn validate_password(value: &str) -> Result<(), AppError> {
    if value.len() < 8 {
        return Err(AppError::new(
            StatusCode::BAD_REQUEST,
            "Password must be at least 8 characters.",
        ));
    }
    if value.len() > 512 {
        return Err(AppError::new(
            StatusCode::BAD_REQUEST,
            "Password is too long.",
        ));
    }
    Ok(())
}

fn hash_password(password: &str) -> Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|error| anyhow!("failed to hash password: {error}"))
}

fn verify_password(password: &str, stored_hash: &str) -> Result<()> {
    let parsed_hash = PasswordHash::new(stored_hash)
        .map_err(|error| anyhow!("failed to parse password hash: {error}"))?;
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| anyhow!("password verification failed"))?;
    Ok(())
}

fn generate_token() -> String {
    let mut bytes = [0_u8; 32];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

fn hash_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    matches!(
        error,
        sqlx::Error::Database(database_error) if database_error.code().as_deref() == Some("23505")
    )
}

impl Clone for CurrentSession {
    fn clone(&self) -> Self {
        Self {
            session_id: self.session_id,
            user_id: self.user_id,
            token_hash: self.token_hash.clone(),
            first_name: self.first_name.clone(),
            last_name: self.last_name.clone(),
            email: self.email.clone(),
            organization_id: self.organization_id,
            organization_name: self.organization_name.clone(),
        }
    }
}
