use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

use anyhow::{anyhow, Context, Result};
use keyring::Entry;
use reqwest::blocking::{Client, Response};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::app_state::AppState;
use crate::local_setup;

const AUTH_SESSION_FILE_NAME: &str = "auth-session.json";
const AUTH_BASE_URL_ENV: &str = "VOICEFLOW_AUTH_BASE_URL";
const AUTH_KEYRING_SERVICE: &str = "com.cursortalk.desktop.auth";
const LEGACY_AUTH_KEYRING_SERVICE: &str = "com.voiceflow.desktop.auth";
const AUTH_KEYRING_USER: &str = "current-session";
pub const AUTH_EVENT: &str = "auth-state-changed";

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuthUser {
    #[serde(default, alias = "firstName")]
    pub first_name: String,
    #[serde(default, alias = "lastName")]
    pub last_name: String,
    #[serde(default)]
    pub email: String,
}

impl AuthUser {
    fn display_name(&self) -> String {
        let full_name = format!("{} {}", self.first_name.trim(), self.last_name.trim())
            .trim()
            .to_string();

        if !full_name.is_empty() {
            return full_name;
        }

        self.email.clone()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PersistedAuthSession {
    pub access_token: String,
    #[serde(default)]
    pub refresh_token: Option<String>,
    pub user: AuthUser,
    #[serde(default)]
    pub auth_base_url: Option<String>,
    #[serde(default)]
    pub organization_id: Option<String>,
    #[serde(default)]
    pub organization_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct PersistedAuthSessionMetadata {
    pub user: AuthUser,
    #[serde(default)]
    pub auth_base_url: Option<String>,
    #[serde(default)]
    pub organization_id: Option<String>,
    #[serde(default)]
    pub organization_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SecretSessionMaterial {
    access_token: String,
    #[serde(default)]
    refresh_token: Option<String>,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct AuthStateSnapshot {
    pub state: String,
    pub is_authenticated: bool,
    pub message: String,
    pub auth_base_url: Option<String>,
    pub organization_id: Option<String>,
    pub organization_name: Option<String>,
    pub user: Option<AuthUser>,
}

pub struct AuthRuntime {
    pub session: Option<PersistedAuthSession>,
}

impl Default for AuthRuntime {
    fn default() -> Self {
        Self {
            session: load_persisted_session().ok().flatten(),
        }
    }
}

impl AuthRuntime {
    pub fn snapshot(&self) -> AuthStateSnapshot {
        match &self.session {
            Some(session) => AuthStateSnapshot {
                state: "signed_in".to_string(),
                is_authenticated: true,
                message: if let Some(organization_name) = session.organization_name.as_ref() {
                    format!(
                        "Signed in as {}. Organization: {}.",
                        session.user.display_name(),
                        organization_name
                    )
                } else {
                    format!(
                        "Signed in as {}. This account is not attached to an organization yet.",
                        session.user.display_name()
                    )
                },
                auth_base_url: session.auth_base_url.clone(),
                organization_id: session.organization_id.clone(),
                organization_name: session.organization_name.clone(),
                user: Some(session.user.clone()),
            },
            None => AuthStateSnapshot {
                state: "signed_out".to_string(),
                is_authenticated: false,
                message: "Not signed in.".to_string(),
                auth_base_url: None,
                organization_id: None,
                organization_name: None,
                user: None,
            },
        }
    }
}

#[derive(Debug, Deserialize)]
struct AuthEnvelope {
    #[serde(default, alias = "accessToken")]
    access_token: Option<String>,
    #[serde(default, alias = "refreshToken")]
    refresh_token: Option<String>,
    #[serde(default)]
    token: Option<String>,
    #[serde(default)]
    user: Option<AuthUser>,
    #[serde(default)]
    profile: Option<AuthUser>,
    #[serde(default)]
    account: Option<AuthUser>,
    #[serde(default, alias = "organizationId")]
    organization_id: Option<String>,
    #[serde(default, alias = "organizationName")]
    organization_name: Option<String>,
    #[serde(default)]
    email: Option<String>,
    #[serde(default, alias = "firstName")]
    first_name: Option<String>,
    #[serde(default, alias = "lastName")]
    last_name: Option<String>,
    #[serde(default)]
    message: Option<String>,
}

impl AuthEnvelope {
    fn access_token(&self) -> Option<String> {
        self.access_token
            .clone()
            .or_else(|| self.token.clone())
            .filter(|value| !value.trim().is_empty())
    }

    fn user(&self) -> Option<AuthUser> {
        self.user
            .clone()
            .or_else(|| self.profile.clone())
            .or_else(|| self.account.clone())
            .or_else(|| {
                let email = self.email.clone().unwrap_or_default();
                let first_name = self.first_name.clone().unwrap_or_default();
                let last_name = self.last_name.clone().unwrap_or_default();

                if email.is_empty() && first_name.is_empty() && last_name.is_empty() {
                    None
                } else {
                    Some(AuthUser {
                        first_name,
                        last_name,
                        email,
                    })
                }
            })
    }
}

#[derive(Debug, Deserialize)]
struct ErrorEnvelope {
    #[serde(default)]
    message: Option<String>,
    #[serde(default)]
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct SignInPayload<'a> {
    email: &'a str,
    password: &'a str,
}

#[derive(Debug, Serialize)]
struct SignUpPayload<'a> {
    email: &'a str,
    password: &'a str,
}

#[derive(Debug, Serialize)]
struct UpdateProfilePayload<'a> {
    first_name: &'a str,
    last_name: &'a str,
}

fn http_client() -> Result<Client> {
    Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .context("failed to initialize auth HTTP client")
}

fn session_path() -> PathBuf {
    local_setup::default_storage_path().join(AUTH_SESSION_FILE_NAME)
}

fn keyring_entry() -> Result<Entry> {
    Entry::new(AUTH_KEYRING_SERVICE, AUTH_KEYRING_USER)
        .context("failed to access OS credential store")
}

fn legacy_keyring_entry() -> Result<Entry> {
    Entry::new(LEGACY_AUTH_KEYRING_SERVICE, AUTH_KEYRING_USER)
        .context("failed to access OS credential store")
}

fn is_missing_credential_error(error: &keyring::Error) -> bool {
    error.to_string().to_lowercase().contains("no entry")
}

fn normalize_base_url(base_url: &str) -> Option<String> {
    let normalized = base_url.trim().trim_end_matches('/').to_string();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

pub fn resolve_auth_base_url(
    app: &AppHandle,
    requested_base_url: Option<String>,
) -> Result<String> {
    if let Some(base_url) = requested_base_url.and_then(|value| normalize_base_url(&value)) {
        return Ok(base_url);
    }

    if let Ok(base_url) = std::env::var(AUTH_BASE_URL_ENV) {
        if let Some(normalized) = normalize_base_url(&base_url) {
            return Ok(normalized);
        }
    }

    if let Ok(runtime) = app.state::<AppState>().runtime.lock() {
        if let Some(base_url) = runtime
            .organization_base_url
            .clone()
            .and_then(|value| normalize_base_url(&value))
        {
            return Ok(base_url);
        }
    }

    Err(anyhow!(
        "No auth service URL is configured. Set VOICEFLOW_AUTH_BASE_URL or configure the organization server first."
    ))
}

fn load_persisted_session() -> Result<Option<PersistedAuthSession>> {
    let path = session_path();
    let Ok(contents) = fs::read_to_string(&path) else {
        return Ok(None);
    };

    let metadata: PersistedAuthSessionMetadata =
        serde_json::from_str(&contents).context("failed to deserialize persisted auth session")?;

    let secret_json = match keyring_entry()?.get_password() {
        Ok(value) => value,
        Err(error) if is_missing_credential_error(&error) => match legacy_keyring_entry()?.get_password() {
            Ok(value) => value,
            Err(legacy_error) => {
                let _ = fs::remove_file(&path);
                return Err(anyhow!(
                    "failed to read the auth token from secure storage: {legacy_error}"
                ));
            }
        },
        Err(error) => {
            let _ = fs::remove_file(&path);
            return Err(anyhow!(
                "failed to read the auth token from secure storage: {error}"
            ));
        }
    };

    let material: SecretSessionMaterial = serde_json::from_str(&secret_json)
        .context("failed to deserialize secure auth session material")?;

    Ok(Some(PersistedAuthSession {
        access_token: material.access_token,
        refresh_token: material.refresh_token,
        user: metadata.user,
        auth_base_url: metadata.auth_base_url,
        organization_id: metadata.organization_id,
        organization_name: metadata.organization_name,
    }))
}

fn persist_session(session: &PersistedAuthSession) -> Result<()> {
    let storage_path = local_setup::default_storage_path();
    fs::create_dir_all(&storage_path)
        .with_context(|| format!("failed to create {}", storage_path.display()))?;

    let secret_json = serde_json::to_string(&SecretSessionMaterial {
        access_token: session.access_token.clone(),
        refresh_token: session.refresh_token.clone(),
    })
    .context("failed to serialize secure auth session material")?;

    keyring_entry()?
        .set_password(&secret_json)
        .context("failed to store auth token in secure storage")?;

    if let Ok(entry) = legacy_keyring_entry() {
        let _ = entry.delete_credential();
    }

    let metadata = PersistedAuthSessionMetadata {
        user: session.user.clone(),
        auth_base_url: session.auth_base_url.clone(),
        organization_id: session.organization_id.clone(),
        organization_name: session.organization_name.clone(),
    };
    let json = serde_json::to_string_pretty(&metadata)
        .context("failed to serialize auth session metadata")?;
    let path = session_path();
    fs::write(&path, json).with_context(|| format!("failed to write {}", path.display()))?;
    Ok(())
}

fn clear_persisted_session() -> Result<()> {
    let path = session_path();
    if path.exists() {
        fs::remove_file(&path).with_context(|| format!("failed to remove {}", path.display()))?;
    }
    for entry in [keyring_entry()?, legacy_keyring_entry()?] {
        match entry.delete_credential() {
            Ok(_) => {}
            Err(error) => {
                if !is_missing_credential_error(&error) {
                    return Err(anyhow!(
                        "failed to clear auth token from secure storage: {error}"
                    ));
                }
            }
        }
    }
    Ok(())
}

fn endpoint(base_url: &str, path: &str) -> String {
    format!("{base_url}{path}")
}

fn response_error(response: Response) -> String {
    let status = response.status();
    let fallback = match status {
        StatusCode::BAD_REQUEST => {
            "The request could not be completed. Please check the information and try again."
                .to_string()
        }
        StatusCode::UNAUTHORIZED => {
            "We couldn't sign you in with those details. Check your email and password and try again."
                .to_string()
        }
        StatusCode::FORBIDDEN => {
            "Your account does not have permission to perform that action.".to_string()
        }
        StatusCode::CONFLICT => {
            "That email address is already in use. Try signing in instead.".to_string()
        }
        StatusCode::NOT_FOUND => "The requested account resource could not be found.".to_string(),
        StatusCode::TOO_MANY_REQUESTS => {
            "Too many attempts were made. Please wait a moment and try again.".to_string()
        }
        status if status.is_server_error() => {
            "The CursorTalk authentication service is having trouble right now. Please try again in a moment."
                .to_string()
        }
        _ => "The authentication request could not be completed. Please try again.".to_string(),
    };

    if status == StatusCode::UNAUTHORIZED {
        return fallback;
    }

    match response.json::<ErrorEnvelope>() {
        Ok(payload) => payload
            .message
            .or(payload.error)
            .filter(|value| !value.trim().is_empty())
            .unwrap_or(fallback),
        Err(_) => fallback,
    }
}

fn friendly_network_error(action: &str, error: &reqwest::Error) -> String {
    if error.is_timeout() || error.is_connect() {
        return format!(
            "We couldn't reach the CursorTalk authentication service for {action}. Check your internet connection and try again."
        );
    }

    if error.is_request() {
        return format!(
            "We couldn't send the {action} request. Please try again."
        );
    }

    format!(
        "The CursorTalk authentication service could not complete {action}. Please try again."
    )
}

fn friendly_auth_error(_action: &str, error: anyhow::Error) -> anyhow::Error {
    let message = error.to_string();

    if message.contains("No auth service URL is configured") {
        return anyhow!(
            "CursorTalk could not find the authentication service URL. Try again in a moment or contact support if the problem continues."
        );
    }

    if message.contains("AUTH_UNAUTHORIZED") {
        return anyhow!("Your session has expired. Sign in again to continue.");
    }

    anyhow!("{message}")
}

fn fetch_profile(base_url: &str, access_token: &str) -> Result<AuthEnvelope> {
    let client = http_client()?;
    let response = client
        .get(endpoint(base_url, "/auth/me"))
        .bearer_auth(access_token)
        .send()
        .map_err(|error| anyhow!(friendly_network_error("session refresh", &error)))?;

    if response.status() == StatusCode::UNAUTHORIZED || response.status() == StatusCode::FORBIDDEN {
        return Err(anyhow!("AUTH_UNAUTHORIZED"));
    }

    if !response.status().is_success() {
        return Err(anyhow!(response_error(response)));
    }

    response
        .json::<AuthEnvelope>()
        .context("failed to parse auth profile response")
}

fn session_from_envelope(
    base_url: &str,
    envelope: AuthEnvelope,
    fallback_access_token: Option<String>,
    fallback_refresh_token: Option<String>,
) -> Result<PersistedAuthSession> {
    let access_token = envelope
        .access_token()
        .or(fallback_access_token)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| anyhow!("Auth response did not include an access token."))?;

    let user = envelope
        .user()
        .filter(|value| !value.email.trim().is_empty())
        .ok_or_else(|| anyhow!("Auth response did not include a user profile."))?;

    Ok(PersistedAuthSession {
        access_token,
        refresh_token: envelope.refresh_token.or(fallback_refresh_token),
        user,
        auth_base_url: Some(base_url.to_string()),
        organization_id: envelope.organization_id,
        organization_name: envelope.organization_name,
    })
}

fn set_runtime_session(
    app: &AppHandle,
    next_session: Option<PersistedAuthSession>,
) -> Result<AuthStateSnapshot> {
    let snapshot = {
        let state = app.state::<AppState>();
        let mut auth = state
            .auth
            .lock()
            .map_err(|_| anyhow!("failed to lock auth state"))?;
        auth.session = next_session.clone();
        auth.snapshot()
    };

    match next_session {
        Some(session) => {
            if let Err(error) = persist_session(&session) {
                let path = session_path();
                let _ = fs::remove_file(&path);
                eprintln!("failed to persist auth session securely; continuing with in-memory session only: {error}");
            }
        }
        None => clear_persisted_session()?,
    }

    let _ = app.emit(AUTH_EVENT, &snapshot);
    Ok(snapshot)
}

pub fn sign_in(
    app: &AppHandle,
    email: String,
    password: String,
    requested_base_url: Option<String>,
) -> Result<AuthStateSnapshot> {
    let base_url = resolve_auth_base_url(app, requested_base_url)?;
    let client = http_client()?;
    let response = client
        .post(endpoint(&base_url, "/auth/sign-in"))
        .json(&SignInPayload {
            email: email.trim(),
            password: password.as_str(),
        })
        .send()
        .map_err(|error| anyhow!(friendly_network_error("sign-in", &error)))?;

    if !response.status().is_success() {
        return Err(anyhow!(response_error(response)));
    }

    let sign_in_payload = response
        .json::<AuthEnvelope>()
        .context("failed to parse sign-in response")?;

    let access_token = sign_in_payload.access_token();
    let refresh_token = sign_in_payload.refresh_token.clone();
    let profile_payload = if sign_in_payload.user().is_some() {
        sign_in_payload
    } else {
        let token = access_token
            .clone()
            .ok_or_else(|| anyhow!("Sign-in succeeded but no access token was returned."))?;
        fetch_profile(&base_url, &token)?
    };

    let session = session_from_envelope(&base_url, profile_payload, access_token, refresh_token)?;
    set_runtime_session(app, Some(session)).map_err(|error| friendly_auth_error("sign-in", error))
}

pub fn sign_up(
    app: &AppHandle,
    email: String,
    password: String,
    requested_base_url: Option<String>,
) -> Result<AuthStateSnapshot> {
    let base_url = resolve_auth_base_url(app, requested_base_url)?;
    let client = http_client()?;
    let response = client
        .post(endpoint(&base_url, "/auth/sign-up"))
        .json(&SignUpPayload {
            email: email.trim(),
            password: password.as_str(),
        })
        .send()
        .map_err(|error| anyhow!(friendly_network_error("account creation", &error)))?;

    if !response.status().is_success() {
        return Err(anyhow!(response_error(response)));
    }

    let sign_up_payload = response
        .json::<AuthEnvelope>()
        .context("failed to parse sign-up response")?;

    let access_token = sign_up_payload.access_token();
    let refresh_token = sign_up_payload.refresh_token.clone();
    let profile_payload = if sign_up_payload.user().is_some() {
        sign_up_payload
    } else {
        let token = access_token
            .clone()
            .ok_or_else(|| anyhow!("Sign-up succeeded but no access token was returned."))?;
        fetch_profile(&base_url, &token)?
    };

    let session = session_from_envelope(&base_url, profile_payload, access_token, refresh_token)?;
    set_runtime_session(app, Some(session))
        .map_err(|error| friendly_auth_error("account creation", error))
}

pub fn refresh_auth_state(
    app: &AppHandle,
    requested_base_url: Option<String>,
) -> Result<AuthStateSnapshot> {
    let existing_session = {
        let state = app.state::<AppState>();
        let auth = state
            .auth
            .lock()
            .map_err(|_| anyhow!("failed to lock auth state"))?;
        auth.session.clone()
    };

    let Some(existing_session) = existing_session else {
        return Ok(AuthStateSnapshot {
            state: "signed_out".to_string(),
            is_authenticated: false,
            message: "Not signed in.".to_string(),
            auth_base_url: None,
            organization_id: None,
            organization_name: None,
            user: None,
        });
    };

    let base_url = existing_session
        .auth_base_url
        .clone()
        .or_else(|| requested_base_url.and_then(|value| normalize_base_url(&value)))
        .or_else(|| {
            std::env::var(AUTH_BASE_URL_ENV)
                .ok()
                .and_then(|value| normalize_base_url(&value))
        })
        .ok_or_else(|| anyhow!("No auth service URL is configured."))?;

    let profile_payload = match fetch_profile(&base_url, &existing_session.access_token) {
        Ok(payload) => payload,
        Err(error) => {
            if error.to_string() == "AUTH_UNAUTHORIZED" {
                return set_runtime_session(app, None);
            }
            return Err(friendly_auth_error("session refresh", error));
        }
    };

    let session = session_from_envelope(
        &base_url,
        profile_payload,
        Some(existing_session.access_token),
        existing_session.refresh_token,
    )?;
    set_runtime_session(app, Some(session)).map_err(|error| friendly_auth_error("session refresh", error))
}

pub fn update_profile(
    app: &AppHandle,
    first_name: String,
    last_name: String,
    requested_base_url: Option<String>,
) -> Result<AuthStateSnapshot> {
    let existing_session = {
        let state = app.state::<AppState>();
        let auth = state
            .auth
            .lock()
            .map_err(|_| anyhow!("failed to lock auth state"))?;
        auth.session.clone()
    };

    let Some(existing_session) = existing_session else {
        return Err(anyhow!("Sign in before updating account details."));
    };

    let base_url = existing_session
        .auth_base_url
        .clone()
        .or_else(|| requested_base_url.and_then(|value| normalize_base_url(&value)))
        .ok_or_else(|| anyhow!("No auth service URL is configured."))?;

    let client = http_client()?;
    let response = client
        .patch(endpoint(&base_url, "/auth/me"))
        .bearer_auth(&existing_session.access_token)
        .json(&UpdateProfilePayload {
            first_name: first_name.trim(),
            last_name: last_name.trim(),
        })
        .send()
        .map_err(|error| anyhow!(friendly_network_error("profile update", &error)))?;

    if !response.status().is_success() {
        return Err(anyhow!(response_error(response)));
    }

    let payload = response
        .json::<AuthEnvelope>()
        .context("failed to parse profile update response")?;
    let session = session_from_envelope(
        &base_url,
        payload,
        Some(existing_session.access_token),
        existing_session.refresh_token,
    )?;
    set_runtime_session(app, Some(session))
        .map_err(|error| friendly_auth_error("profile update", error))
}

pub fn sign_out(app: &AppHandle) -> Result<AuthStateSnapshot> {
    let existing_session = {
        let state = app.state::<AppState>();
        let auth = state
            .auth
            .lock()
            .map_err(|_| anyhow!("failed to lock auth state"))?;
        auth.session.clone()
    };

    if let Some(existing_session) = &existing_session {
        if let Some(base_url) = existing_session.auth_base_url.clone() {
            if let Ok(client) = http_client() {
                let _ = client
                    .post(endpoint(&base_url, "/auth/sign-out"))
                    .bearer_auth(&existing_session.access_token)
                    .send();
            }
        }
    }

    set_runtime_session(app, None).map_err(|error| friendly_auth_error("sign-out", error))
}

pub fn delete_account(app: &AppHandle) -> Result<AuthStateSnapshot> {
    let existing_session = {
        let state = app.state::<AppState>();
        let auth = state
            .auth
            .lock()
            .map_err(|_| anyhow!("failed to lock auth state"))?;
        auth.session.clone()
    };

    let Some(existing_session) = existing_session else {
        return Err(anyhow!("Sign in before deleting the account."));
    };

    let base_url = existing_session
        .auth_base_url
        .clone()
        .ok_or_else(|| anyhow!("No auth service URL is configured."))?;

    let client = http_client()?;
    let response = client
        .delete(endpoint(&base_url, "/auth/me"))
        .bearer_auth(&existing_session.access_token)
        .send()
        .map_err(|error| anyhow!(friendly_network_error("account deletion", &error)))?;

    if response.status() != StatusCode::NO_CONTENT && !response.status().is_success() {
        return Err(anyhow!(response_error(response)));
    }

    set_runtime_session(app, None).map_err(|error| friendly_auth_error("account deletion", error))
}

pub fn get_auth_state(state: &Mutex<AuthRuntime>) -> Result<AuthStateSnapshot> {
    state
        .lock()
        .map(|auth| auth.snapshot())
        .map_err(|_| anyhow!("failed to lock auth state"))
}
