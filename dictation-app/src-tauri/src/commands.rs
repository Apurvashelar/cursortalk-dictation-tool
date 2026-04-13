use crate::app_state::{
    AppState, PillTerminalState, RuntimeMode, SessionSnapshot, SessionStatus, SESSION_EVENT,
};
use crate::auth;
use crate::cleanup;
use crate::config::AppConfig;
use crate::desktop_ui;
use crate::dictation_log;
use crate::local_setup;
use crate::paste;
use crate::permissions;
use crate::recorder;
use crate::sound;
use crate::stt;
use crate::ui_prefs::{self, UiPreferences};
use serde::Serialize;
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

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
pub fn get_auth_state(
    state: tauri::State<'_, AppState>,
) -> Result<auth::AuthStateSnapshot, String> {
    auth::get_auth_state(&state.auth).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn refresh_auth_state(
    app: AppHandle,
    auth_base_url: Option<String>,
) -> Result<auth::AuthStateSnapshot, String> {
    auth::refresh_auth_state(&app, auth_base_url).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn sign_in(
    app: AppHandle,
    email: String,
    password: String,
    auth_base_url: Option<String>,
) -> Result<auth::AuthStateSnapshot, String> {
    auth::sign_in(&app, email, password, auth_base_url).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn sign_up(
    app: AppHandle,
    email: String,
    password: String,
    auth_base_url: Option<String>,
) -> Result<auth::AuthStateSnapshot, String> {
    auth::sign_up(&app, email, password, auth_base_url).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn update_account_profile(
    app: AppHandle,
    first_name: String,
    last_name: String,
    auth_base_url: Option<String>,
) -> Result<auth::AuthStateSnapshot, String> {
    auth::update_profile(&app, first_name, last_name, auth_base_url)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn sign_out(app: AppHandle) -> Result<auth::AuthStateSnapshot, String> {
    auth::sign_out(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn delete_account(app: AppHandle) -> Result<auth::AuthStateSnapshot, String> {
    auth::delete_account(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_config(state: tauri::State<'_, AppState>) -> AppConfig {
    let mut config = AppConfig::default();

    if let Ok(session) = state.session.lock() {
        config.hotkey = session.hotkey.clone();
    }

    if let Ok(runtime) = state.runtime.lock() {
        config.mode = match runtime.mode {
            RuntimeMode::Local => "local".to_string(),
            RuntimeMode::Organization => "organization".to_string(),
        };
    }

    config
}

#[tauri::command]
pub fn set_runtime_mode(
    app: AppHandle,
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
    drop(runtime);

    let snapshot = state
        .session
        .lock()
        .map_err(|_| "failed to lock session state".to_string())?
        .snapshot();
    desktop_ui::sync_session_ui(&app, &snapshot);

    Ok(())
}

#[tauri::command]
pub fn set_dictation_test_mode(
    app: AppHandle,
    enabled: bool,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "failed to lock runtime settings".to_string())?;

    runtime.dictation_test_mode = enabled;
    drop(runtime);

    let snapshot = state
        .session
        .lock()
        .map_err(|_| "failed to lock session state".to_string())?
        .snapshot();
    desktop_ui::sync_session_ui(&app, &snapshot);

    Ok(())
}

#[tauri::command]
pub fn set_overlay_position(
    app: AppHandle,
    position: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "failed to lock runtime settings".to_string())?;
    runtime.overlay_position = position;
    drop(runtime);

    desktop_ui::apply_overlay_position(&app);
    Ok(())
}

#[tauri::command]
pub fn set_paste_raw_on_failure(
    enabled: bool,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "failed to lock runtime settings".to_string())?;
    runtime.paste_raw_on_failure = enabled;
    Ok(())
}

#[tauri::command]
pub fn set_audio_preferences(
    preferred_audio_input: Option<String>,
    start_sound_enabled: bool,
    done_sound_enabled: bool,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut runtime = state
        .runtime
        .lock()
        .map_err(|_| "failed to lock runtime settings".to_string())?;
    runtime.preferred_audio_input = preferred_audio_input
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    runtime.start_sound_enabled = start_sound_enabled;
    runtime.done_sound_enabled = done_sound_enabled;
    Ok(())
}

#[tauri::command]
pub fn set_hotkey(
    app: AppHandle,
    hotkey: String,
    state: tauri::State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    let next_hotkey = hotkey.trim().to_string();
    if next_hotkey.is_empty() {
        return Err("Hotkey cannot be empty.".to_string());
    }

    let current_hotkey = state
        .session
        .lock()
        .map_err(|_| "failed to lock session state".to_string())?
        .hotkey
        .clone();

    if current_hotkey == next_hotkey {
        return state
            .session
            .lock()
            .map(|session| session.snapshot())
            .map_err(|_| "failed to lock session state".to_string());
    }

    reregister_hotkey(&app, Some(current_hotkey.as_str()), next_hotkey.as_str())?;

    if let Ok(mut runtime) = state.runtime.lock() {
        runtime.hotkey = next_hotkey.clone();
    }

    let snapshot = {
        let mut session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;
        session.hotkey = next_hotkey;
        session.snapshot()
    };

    emit_session_state(&app, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
pub fn get_show_in_dock_enabled(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    state
        .runtime
        .lock()
        .map(|runtime| runtime.show_in_dock)
        .map_err(|_| "failed to lock runtime settings".to_string())
}

#[tauri::command]
pub fn set_show_in_dock(app: AppHandle, visible: bool) -> Result<(), String> {
    if let Ok(mut runtime) = app.state::<AppState>().runtime.lock() {
        runtime.show_in_dock = visible;
    }

    ui_prefs::save(&UiPreferences {
        show_in_dock: visible,
        show_in_dock_initialized: true,
    })
    .map_err(|error| format!("failed to save dock visibility preference: {error}"))?;

    desktop_ui::apply_dock_visibility(&app, visible);
    if visible {
        desktop_ui::schedule_dock_visibility_refresh(app.clone());
    }
    Ok(())
}

#[tauri::command]
pub fn get_launch_at_login_enabled(app: AppHandle) -> Result<bool, String> {
    app.autolaunch()
        .is_enabled()
        .map_err(|error| format!("failed to read launch-at-login status: {error}"))
}

#[tauri::command]
pub fn set_launch_at_login(app: AppHandle, enabled: bool) -> Result<bool, String> {
    let autolaunch = app.autolaunch();

    if enabled {
        autolaunch
            .enable()
            .map_err(|error| format!("failed to enable launch at login: {error}"))?;
    } else {
        autolaunch
            .disable()
            .map_err(|error| format!("failed to disable launch at login: {error}"))?;
    }

    autolaunch
        .is_enabled()
        .map_err(|error| format!("failed to confirm launch-at-login status: {error}"))
}

#[tauri::command]
pub fn hide_main_window(app: AppHandle) -> Result<(), String> {
    desktop_ui::handle_main_window_close(&app);
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
    match start_recording_internal(&app, &state) {
        Ok(snapshot) => Ok(snapshot),
        Err(error) => {
            let _ = update_error_state(&app, &state, error.clone());
            Err(error)
        }
    }
}

#[tauri::command]
pub async fn stop_recording(
    app: AppHandle,
    should_paste_override: Option<bool>,
    state: tauri::State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    let should_paste = should_paste_override.unwrap_or_else(|| {
        state
            .runtime
            .lock()
            .map(|runtime| !runtime.dictation_test_mode)
            .unwrap_or(true)
    });

    match stop_recording_internal(&app, &state, should_paste).await {
        Ok(snapshot) => Ok(snapshot),
        Err(error) => {
            let _ = update_error_state(&app, &state, error.clone());
            Err(error)
        }
    }
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
pub fn get_permission_status_report() -> permissions::PermissionStatusReport {
    permissions::get_permission_status_report()
}

#[tauri::command]
pub fn get_dictation_log_summary() -> Result<dictation_log::DictationLogSummary, String> {
    dictation_log::summary().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn get_recent_dictation_entries(
    limit: Option<usize>,
) -> Result<Vec<dictation_log::DictationLogEntry>, String> {
    dictation_log::read_entries(limit).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn clear_dictation_logs() -> Result<(), String> {
    dictation_log::clear().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn open_permission_settings(permission: String) -> Result<(), String> {
    permissions::open_permission_settings(permission.as_str()).map_err(|error| error.to_string())
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

pub fn handle_hotkey_pressed(app: &AppHandle) {
    let state = app.state::<AppState>();
    let current_state = state
        .session
        .lock()
        .map(|session| session.snapshot().state)
        .unwrap_or_else(|_| "error".to_string());

    if current_state == "recording" {
        return;
    }

    if let Err(error) = start_recording_internal(app, &state) {
        let _ = update_error_state(app, &state, error);
    }
}

pub fn handle_hotkey_released(app: &AppHandle) {
    let state = app.state::<AppState>();
    let current_state = state
        .session
        .lock()
        .map(|session| session.snapshot().state)
        .unwrap_or_else(|_| "error".to_string());

    if current_state != "recording" {
        return;
    }

    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        let state = app_handle.state::<AppState>();
        let main_window_hidden = app_handle
            .get_webview_window("main")
            .and_then(|window| window.is_visible().ok())
            .map(|visible| !visible)
            .unwrap_or(true);
        let should_paste = if main_window_hidden {
            true
        } else {
            state
                .runtime
                .lock()
                .map(|runtime| !runtime.dictation_test_mode)
                .unwrap_or(true)
        };

        if let Err(error) = stop_recording_internal(&app_handle, &state, should_paste).await {
            let _ = update_error_state(&app_handle, &state, error);
        }
    });
}

pub fn initialize_hotkey(app: &AppHandle) -> Result<(), String> {
    let current_hotkey = app
        .state::<AppState>()
        .session
        .lock()
        .map_err(|_| "failed to lock session state".to_string())?
        .hotkey
        .clone();

    reregister_hotkey(app, None, current_hotkey.as_str())
}

fn reregister_hotkey(
    app: &AppHandle,
    previous_hotkey: Option<&str>,
    next_hotkey: &str,
) -> Result<(), String> {
    let shortcut_manager = app.global_shortcut();

    if let Some(previous_hotkey) = previous_hotkey.filter(|value| !value.trim().is_empty()) {
        let _ = shortcut_manager.unregister(previous_hotkey);
    }

    let register_result =
        shortcut_manager.on_shortcut(next_hotkey, |app, _shortcut, event| match event.state {
            ShortcutState::Pressed => handle_hotkey_pressed(app),
            ShortcutState::Released => handle_hotkey_released(app),
        });

    if let Err(error) = register_result {
        if let Some(previous_hotkey) = previous_hotkey.filter(|value| !value.trim().is_empty()) {
            let _ =
                shortcut_manager.on_shortcut(previous_hotkey, |app, _shortcut, event| match event
                    .state
                {
                    ShortcutState::Pressed => handle_hotkey_pressed(app),
                    ShortcutState::Released => handle_hotkey_released(app),
                });
        }

        return Err(format!("Could not register hotkey. {error}"));
    }

    Ok(())
}

fn start_recording_internal(
    app: &AppHandle,
    state: &tauri::State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    if let Ok(mut pill) = state.pill.lock() {
        pill.is_speaking = false;
        pill.recording_started_at_ms = Some(now_timestamp_ms());
        pill.terminal_state = None;
    }

    let snapshot = {
        let mut session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;
        let details = state
            .recorder
            .start(app.clone())
            .map_err(|error| error.to_string())?;

        session.status = SessionStatus::Recording;
        session.input_device = Some(details.device_name.clone());
        session.active_recording = Some(details);
        session.transcription = None;
        session.cleanup = None;
        session.paste = None;
        session.last_error = None;
        session.snapshot()
    };

    let play_start_sound = state
        .runtime
        .lock()
        .map(|runtime| runtime.start_sound_enabled)
        .unwrap_or(false);
    if play_start_sound {
        sound::play_start_sound();
    }

    let _ = app.emit(
        recorder::RECORDING_ACTIVITY_EVENT,
        recorder::RecordingActivityPayload { is_speaking: false },
    );
    emit_session_state(app, &snapshot);
    desktop_ui::start_recording_pill_timer(app.clone());
    Ok(snapshot)
}

async fn stop_recording_internal(
    app: &AppHandle,
    state: &tauri::State<'_, AppState>,
    should_paste: bool,
) -> Result<SessionSnapshot, String> {
    if let Ok(mut pill) = state.pill.lock() {
        pill.is_speaking = false;
        pill.recording_started_at_ms = None;
        pill.terminal_state = None;
    }

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

    let _ = app.emit(
        recorder::RECORDING_ACTIVITY_EVENT,
        recorder::RecordingActivityPayload { is_speaking: false },
    );
    emit_session_state(app, &snapshot);

    let recorded_path = snapshot
        .last_recording_path
        .clone()
        .ok_or_else(|| "recording path missing after stop".to_string())?;
    let config = AppConfig::default();
    let allow_raw_fallback = state
        .runtime
        .lock()
        .map(|runtime| runtime.paste_raw_on_failure)
        .unwrap_or(true);
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

    let transcription =
        run_blocking_with_timeout("Native transcription", Duration::from_secs(20), move || {
            stt::transcribe_wav(&recorded_path, &stt_model_dir).map_err(|error| error.to_string())
        })?;

    if transcription.transcript.trim().is_empty() {
        return update_no_speech_state(app, state);
    }

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

    let raw_transcript = cleaning_snapshot.raw_transcript.clone().unwrap_or_default();

    let cleanup_result = match runtime_mode {
        RuntimeMode::Local => {
            let local_status = local_setup::detect_local_setup();
            let app_handle = app.clone();
            let cleanup_model_dir = local_status.cleanup_model_dir.clone();
            let cleanup_raw_transcript = raw_transcript.clone();

            match run_blocking_with_timeout("Local cleanup", Duration::from_secs(45), move || {
                let state = app_handle.state::<AppState>();
                let mut local_server = state
                    .local_cleanup_server
                    .lock()
                    .map_err(|_| "failed to lock local cleanup server state".to_string())?;

                cleanup::clean_text_local(
                    &app_handle,
                    &mut local_server,
                    &cleanup_model_dir,
                    &cleanup_raw_transcript,
                )
                .map_err(|error| error.to_string())
            }) {
                Ok(result) => result,
                Err(error) if allow_raw_fallback => {
                    cleanup::fallback_from_raw(&raw_transcript, &error.to_string())
                }
                Err(error) => return Err(format!("Local cleanup failed. {error}")),
            }
        }
        RuntimeMode::Organization => {
            let cleanup_url = organization_base_url
                .map(|base_url| format!("{base_url}/clean"))
                .unwrap_or_else(|| config.cleanup_url.clone());

            match cleanup::clean_text(&cleanup_url, &raw_transcript).await {
                Ok(result) => result,
                Err(error) if allow_raw_fallback => {
                    cleanup::fallback_from_raw(&raw_transcript, &error.to_string())
                }
                Err(error) => return Err(format!("Cleanup server failed. {error}")),
            }
        }
    };

    let post_cleanup_snapshot = {
        let mut session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;

        session.cleanup = Some(cleanup_result.clone());
        session.paste = None;
        session.status = if should_paste {
            SessionStatus::Pasting
        } else {
            SessionStatus::Idle
        };
        session.last_error = None;
        session.snapshot()
    };

    if should_paste {
        emit_session_state(app, &post_cleanup_snapshot);
        paste_latest_output_internal(app, state)
    } else {
        if let Ok(mut pill) = state.pill.lock() {
            pill.is_speaking = false;
            pill.recording_started_at_ms = None;
            pill.terminal_state = Some(PillTerminalState::Done);
        }

        let play_done_sound = state
            .runtime
            .lock()
            .map(|runtime| runtime.done_sound_enabled)
            .unwrap_or(false);
        if play_done_sound && !post_cleanup_snapshot.used_cleanup_fallback {
            sound::play_done_sound();
        }

        log_dictation_result(&runtime_mode, &cleaning_snapshot, &post_cleanup_snapshot);
        emit_session_state(app, &post_cleanup_snapshot);
        Ok(post_cleanup_snapshot)
    }
}

fn log_dictation_result(
    runtime_mode: &RuntimeMode,
    cleaning_snapshot: &SessionSnapshot,
    final_snapshot: &SessionSnapshot,
) {
    let Some(final_output) = final_snapshot.final_output.clone() else {
        return;
    };

    let total_latency_ms = match (
        final_snapshot.stt_latency_ms,
        final_snapshot.cleanup_latency_ms,
    ) {
        (Some(stt_latency_ms), Some(cleanup_latency_ms)) => {
            Some(stt_latency_ms + cleanup_latency_ms)
        }
        (Some(stt_latency_ms), None) => Some(stt_latency_ms),
        _ => None,
    };

    let entry = dictation_log::DictationLogEntry {
        timestamp_ms: dictation_log::now_timestamp_ms(),
        mode: match runtime_mode {
            RuntimeMode::Local => "local".to_string(),
            RuntimeMode::Organization => "organization".to_string(),
        },
        raw_transcript: cleaning_snapshot.raw_transcript.clone(),
        cleaned_output: final_snapshot.cleaned_text.clone(),
        final_output: final_output.clone(),
        word_count: dictation_log::count_words(&final_output),
        stt_latency_ms: final_snapshot.stt_latency_ms,
        cleanup_latency_ms: final_snapshot.cleanup_latency_ms,
        total_latency_ms,
        status: if final_snapshot.used_cleanup_fallback {
            "fallback".to_string()
        } else {
            "success".to_string()
        },
        cleanup_source: final_snapshot.cleanup_source.clone(),
        cleanup_model_version: final_snapshot.cleanup_model_version.clone(),
        error_message: None,
    };

    if let Err(error) = dictation_log::append_entry(&entry) {
        eprintln!("failed to append dictation log entry: {error}");
    }
}

fn update_no_speech_state(
    app: &AppHandle,
    state: &tauri::State<'_, AppState>,
) -> Result<SessionSnapshot, String> {
    if let Ok(mut pill) = state.pill.lock() {
        pill.is_speaking = false;
        pill.recording_started_at_ms = None;
        pill.terminal_state = None;
    }

    let snapshot = {
        let mut session = state
            .session
            .lock()
            .map_err(|_| "failed to lock session state".to_string())?;

        session.status = SessionStatus::Idle;
        session.active_recording = None;
        session.transcription = None;
        session.cleanup = None;
        session.paste = None;
        session.last_error = Some("No speech detected. Try again when you're ready.".to_string());
        session.snapshot()
    };

    emit_session_state(app, &snapshot);
    Ok(snapshot)
}

fn update_error_state(
    app: &AppHandle,
    state: &tauri::State<'_, AppState>,
    error: String,
) -> Result<SessionSnapshot, String> {
    if let Ok(mut pill) = state.pill.lock() {
        pill.is_speaking = false;
        pill.recording_started_at_ms = None;
        pill.terminal_state = Some(PillTerminalState::Error);
    }

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

    if let Ok(mut pill) = state.pill.lock() {
        pill.is_speaking = false;
        pill.recording_started_at_ms = None;
        pill.terminal_state = Some(PillTerminalState::Done);
    }

    let play_done_sound = state
        .runtime
        .lock()
        .map(|runtime| runtime.done_sound_enabled)
        .unwrap_or(false);
    if play_done_sound && !final_snapshot.used_cleanup_fallback {
        sound::play_done_sound();
    }

    let runtime_mode = state
        .runtime
        .lock()
        .map(|runtime| runtime.mode.clone())
        .unwrap_or(RuntimeMode::Organization);
    let cleaning_snapshot = state
        .session
        .lock()
        .map(|session| session.snapshot())
        .map_err(|_| "failed to lock session state".to_string())?;

    log_dictation_result(&runtime_mode, &cleaning_snapshot, &final_snapshot);
    emit_session_state(app, &final_snapshot);
    Ok(final_snapshot)
}

fn now_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn emit_session_state(app: &AppHandle, snapshot: &SessionSnapshot) {
    let _ = app.emit(SESSION_EVENT, snapshot);
    desktop_ui::sync_session_ui(app, snapshot);
}

fn run_blocking_with_timeout<T: Send + 'static>(
    label: &str,
    timeout: Duration,
    work: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    let (tx, rx) = mpsc::sync_channel(1);
    let label = label.to_string();

    thread::spawn(move || {
        let _ = tx.send(work());
    });

    match rx.recv_timeout(timeout) {
        Ok(result) => result,
        Err(mpsc::RecvTimeoutError::Timeout) => Err(format!(
            "{label} timed out after {} seconds.",
            timeout.as_secs()
        )),
        Err(mpsc::RecvTimeoutError::Disconnected) => {
            Err(format!("{label} stopped before returning a result."))
        }
    }
}
