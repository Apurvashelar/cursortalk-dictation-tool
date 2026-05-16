use std::collections::HashMap;
use std::env;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};

use anyhow::{anyhow, Context, Result};
use argon2::{
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{Path, Query, Request, State},
    http::{header, HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Redirect, Response},
    routing::{get, post},
    Extension, Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::{rngs::OsRng, RngCore};
use reqwest::header::{ACCEPT as REQWEST_ACCEPT, USER_AGENT as REQWEST_USER_AGENT};
use reqwest::Client;
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
use url::Url;
use uuid::Uuid;

#[derive(Clone)]
struct AppConfig {
    bind_addr: SocketAddr,
    token_ttl_hours: i64,
    cors_allowed_origin: Option<String>,
    public_base_url: Option<String>,
    google_oauth: Option<OAuthProviderConfig>,
    github_oauth: Option<OAuthProviderConfig>,
    oauth_state_ttl_minutes: i64,
    oauth_code_ttl_minutes: i64,
}

#[derive(Clone)]
struct AppState {
    db: PgPool,
    config: Arc<AppConfig>,
    oauth_states: Arc<Mutex<HashMap<String, PendingOAuthStart>>>,
    auth_codes: Arc<Mutex<HashMap<String, PendingDesktopAuthCode>>>,
}

#[derive(Clone)]
struct OAuthProviderConfig {
    client_id: String,
    client_secret: String,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum OAuthProvider {
    Google,
    GitHub,
}

impl OAuthProvider {
    fn parse(value: &str) -> Result<Self, AppError> {
        match value {
            "google" => Ok(Self::Google),
            "github" => Ok(Self::GitHub),
            _ => Err(AppError::new(
                StatusCode::NOT_FOUND,
                "The requested OAuth provider is not supported.",
            )),
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Self::Google => "google",
            Self::GitHub => "github",
        }
    }
}

#[derive(Clone)]
struct PendingOAuthStart {
    provider: OAuthProvider,
    desktop_redirect_uri: String,
    expires_at: OffsetDateTime,
}

#[derive(Clone)]
struct PendingDesktopAuthCode {
    response: AuthResponse,
    expires_at: OffsetDateTime,
}

#[derive(Debug, Clone)]
struct OAuthIdentity {
    email: String,
    first_name: String,
    last_name: String,
}

#[derive(Debug, Clone)]
struct ResolvedUserAccount {
    user_id: Uuid,
    user: UserPayload,
    organization_id: Option<String>,
    organization_name: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
struct UserPayload {
    first_name: String,
    last_name: String,
    email: String,
}

#[derive(Debug, Serialize, Clone)]
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

#[derive(Debug, Deserialize)]
struct OAuthStartQuery {
    desktop_redirect_uri: String,
}

#[derive(Debug, Deserialize)]
struct OAuthCallbackQuery {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OAuthExchangeRequest {
    auth_code: String,
}

#[derive(Debug, Serialize)]
struct OAuthStartResponse {
    authorization_url: String,
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

    let state = AppState {
        db,
        config,
        oauth_states: Arc::new(Mutex::new(HashMap::new())),
        auth_codes: Arc::new(Mutex::new(HashMap::new())),
    };
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

    let public_base_url = env::var("AUTH_PUBLIC_BASE_URL")
        .ok()
        .and_then(|value| normalize_public_base_url(&value));

    let oauth_state_ttl_minutes = env::var("AUTH_OAUTH_STATE_TTL_MINUTES")
        .ok()
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(10);

    let oauth_code_ttl_minutes = env::var("AUTH_OAUTH_CODE_TTL_MINUTES")
        .ok()
        .and_then(|value| value.parse::<i64>().ok())
        .unwrap_or(5);

    Ok(AppConfig {
        bind_addr,
        token_ttl_hours,
        cors_allowed_origin,
        public_base_url,
        google_oauth: load_oauth_provider_config("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET")?,
        github_oauth: load_oauth_provider_config("GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET")?,
        oauth_state_ttl_minutes,
        oauth_code_ttl_minutes,
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
        .route("/auth/oauth/:provider/start", get(start_oauth_sign_in))
        .route("/auth/oauth/:provider/callback", get(complete_oauth_callback))
        .route("/auth/oauth/exchange", post(exchange_oauth_code))
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
        "service": "cursortalk-auth-service",
    }))
}

async fn start_oauth_sign_in(
    Path(provider): Path<String>,
    State(state): State<AppState>,
    Query(query): Query<OAuthStartQuery>,
) -> Result<impl IntoResponse, AppError> {
    let provider = OAuthProvider::parse(&provider)?;
    let desktop_redirect_uri = validate_desktop_redirect_uri(&query.desktop_redirect_uri)?;
    let callback_uri = oauth_callback_uri(&state.config, provider)?;
    let authorization_url = build_oauth_authorization_url(
        &state,
        provider,
        &desktop_redirect_uri,
        &callback_uri,
    )?;

    Ok(Json(OAuthStartResponse { authorization_url }))
}

async fn complete_oauth_callback(
    Path(provider): Path<String>,
    State(state): State<AppState>,
    Query(query): Query<OAuthCallbackQuery>,
) -> Result<impl IntoResponse, AppError> {
    let provider = OAuthProvider::parse(&provider)?;
    let state_token = query
        .state
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| AppError::new(StatusCode::BAD_REQUEST, "Missing OAuth state."))?;
    let pending = take_pending_oauth_state(&state, state_token, provider)?;

    if let Some(error) = query.error.filter(|value| !value.trim().is_empty()) {
        return Ok(Redirect::to(&append_query_param(
            &pending.desktop_redirect_uri,
            "error",
            &error,
        )?));
    }

    let code = query
        .code
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| AppError::new(StatusCode::BAD_REQUEST, "Missing OAuth authorization code."))?;
    let callback_uri = oauth_callback_uri(&state.config, provider)?;
    let identity = exchange_oauth_identity(&state, provider, code, &callback_uri).await?;
    let account = resolve_or_create_oauth_user(&state, identity).await?;
    let session = create_session(
        &state,
        account.user,
        account.user_id,
        account.organization_id,
        account.organization_name,
    )
    .await?;
    let auth_code = store_pending_auth_code(&state, session)?;

    Ok(Redirect::to(&append_query_param(
        &pending.desktop_redirect_uri,
        "auth_code",
        &auth_code,
    )?))
}

async fn exchange_oauth_code(
    State(state): State<AppState>,
    Json(payload): Json<OAuthExchangeRequest>,
) -> Result<impl IntoResponse, AppError> {
    let response = take_pending_auth_code(&state, payload.auth_code.trim())?;
    Ok(Json(response))
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

fn normalize_public_base_url(value: &str) -> Option<String> {
    let normalized = value.trim().trim_end_matches('/').to_string();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

fn load_oauth_provider_config(
    client_id_env: &str,
    client_secret_env: &str,
) -> Result<Option<OAuthProviderConfig>> {
    let client_id = env::var(client_id_env).ok().map(|value| value.trim().to_string());
    let client_secret = env::var(client_secret_env)
        .ok()
        .map(|value| value.trim().to_string());

    match (
        client_id.filter(|value| !value.is_empty()),
        client_secret.filter(|value| !value.is_empty()),
    ) {
        (Some(client_id), Some(client_secret)) => Ok(Some(OAuthProviderConfig {
            client_id,
            client_secret,
        })),
        (None, None) => Ok(None),
        _ => Err(anyhow!(
            "{client_id_env} and {client_secret_env} must both be set to enable that OAuth provider"
        )),
    }
}

fn validate_desktop_redirect_uri(value: &str) -> Result<String, AppError> {
    let url = Url::parse(value)
        .map_err(|_| AppError::new(StatusCode::BAD_REQUEST, "Invalid desktop redirect URI."))?;
    let host = url.host_str().unwrap_or_default();
    let is_loopback = matches!(host, "127.0.0.1" | "localhost");

    if url.scheme() != "http" || !is_loopback {
        return Err(AppError::new(
            StatusCode::BAD_REQUEST,
            "Desktop redirect URI must use a local loopback HTTP address.",
        ));
    }

    Ok(value.trim().to_string())
}

fn oauth_callback_uri(config: &AppConfig, provider: OAuthProvider) -> Result<String, AppError> {
    let public_base_url = config.public_base_url.as_ref().ok_or_else(|| {
        AppError::new(
            StatusCode::INTERNAL_SERVER_ERROR,
            "OAuth requires AUTH_PUBLIC_BASE_URL to be configured on the auth service.",
        )
    })?;

    Ok(format!(
        "{public_base_url}/auth/oauth/{}/callback",
        provider.as_str()
    ))
}

fn oauth_provider_config<'a>(
    config: &'a AppConfig,
    provider: OAuthProvider,
) -> Result<&'a OAuthProviderConfig, AppError> {
    match provider {
        OAuthProvider::Google => config.google_oauth.as_ref(),
        OAuthProvider::GitHub => config.github_oauth.as_ref(),
    }
    .ok_or_else(|| {
        AppError::new(
            StatusCode::NOT_IMPLEMENTED,
            format!("{} sign-in is not configured for this workspace.", provider.as_str()),
        )
    })
}

fn build_oauth_authorization_url(
    state: &AppState,
    provider: OAuthProvider,
    desktop_redirect_uri: &str,
    callback_uri: &str,
) -> Result<String, AppError> {
    prune_expired_oauth_entries(state);
    let provider_config = oauth_provider_config(&state.config, provider)?;
    let state_token = generate_token();
    let expires_at =
        OffsetDateTime::now_utc() + Duration::minutes(state.config.oauth_state_ttl_minutes);

    state
        .oauth_states
        .lock()
        .map_err(|_| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, "Failed to track OAuth state."))?
        .insert(
            state_token.clone(),
            PendingOAuthStart {
                provider,
                desktop_redirect_uri: desktop_redirect_uri.to_string(),
                expires_at,
            },
        );

    let mut url = match provider {
        OAuthProvider::Google => Url::parse("https://accounts.google.com/o/oauth2/v2/auth")
            .expect("valid Google OAuth URL"),
        OAuthProvider::GitHub => Url::parse("https://github.com/login/oauth/authorize")
            .expect("valid GitHub OAuth URL"),
    };

    {
        let mut pairs = url.query_pairs_mut();
        pairs.append_pair("client_id", &provider_config.client_id);
        pairs.append_pair("redirect_uri", callback_uri);
        pairs.append_pair("state", &state_token);

        match provider {
            OAuthProvider::Google => {
                pairs.append_pair("response_type", "code");
                pairs.append_pair("scope", "openid email profile");
                pairs.append_pair("access_type", "offline");
                pairs.append_pair("prompt", "consent");
            }
            OAuthProvider::GitHub => {
                pairs.append_pair("scope", "read:user user:email");
            }
        }
    }

    Ok(url.into())
}

fn append_query_param(base_url: &str, key: &str, value: &str) -> Result<String, AppError> {
    let mut url = Url::parse(base_url)
        .map_err(|_| AppError::new(StatusCode::BAD_REQUEST, "Invalid redirect URI."))?;
    url.query_pairs_mut().append_pair(key, value);
    Ok(url.into())
}

fn take_pending_oauth_state(
    state: &AppState,
    state_token: &str,
    provider: OAuthProvider,
) -> Result<PendingOAuthStart, AppError> {
    prune_expired_oauth_entries(state);
    let pending = state
        .oauth_states
        .lock()
        .map_err(|_| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, "Failed to access OAuth state."))?
        .remove(state_token)
        .ok_or_else(|| AppError::new(StatusCode::BAD_REQUEST, "OAuth session expired. Try again."))?;

    if pending.provider != provider || pending.expires_at <= OffsetDateTime::now_utc() {
        return Err(AppError::new(
            StatusCode::BAD_REQUEST,
            "OAuth session expired. Try again.",
        ));
    }

    Ok(pending)
}

fn store_pending_auth_code(state: &AppState, response: AuthResponse) -> Result<String, AppError> {
    prune_expired_oauth_entries(state);
    let auth_code = generate_token();
    let expires_at =
        OffsetDateTime::now_utc() + Duration::minutes(state.config.oauth_code_ttl_minutes);

    state
        .auth_codes
        .lock()
        .map_err(|_| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, "Failed to store desktop auth code."))?
        .insert(
            auth_code.clone(),
            PendingDesktopAuthCode {
                response,
                expires_at,
            },
        );

    Ok(auth_code)
}

fn take_pending_auth_code(state: &AppState, auth_code: &str) -> Result<AuthResponse, AppError> {
    prune_expired_oauth_entries(state);
    let pending = state
        .auth_codes
        .lock()
        .map_err(|_| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, "Failed to access desktop auth code."))?
        .remove(auth_code)
        .ok_or_else(|| AppError::new(StatusCode::BAD_REQUEST, "OAuth sign-in code expired. Try again."))?;

    if pending.expires_at <= OffsetDateTime::now_utc() {
        return Err(AppError::new(
            StatusCode::BAD_REQUEST,
            "OAuth sign-in code expired. Try again.",
        ));
    }

    Ok(pending.response)
}

fn prune_expired_oauth_entries(state: &AppState) {
    let now = OffsetDateTime::now_utc();

    if let Ok(mut pending_states) = state.oauth_states.lock() {
        pending_states.retain(|_, pending| pending.expires_at > now);
    }

    if let Ok(mut auth_codes) = state.auth_codes.lock() {
        auth_codes.retain(|_, pending| pending.expires_at > now);
    }
}

async fn oauth_http_client() -> Result<Client, AppError> {
    Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .context("failed to initialize OAuth HTTP client")
        .map_err(AppError::from)
}

#[derive(Debug, Deserialize)]
struct GoogleTokenResponse {
    access_token: String,
}

#[derive(Debug, Deserialize)]
struct GoogleUserInfoResponse {
    email: String,
    #[serde(default)]
    email_verified: bool,
    #[serde(default)]
    given_name: String,
    #[serde(default)]
    family_name: String,
    #[serde(default)]
    name: String,
}

#[derive(Debug, Deserialize)]
struct GitHubTokenResponse {
    access_token: String,
}

#[derive(Debug, Deserialize)]
struct GitHubUserResponse {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    email: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GitHubEmailResponse {
    email: String,
    #[serde(default)]
    primary: bool,
    #[serde(default)]
    verified: bool,
}

async fn exchange_oauth_identity(
    state: &AppState,
    provider: OAuthProvider,
    code: &str,
    callback_uri: &str,
) -> Result<OAuthIdentity, AppError> {
    match provider {
        OAuthProvider::Google => exchange_google_identity(state, code, callback_uri).await,
        OAuthProvider::GitHub => exchange_github_identity(state, code, callback_uri).await,
    }
}

async fn exchange_google_identity(
    state: &AppState,
    code: &str,
    callback_uri: &str,
) -> Result<OAuthIdentity, AppError> {
    let provider = oauth_provider_config(&state.config, OAuthProvider::Google)?;
    let client = oauth_http_client().await?;

    let token_response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code),
            ("client_id", provider.client_id.as_str()),
            ("client_secret", provider.client_secret.as_str()),
            ("redirect_uri", callback_uri),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .context("failed to exchange Google OAuth code")
        .map_err(AppError::from)?;

    if !token_response.status().is_success() {
        return Err(AppError::new(
            StatusCode::BAD_GATEWAY,
            "Google sign-in could not be completed.",
        ));
    }

    let token_payload = token_response
        .json::<GoogleTokenResponse>()
        .await
        .context("failed to parse Google token response")
        .map_err(AppError::from)?;

    let user_response = client
        .get("https://openidconnect.googleapis.com/v1/userinfo")
        .bearer_auth(&token_payload.access_token)
        .send()
        .await
        .context("failed to fetch Google profile")
        .map_err(AppError::from)?;

    if !user_response.status().is_success() {
        return Err(AppError::new(
            StatusCode::BAD_GATEWAY,
            "Google sign-in profile lookup failed.",
        ));
    }

    let payload = user_response
        .json::<GoogleUserInfoResponse>()
        .await
        .context("failed to parse Google user profile")
        .map_err(AppError::from)?;

    if !payload.email_verified {
        return Err(AppError::new(
            StatusCode::BAD_REQUEST,
            "Google account email must be verified before sign-in.",
        ));
    }

    Ok(OAuthIdentity {
        email: payload.email,
        first_name: if payload.given_name.trim().is_empty() {
            payload.name.split_whitespace().next().unwrap_or_default().to_string()
        } else {
            payload.given_name
        },
        last_name: payload.family_name,
    })
}

async fn exchange_github_identity(
    state: &AppState,
    code: &str,
    callback_uri: &str,
) -> Result<OAuthIdentity, AppError> {
    let provider = oauth_provider_config(&state.config, OAuthProvider::GitHub)?;
    let client = oauth_http_client().await?;

    let token_response = client
        .post("https://github.com/login/oauth/access_token")
        .header(REQWEST_ACCEPT, "application/json")
        .header(REQWEST_USER_AGENT, "CursorTalk Auth Service")
        .form(&[
            ("code", code),
            ("client_id", provider.client_id.as_str()),
            ("client_secret", provider.client_secret.as_str()),
            ("redirect_uri", callback_uri),
        ])
        .send()
        .await
        .context("failed to exchange GitHub OAuth code")
        .map_err(AppError::from)?;

    if !token_response.status().is_success() {
        return Err(AppError::new(
            StatusCode::BAD_GATEWAY,
            "GitHub sign-in could not be completed.",
        ));
    }

    let token_payload = token_response
        .json::<GitHubTokenResponse>()
        .await
        .context("failed to parse GitHub token response")
        .map_err(AppError::from)?;

    let user_response = client
        .get("https://api.github.com/user")
        .header(REQWEST_ACCEPT, "application/json")
        .header(REQWEST_USER_AGENT, "CursorTalk Auth Service")
        .bearer_auth(&token_payload.access_token)
        .send()
        .await
        .context("failed to fetch GitHub profile")
        .map_err(AppError::from)?;

    if !user_response.status().is_success() {
        return Err(AppError::new(
            StatusCode::BAD_GATEWAY,
            "GitHub sign-in profile lookup failed.",
        ));
    }

    let user_payload = user_response
        .json::<GitHubUserResponse>()
        .await
        .context("failed to parse GitHub user profile")
        .map_err(AppError::from)?;

    let emails_response = client
        .get("https://api.github.com/user/emails")
        .header(REQWEST_ACCEPT, "application/json")
        .header(REQWEST_USER_AGENT, "CursorTalk Auth Service")
        .bearer_auth(&token_payload.access_token)
        .send()
        .await
        .context("failed to fetch GitHub emails")
        .map_err(AppError::from)?;

    if !emails_response.status().is_success() {
        return Err(AppError::new(
            StatusCode::BAD_GATEWAY,
            "GitHub sign-in email lookup failed.",
        ));
    }

    let emails = emails_response
        .json::<Vec<GitHubEmailResponse>>()
        .await
        .context("failed to parse GitHub email response")
        .map_err(AppError::from)?;

    let email = emails
        .iter()
        .find(|entry| entry.primary && entry.verified)
        .or_else(|| emails.iter().find(|entry| entry.verified))
        .map(|entry| entry.email.clone())
        .ok_or_else(|| {
            AppError::new(
                StatusCode::BAD_REQUEST,
                "GitHub sign-in requires a verified email address.",
            )
        })?;

    let name = user_payload.name.unwrap_or_default();
    let mut parts = name.split_whitespace();
    let first_name = parts.next().unwrap_or_default().to_string();
    let last_name = parts.collect::<Vec<_>>().join(" ");

    Ok(OAuthIdentity {
        email,
        first_name,
        last_name,
    })
}

async fn resolve_or_create_oauth_user(
    state: &AppState,
    identity: OAuthIdentity,
) -> Result<ResolvedUserAccount, AppError> {
    let normalized_email = normalize_email(&identity.email)?;

    if let Some(existing) = lookup_user_by_email(state, &normalized_email).await? {
        return Ok(existing);
    }

    let user_id = Uuid::new_v4();
    let password_hash = hash_password(&generate_token()).map_err(AppError::from)?;
    let first_name = normalize_name(&identity.first_name)?;
    let last_name = normalize_name(&identity.last_name)?;

    sqlx::query(
        r#"
        INSERT INTO users (id, email, password_hash, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5)
        "#,
    )
    .bind(user_id)
    .bind(&normalized_email)
    .bind(&password_hash)
    .bind(&first_name)
    .bind(&last_name)
    .execute(&state.db)
    .await
    .context("failed to create OAuth user")
    .map_err(AppError::from)?;

    lookup_user_by_email(state, &normalized_email)
        .await?
        .ok_or_else(|| AppError::new(StatusCode::INTERNAL_SERVER_ERROR, "OAuth user lookup failed."))
}

async fn lookup_user_by_email(
    state: &AppState,
    email: &str,
) -> Result<Option<ResolvedUserAccount>, AppError> {
    let row = sqlx::query(
        r#"
        SELECT
          users.id,
          users.email,
          users.first_name,
          users.last_name,
          users.organization_id,
          organizations.name AS organization_name
        FROM users
        LEFT JOIN organizations ON organizations.id = users.organization_id
        WHERE users.email = $1
        "#,
    )
    .bind(email)
    .fetch_optional(&state.db)
    .await
    .context("failed to query user by email")
    .map_err(AppError::from)?;

    Ok(row.map(|row| ResolvedUserAccount {
        user_id: row.get::<Uuid, _>("id"),
        user: UserPayload {
            first_name: row.get::<String, _>("first_name"),
            last_name: row.get::<String, _>("last_name"),
            email: row.get::<String, _>("email"),
        },
        organization_id: row
            .try_get::<Option<Uuid>, _>("organization_id")
            .ok()
            .flatten()
            .map(|value| value.to_string()),
        organization_name: row
            .try_get::<Option<String>, _>("organization_name")
            .ok()
            .flatten(),
    }))
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
