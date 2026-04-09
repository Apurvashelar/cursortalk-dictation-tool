use crate::app_state::{AppState, RuntimeMode, SessionSnapshot, SessionStatus, SESSION_EVENT};
use crate::cleanup;
use crate::config::AppConfig;
use crate::local_setup;
use crate::paste;
use crate::recorder;
use crate::stt;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

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
        .session
        .lock()
        .map(|value| value.snapshot().state)
        .unwrap_or_else(|_| "error".to_string())
}

#[tauri::command]
pub fn get_config() -> AppConfig {
    AppConfig::default()
}

#[tauri::command]
pub fn set_runtime_mode(
    mode: String,
    organization_base_url: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "failed to lock runtime settings".to_string())?;

    runtime.mode = if mode == "local" {
        RuntimeMode::Local
    } else {
        RuntimeMode::Organization
    };
    runtime.organization_base_url = organization_base_url
        .map(|value| value.trim().trim_end_matches('/').to_string())
        .filter(|value| !value.is_empty());

    Ok(())
}

#[tauri::command]
pub async fn get_backend_health() -> BackendHealth {
    let config = AppConfig::default();
    let health_url = config.health_url.clone();
    let cleanup_url = config.cleanup_url.clone();

    check_backend_health_internal(cleanup_url, health_url).await
}

#[tauri::command]
pub async fn check_backend_health_with_urls(
    cleanup_url: String,
    health_url: String,
) -> BackendHealth {
    check_backend_health_internal(cleanup_url, health_url).await
}

async fn check_backend_health_internal(cleanup_url: String, health_url: String) -> BackendHealth {
    match reqwest::get(&health_url).await {
        Ok(response) if response.status().is_success() => BackendHealth {
            status: "healthy".to_string(),
            endpoint: cleanup_url,
            health_url,
            message: "Tunnel endpoint is reachable.".to_string(),
        },
        Ok(response) => BackendHealth {
            status: "degraded".to_string(),
            endpoint: cleanup_url,
            health_url,
            message: format!("Health check returned HTTP {}.", response.status()),
        },
        Err(error) => BackendHealth {
            status: "unreachable".to_string(),
            endpoint: cleanup_url,
            health_url,
            message: format!(
                "Could not reach the forwarded backend. Start or verify the SSH tunnel. ({error})"
            ),
        },
    }
}

#[tauri::command]
pub fn get_session_state(state: tauri::State<'_, AppState>) -> Result<SessionSnapshot, String> {
    let session = state
        .session
        .lock()
        .map_err(|_| "failed to lock session state".to_string())?;

    Ok(session.snapshot())
}

#[tauri::command]
pub fn list_audio_input_devices() -> Result<Vec<recorder::AudioInputDevice>, String> {
    recorder::list_input_devices().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn start_recording(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    let snapshot = start_recording_internal(&app, &state)?;
    Ok(snapshot)
}

#[tauri::command]
pub async fn stop_recording(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    let snapshot = stop_recording_internal(&app, &state, false).await?;
    Ok(snapshot)
}

#[tauri::command]
pub fn get_stt_status() -> stt::SttStatus {
    stt::current_status()
}

#[tauri::command]
pub fn get_local_setup_status() -> local_setup::LocalSetupStatus {
    local_setup::detect_local_setup()
}

#[tauri::command]
pub fn run_local_setup(app: AppHandle) -> Result<local_setup::LocalSetupStatus, String> {
    local_setup::run_local_setup(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn paste_latest_output(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    paste_latest_output_internal(&app, &state)
}

pub fn handle_hotkey_toggle(app: &AppHandle) {
    let state = app.state::<AppState>();
    let current_state = state
        .session
        .lock()
        .map(|session| session.snapshot().state)
        .unwrap_or_else(|_| "error".to_string());

    let result = if current_state == "recording" {
        let app_handle = app.clone();
        tauri::async_runtime::spawn(async move {
            let state = app_handle.state::<AppState>();
            if let Err(error) = stop_recording_internal(&app_handle, &state, true).await {
                let _ = update_error_state(&app_handle, &state, error);
            }
        });
        return;
    } else {
        start_recording_internal(app, &state)
    };

    if let Err(error) = result {
        let _ = update_error_state(app, &state, error);
    }
}

fn start_recording_internal(
    app: &AppHandle,
    state: &tauri::State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    let snapshot = {
        let mut session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;
        let details = state.recorder.start().map_err(|error| error.to_string())?;

        session.status = SessionStatus::Recording;
        session.input_device = Some(details.device_name.clone());
        session.active_recording = Some(details);
        session.transcription = None;
        session.cleanup = None;
        session.paste = None;
        session.last_error = None;
        session.snapshot()
    };

    emit_session_state(app, &snapshot);
    Ok(snapshot)
}

async fn stop_recording_internal(
    app: &AppHandle,
    state: &tauri::State<'_, AppState>,
    should_paste: bool,
) -> Result<SessionSnapshot, String> {
    let snapshot = {
        let mut session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;
        let recording = state.recorder.stop().map_err(|error| error.to_string())?;

        session.status = SessionStatus::Transcribing;
        session.input_device = Some(recording.device_name.clone());
        session.active_recording = None;
        session.last_recording = Some(recording);
        session.last_error = None;
        session.snapshot()
    };

    emit_session_state(app, &snapshot);

    let recorded_path = snapshot
        .last_recording_path
        .clone()
        .ok_or_else(|| "recording path missing after stop".to_string())?;
    let config = AppConfig::default();
    let (runtime_mode, organization_base_url) = {
        let runtime = state
            .runtime
            .lock()
            .map_err(|_| "failed to lock runtime settings".to_string())?;
        (runtime.mode.clone(), runtime.organization_base_url.clone())
    };
    let stt_model_dir = match runtime_mode {
        RuntimeMode::Local => {
            let local_status = local_setup::detect_local_setup();
            if local_status.status == "missing" {
                return Err("Local setup is not complete yet.".to_string());
            }
            local_status.stt_model_dir
        }
        RuntimeMode::Organization => config.stt_model_dir.clone(),
    };

    let transcription = stt::transcribe_wav(&recorded_path, &stt_model_dir)
        .map_err(|error| error.to_string())?;

    let cleaning_snapshot = {
        let mut session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;

        session.transcription = Some(transcription.clone());
        session.status = SessionStatus::Cleaning;
        let snapshot = session.snapshot();
        emit_session_state(app, &snapshot);
        snapshot
    };

    let raw_transcript = cleaning_snapshot
        .raw_transcript
        .clone()
        .unwrap_or_default();

    let cleanup_result = match runtime_mode {
        RuntimeMode::Local => {
            let local_status = local_setup::detect_local_setup();
            let mut local_server = state
                .local_cleanup_server
                .lock()
                .map_err(|_| "failed to lock local cleanup server state".to_string())?;

            match cleanup::clean_text_local(
                app,
                &mut local_server,
                &local_status.cleanup_model_dir,
                &raw_transcript,
            ) {
                Ok(result) => result,
                Err(error) => cleanup::fallback_from_raw(&raw_transcript, &error.to_string()),
            }
        }
        RuntimeMode::Organization => {
            let cleanup_url = organization_base_url
                .map(|base_url| format!("{base_url}/clean"))
                .unwrap_or_else(|| config.cleanup_url.clone());

            match cleanup::clean_text(&cleanup_url, &raw_transcript).await {
                Ok(result) => result,
                Err(error) => cleanup::fallback_from_raw(&raw_transcript, &error.to_string()),
            }
        }
    };

    let final_snapshot = {
        let mut session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;

        session.cleanup = Some(cleanup_result.clone());
        session.paste = None;
        session.status = SessionStatus::Idle;
        session.last_error = None;
        session.snapshot()
    };

    emit_session_state(app, &final_snapshot);

    if should_paste {
        paste_latest_output_internal(app, state)
    } else {
        Ok(final_snapshot)
    }
}

fn update_error_state(
    app: &AppHandle,
    state: &tauri::State<'_, AppState>,
    error: String,
) -> Result<SessionSnapshot, String> {
    let snapshot = {
        let mut session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;

        session.status = SessionStatus::Error;
        session.active_recording = None;
        session.last_error = Some(error);
        session.snapshot()
    };

    emit_session_state(app, &snapshot);
    Ok(snapshot)
}

fn paste_latest_output_internal(
    app: &AppHandle,
    state: &tauri::State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    let final_output = {
        let session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;
        session
            .snapshot()
            .final_output
            .ok_or_else(|| "there is no transcript output available to paste".to_string())?
    };

    {
        let mut session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;
        session.status = SessionStatus::Pasting;
        let snapshot = session.snapshot();
        emit_session_state(app, &snapshot);
    }

    let paste_result = match paste::paste_text(&final_output) {
        Ok(result) => result,
        Err(error) => {
            let error_message = error.to_string();
            let _ = update_error_state(app, state, error_message.clone());
            return Err(error_message);
        }
    };

    let final_snapshot = {
        let mut session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;
        session.paste = Some(paste_result);
        session.status = SessionStatus::Idle;
        session.last_error = None;
        session.snapshot()
    };

    emit_session_state(app, &final_snapshot);
    Ok(final_snapshot)
}

fn emit_session_state(app: &AppHandle, snapshot: &SessionSnapshot) {
    let _ = app.emit(SESSION_EVENT, snapshot);
}
