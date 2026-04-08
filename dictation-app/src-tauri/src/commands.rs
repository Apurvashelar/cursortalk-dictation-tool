use crate::app_state::AppState;
use crate::config::AppConfig;
use serde::Serialize;

#[derive(Serialize)]
pub struct BackendHealth {
    pub status: String,
    pub endpoint: String,
    pub health_url: String,
    pub message: String,
}

#[tauri::command]
pub fn get_app_status(state: tauri::State<'_, AppState>) -> String {
    state
        .status
        .lock()
        .map(|value| value.clone())
        .unwrap_or_else(|_| "error".to_string())
}

#[tauri::command]
pub fn get_config() -> AppConfig {
    AppConfig::default()
}

#[tauri::command]
pub async fn get_backend_health() -> BackendHealth {
    let config = AppConfig::default();
    let health_url = config.health_url.clone();

    match reqwest::get(&health_url).await {
        Ok(response) if response.status().is_success() => BackendHealth {
            status: "healthy".to_string(),
            endpoint: config.server_url,
            health_url,
            message: "Tunnel endpoint is reachable.".to_string(),
        },
        Ok(response) => BackendHealth {
            status: "degraded".to_string(),
            endpoint: config.server_url,
            health_url,
            message: format!("Health check returned HTTP {}.", response.status()),
        },
        Err(error) => BackendHealth {
            status: "unreachable".to_string(),
            endpoint: config.server_url,
            health_url,
            message: format!(
                "Could not reach the forwarded backend. Start or verify the SSH tunnel. ({error})"
            ),
        },
    }
}
