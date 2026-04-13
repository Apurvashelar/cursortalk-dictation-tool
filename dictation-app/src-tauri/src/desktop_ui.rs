use std::{
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use serde::Serialize;
use tauri::window::Color;
#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, Position, Size, WebviewUrl,
    WebviewWindowBuilder,
};

use crate::app_state::{AppState, PillTerminalState, RuntimeMode, SessionSnapshot};
use crate::tray;

pub const OVERLAY_WINDOW_LABEL: &str = "overlay";
pub const TRAY_NAVIGATE_EVENT: &str = "tray-navigate";
pub const PILL_UPDATE_EVENT: &str = "pill:update-state";
pub const PILL_HIDE_EVENT: &str = "pill:hide";

const MAIN_WINDOW_LABEL: &str = "main";
const TRAY_OPEN_ID: &str = "tray-open";
const TRAY_SETTINGS_ID: &str = "tray-settings";
const TRAY_UPDATES_ID: &str = "tray-updates";
const TRAY_QUIT_ID: &str = "tray-quit";
const TRAY_HEADER_ID: &str = "tray-header";
const TRAY_LAST_DICTATION_ID: &str = "tray-last-dictation";
const OVERLAY_RECORDING_WIDTH: f64 = 220.0;
const OVERLAY_RECORDING_HEIGHT: f64 = 36.0;
const OVERLAY_PROCESSING_WIDTH: f64 = 220.0;
const OVERLAY_PROCESSING_HEIGHT: f64 = 36.0;
const OVERLAY_DONE_WIDTH: f64 = 220.0;
const OVERLAY_DONE_HEIGHT: f64 = 36.0;
const OVERLAY_ERROR_WIDTH: f64 = 220.0;
const OVERLAY_ERROR_HEIGHT: f64 = 36.0;
const OVERLAY_MARGIN_BOTTOM: f64 = 24.0;
const OVERLAY_MARGIN_TOP: f64 = 24.0;
const OVERLAY_MARGIN_LEFT: f64 = 24.0;
const OVERLAY_MARGIN_RIGHT: f64 = 24.0;

#[derive(Clone, Serialize)]
#[serde(tag = "state", rename_all = "lowercase")]
pub enum PillState {
    Recording {
        speaking: bool,
        elapsed_seconds: u64,
    },
    Processing,
    Done,
    Error,
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    ensure_overlay_window(app)?;
    let show_in_dock = app
        .state::<AppState>()
        .runtime
        .lock()
        .map(|runtime| runtime.show_in_dock)
        .unwrap_or(false);
    apply_dock_visibility(app, show_in_dock);
    build_tray(app)?;
    sync_tray(app, None);
    schedule_dock_visibility_refresh(app.clone());
    schedule_initial_tray_refresh(app.clone());
    Ok(())
}

pub fn show_main_window(app: &AppHandle, page: Option<&str>) {
    #[cfg(target_os = "macos")]
    {
        let _ = app.show();
    }

    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }

    let show_in_dock = app
        .state::<AppState>()
        .runtime
        .lock()
        .map(|runtime| runtime.show_in_dock)
        .unwrap_or(false);
    apply_dock_visibility(app, show_in_dock);

    if let Some(target_page) = page {
        let _ = app.emit(TRAY_NAVIGATE_EVENT, target_page.to_string());
    }
}

pub fn handle_main_window_close(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.hide();
    }
}

pub fn apply_overlay_position(app: &AppHandle) {
    let Some(window) = app.get_webview_window(OVERLAY_WINDOW_LABEL) else {
        return;
    };

    let window_size = window
        .inner_size()
        .ok()
        .map(|value| {
            let scale_factor = window.scale_factor().unwrap_or(1.0);
            (
                f64::from(value.width) / scale_factor,
                f64::from(value.height) / scale_factor,
            )
        })
        .unwrap_or((OVERLAY_RECORDING_WIDTH, OVERLAY_RECORDING_HEIGHT));

    let (x, y) = overlay_origin(app, window_size.0, window_size.1);
    let _ = window.set_position(Position::Logical(LogicalPosition::new(x, y)));
}

pub fn apply_dock_visibility(app: &AppHandle, visible: bool) {
    #[cfg(target_os = "macos")]
    {
        let _ = app.set_activation_policy(if visible {
            ActivationPolicy::Regular
        } else {
            ActivationPolicy::Accessory
        });
        let _ = app.set_dock_visibility(visible);
        if visible {
            let _ = app.show();
        }
    }

    #[cfg(not(target_os = "macos"))]
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = window.set_skip_taskbar(!visible);
    }
}

pub fn schedule_dock_visibility_refresh(app: AppHandle) {
    #[cfg(target_os = "macos")]
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(300));

        let visible = app
            .state::<AppState>()
            .runtime
            .lock()
            .map(|runtime| runtime.show_in_dock)
            .unwrap_or(false);

        let scheduler = app.clone();
        let _ = scheduler.run_on_main_thread(move || {
            apply_dock_visibility(&app, visible);

            if visible {
                if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
        });
    });
}

pub fn shutdown(app: &AppHandle) {
    let state = app.state::<AppState>();
    let lock_result = state.local_cleanup_server.lock();
    if let Ok(mut local_cleanup_server) = lock_result {
        if let Some(child) = local_cleanup_server.child.as_mut() {
            let _ = child.kill();
            let _ = child.wait();
        }
        local_cleanup_server.child = None;
    }
}

pub fn sync_session_ui(app: &AppHandle, snapshot: &SessionSnapshot) {
    sync_tray(app, Some(snapshot));
    sync_overlay_window(app, snapshot);
}

pub fn emit_recording_pill_update(app: &AppHandle) {
    let snapshot = match app.state::<AppState>().session.lock() {
        Ok(session) => session.snapshot(),
        Err(_) => return,
    };

    if snapshot.state != "recording" {
        return;
    }

    let _ = app.emit(PILL_UPDATE_EVENT, recording_pill_state(app));
}

pub fn start_recording_pill_timer(app: AppHandle) {
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(1));

        let snapshot = match app.state::<AppState>().session.lock() {
            Ok(session) => session.snapshot(),
            Err(_) => break,
        };

        if snapshot.state != "recording" {
            break;
        }

        let _ = app.emit(PILL_UPDATE_EVENT, recording_pill_state(&app));
    });
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let menu = build_tray_menu(app, "Enterprise mode", None)?;

    let tray_builder = TrayIconBuilder::with_id(tray::TRAY_ICON_ID)
        .menu(&menu)
        .tooltip("Dictation")
        .show_menu_on_left_click(true)
        .on_tray_icon_event(|tray, event: TrayIconEvent| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(&tray.app_handle(), Some("home"));
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            TRAY_OPEN_ID => show_main_window(app, Some("home")),
            TRAY_SETTINGS_ID => show_main_window(app, Some("settings")),
            TRAY_UPDATES_ID => show_main_window(app, Some("diagnostics")),
            TRAY_QUIT_ID => {
                shutdown(app);
                app.exit(0);
            }
            _ => {}
        });

    let tray_builder = match tray::initial_icon() {
        Ok(icon) => tray_builder.icon(icon),
        Err(_) => tray_builder,
    };

    tray_builder.build(app)?;
    Ok(())
}

fn ensure_overlay_window(app: &AppHandle) -> tauri::Result<()> {
    if app.get_webview_window(OVERLAY_WINDOW_LABEL).is_some() {
        return Ok(());
    }

    let (x, y) = overlay_origin(app, OVERLAY_RECORDING_WIDTH, OVERLAY_RECORDING_HEIGHT);
    let builder = WebviewWindowBuilder::new(app, OVERLAY_WINDOW_LABEL, WebviewUrl::default())
        .title("Dictation Overlay")
        .visible(false)
        .transparent(true)
        .background_color(Color(0, 0, 0, 0))
        .inner_size(OVERLAY_RECORDING_WIDTH, OVERLAY_RECORDING_HEIGHT)
        .resizable(false)
        .maximizable(false)
        .minimizable(false)
        .closable(false)
        .focusable(false)
        .focused(false)
        .decorations(false)
        .always_on_top(true)
        .visible_on_all_workspaces(true)
        .skip_taskbar(true)
        .shadow(false)
        .position(x, y);

    let window = builder.build()?;
    let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
    let _ = window.hide();
    Ok(())
}

fn overlay_origin(app: &AppHandle, overlay_width: f64, overlay_height: f64) -> (f64, f64) {
    let Some(monitor) = app.primary_monitor().ok().flatten() else {
        return (40.0, 40.0);
    };

    let overlay_position = app
        .state::<AppState>()
        .runtime
        .lock()
        .map(|runtime| runtime.overlay_position.clone())
        .unwrap_or_else(|_| "bottom-right".to_string());

    let work_area = monitor.work_area();
    let scale_factor = monitor.scale_factor();
    let monitor_width = f64::from(work_area.size.width) / scale_factor;
    let monitor_height = f64::from(work_area.size.height) / scale_factor;
    let origin_x = f64::from(work_area.position.x) / scale_factor;
    let origin_y = f64::from(work_area.position.y) / scale_factor;

    let x = match overlay_position.as_str() {
        "top-left" | "bottom-left" => origin_x + OVERLAY_MARGIN_LEFT,
        "top-right" | "bottom-right" => {
            origin_x + monitor_width - overlay_width - OVERLAY_MARGIN_RIGHT
        }
        "default" => origin_x + ((monitor_width - overlay_width) / 2.0),
        _ => origin_x + ((monitor_width - overlay_width) / 2.0),
    };

    let y = match overlay_position.as_str() {
        "top-left" | "top-right" => origin_y + OVERLAY_MARGIN_TOP,
        "bottom-left" | "bottom-right" => {
            origin_y + monitor_height - overlay_height - OVERLAY_MARGIN_BOTTOM
        }
        "default" => origin_y + monitor_height - overlay_height - OVERLAY_MARGIN_BOTTOM,
        _ => origin_y + monitor_height - overlay_height - OVERLAY_MARGIN_BOTTOM,
    };

    (x.max(0.0), y.max(0.0))
}

fn sync_tray(app: &AppHandle, snapshot: Option<&SessionSnapshot>) {
    let Some(tray) = app.tray_by_id(tray::TRAY_ICON_ID) else {
        return;
    };

    let state = app.state::<AppState>();
    let mode_label = state
        .runtime
        .lock()
        .map(|runtime| match runtime.mode {
            RuntimeMode::Local => "Local mode",
            RuntimeMode::Organization => "Enterprise mode",
        })
        .unwrap_or("Dictation");
    let terminal_state = state.pill.lock().ok().and_then(|pill| pill.terminal_state);

    let tooltip = snapshot
        .map(|value| tray_tooltip(mode_label, value))
        .unwrap_or_else(|| format!("{mode_label} · Ready to dictate"));

    tray::update_tray_icon(app, resolved_tray_state(snapshot, terminal_state));
    let _ = tray.set_tooltip(Some(tooltip.as_str()));
    #[cfg(target_os = "macos")]
    let _ = tray.set_title(None::<&str>);
    if let Ok(menu) = build_tray_menu(app, mode_label, snapshot) {
        let _ = tray.set_menu(Some(menu));
    }
}

fn build_tray_menu(
    app: &AppHandle,
    mode_label: &str,
    snapshot: Option<&SessionSnapshot>,
) -> tauri::Result<Menu<tauri::Wry>> {
    let header_text = format!("Dictation · v{} · {mode_label}", env!("CARGO_PKG_VERSION"));
    let header_item = MenuItem::with_id(app, TRAY_HEADER_ID, header_text, false, None::<&str>)?;
    let open_item = MenuItem::with_id(app, TRAY_OPEN_ID, "Open Dictation", true, None::<&str>)?;
    let settings_item =
        MenuItem::with_id(app, TRAY_SETTINGS_ID, "Settings...", true, None::<&str>)?;
    let updates_item = MenuItem::with_id(app, TRAY_UPDATES_ID, "Diagnostics", true, None::<&str>)?;
    let last_dictation_item = MenuItem::with_id(
        app,
        TRAY_LAST_DICTATION_ID,
        tray_summary(snapshot),
        false,
        None::<&str>,
    )?;
    let separator_one = PredefinedMenuItem::separator(app)?;
    let separator_two = PredefinedMenuItem::separator(app)?;
    let separator_three = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, TRAY_QUIT_ID, "Quit Dictation", true, None::<&str>)?;

    Menu::with_items(
        app,
        &[
            &header_item,
            &open_item,
            &separator_one,
            &settings_item,
            &updates_item,
            &separator_two,
            &last_dictation_item,
            &separator_three,
            &quit_item,
        ],
    )
}

fn sync_overlay_window(app: &AppHandle, snapshot: &SessionSnapshot) {
    let Some(window) = app.get_webview_window(OVERLAY_WINDOW_LABEL) else {
        return;
    };

    let (width, height) = overlay_size_for_snapshot(snapshot);
    let _ = window.set_size(Size::Logical(LogicalSize::new(width, height)));
    apply_overlay_position(app);

    let resolved_pill_state = pill_state_for_snapshot(app, snapshot);

    if let Some(ref pill_state) = resolved_pill_state {
        let _ = window.show();
        let _ = app.emit(PILL_UPDATE_EVENT, pill_state);
    } else {
        let _ = app.emit(PILL_HIDE_EVENT, ());
        let _ = window.hide();
    }

    match resolved_pill_state.as_ref() {
        Some(PillState::Error) => {
            schedule_overlay_hide(app.clone(), snapshot.clone(), Duration::from_secs(3));
        }
        Some(PillState::Done) => {
            schedule_overlay_hide(app.clone(), snapshot.clone(), Duration::from_millis(1500));
        }
        _ => {}
    }
}

fn overlay_size_for_snapshot(snapshot: &SessionSnapshot) -> (f64, f64) {
    match snapshot.state.as_str() {
        "recording" => (OVERLAY_RECORDING_WIDTH, OVERLAY_RECORDING_HEIGHT),
        "transcribing" | "cleaning" | "pasting" => {
            (OVERLAY_PROCESSING_WIDTH, OVERLAY_PROCESSING_HEIGHT)
        }
        "error" => (OVERLAY_ERROR_WIDTH, OVERLAY_ERROR_HEIGHT),
        _ => {
            if should_show_done(snapshot) {
                (OVERLAY_DONE_WIDTH, OVERLAY_DONE_HEIGHT)
            } else {
                (OVERLAY_RECORDING_WIDTH, OVERLAY_RECORDING_HEIGHT)
            }
        }
    }
}

fn tray_summary(snapshot: Option<&SessionSnapshot>) -> String {
    let Some(snapshot) = snapshot else {
        return "Last: waiting for first dictation".to_string();
    };

    match snapshot.state.as_str() {
        "recording" => "Last: recording in progress".to_string(),
        "transcribing" | "cleaning" | "pasting" => "Last: processing dictation".to_string(),
        "error" => format!(
            "Last: {}",
            shorten_message(
                classify_error_message(snapshot.message.as_str()).as_str(),
                44
            )
        ),
        _ => {
            if snapshot.used_cleanup_fallback {
                return "Last: raw fallback used".to_string();
            }

            if let Some(final_output) = snapshot.final_output.as_ref() {
                let word_count = final_output
                    .split_whitespace()
                    .filter(|value| !value.is_empty())
                    .count();
                let latency_ms = match (snapshot.stt_latency_ms, snapshot.cleanup_latency_ms) {
                    (Some(stt_latency_ms), Some(cleanup_latency_ms)) => {
                        Some(stt_latency_ms + cleanup_latency_ms)
                    }
                    (Some(stt_latency_ms), None) => Some(stt_latency_ms),
                    _ => None,
                };

                match latency_ms {
                    Some(latency_ms) => format!("Last: {word_count} words, {latency_ms}ms"),
                    None => format!("Last: {word_count} words"),
                }
            } else if snapshot
                .message
                .to_lowercase()
                .contains("no speech detected")
            {
                "Last: no speech detected".to_string()
            } else {
                "Last: waiting for first dictation".to_string()
            }
        }
    }
}

fn shorten_message(message: &str, max_len: usize) -> String {
    if message.len() <= max_len {
        return message.to_string();
    }

    format!(
        "{}...",
        message
            .chars()
            .take(max_len.saturating_sub(3))
            .collect::<String>()
    )
}

fn tray_tooltip(mode_label: &str, snapshot: &SessionSnapshot) -> String {
    match snapshot.state.as_str() {
        "recording" => format!("{mode_label} · Recording"),
        "transcribing" | "cleaning" | "pasting" => format!("{mode_label} · Processing"),
        "error" => format!(
            "{mode_label} · {}",
            classify_error_message(snapshot.message.as_str())
        ),
        _ => {
            if snapshot.used_cleanup_fallback {
                format!("{mode_label} · Raw fallback used")
            } else if snapshot
                .message
                .to_lowercase()
                .contains("no speech detected")
            {
                format!("{mode_label} · No speech detected")
            } else {
                format!("{mode_label} · Ready to dictate")
            }
        }
    }
}

fn resolved_tray_state(
    snapshot: Option<&SessionSnapshot>,
    terminal_state: Option<PillTerminalState>,
) -> &'static str {
    if let Some(terminal_state) = terminal_state {
        return match terminal_state {
            PillTerminalState::Done => "done",
            PillTerminalState::Error => "error",
        };
    }

    match snapshot.map(|value| value.state.as_str()) {
        Some("recording") => "recording",
        Some("transcribing") | Some("cleaning") | Some("pasting") => "processing",
        Some("error") => "error",
        _ => "idle",
    }
}

fn classify_error_message(message: &str) -> String {
    let normalized = message.to_lowercase();

    if normalized.contains("paste") || normalized.contains("clipboard") {
        "Paste failed".to_string()
    } else if normalized.contains("cleanup") || normalized.contains("backend") {
        "Cleanup failed".to_string()
    } else if normalized.contains("speech") {
        "No speech detected".to_string()
    } else {
        "Attention needed".to_string()
    }
}

fn should_show_done(snapshot: &SessionSnapshot) -> bool {
    snapshot.state == "idle"
        && snapshot.final_output.is_some()
        && snapshot.last_paste_message.is_some()
}

fn pill_state_for_snapshot(app: &AppHandle, snapshot: &SessionSnapshot) -> Option<PillState> {
    let terminal_state = app
        .state::<AppState>()
        .pill
        .lock()
        .ok()
        .and_then(|pill| pill.terminal_state);

    if let Some(terminal_state) = terminal_state {
        return Some(match terminal_state {
            PillTerminalState::Done => PillState::Done,
            PillTerminalState::Error => PillState::Error,
        });
    }

    match snapshot.state.as_str() {
        "recording" => Some(recording_pill_state(app)),
        "transcribing" | "cleaning" | "pasting" => Some(PillState::Processing),
        "error" => Some(PillState::Error),
        "idle" => None,
        _ => None,
    }
}

fn recording_pill_state(app: &AppHandle) -> PillState {
    let (speaking, recording_started_at_ms) = match app.state::<AppState>().pill.lock() {
        Ok(pill) => (pill.is_speaking, pill.recording_started_at_ms),
        Err(_) => (false, None),
    };

    let elapsed_seconds = recording_started_at_ms
        .and_then(|started_at_ms| now_timestamp_ms().checked_sub(started_at_ms))
        .map(|elapsed_ms| elapsed_ms / 1000)
        .unwrap_or(0);

    PillState::Recording {
        speaking,
        elapsed_seconds,
    }
}

fn now_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn schedule_initial_tray_refresh(app: AppHandle) {
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(400));
        tray::update_tray_icon(&app, "idle");
        sync_tray(&app, None);
    });
}

fn schedule_overlay_hide(app: AppHandle, snapshot: SessionSnapshot, delay: Duration) {
    thread::spawn(move || {
        thread::sleep(delay);

        let expected_terminal_state = match pill_state_for_snapshot(&app, &snapshot) {
            Some(PillState::Done) => Some(PillTerminalState::Done),
            Some(PillState::Error) => Some(PillTerminalState::Error),
            _ => None,
        };

        let current_terminal_state = app
            .state::<AppState>()
            .pill
            .lock()
            .ok()
            .and_then(|pill| pill.terminal_state);

        if current_terminal_state != expected_terminal_state {
            return;
        }

        if let Ok(mut pill) = app.state::<AppState>().pill.lock() {
            pill.terminal_state = None;
        }

        let current_snapshot = match app.state::<AppState>().session.lock() {
            Ok(session) => session.snapshot(),
            Err(_) => return,
        };

        sync_tray(&app, Some(&current_snapshot));

        if let Some(window) = app.get_webview_window(OVERLAY_WINDOW_LABEL) {
            let _ = app.emit(PILL_HIDE_EVENT, ());
            let _ = window.hide();
        }
    });
}
