mod app_state;
mod cleanup;
mod commands;
mod config;
mod local_setup;
mod paste;
mod permissions;
mod recorder;
mod stt;

use app_state::AppState;
use config::AppConfig;
use tauri_plugin_global_shortcut::{Builder as GlobalShortcutBuilder, ShortcutState};

fn main() {
    let shortcut = AppConfig::default().hotkey;
    let shortcut_plugin = GlobalShortcutBuilder::new()
        .with_shortcut(shortcut.as_str())
        .expect("failed to configure global shortcut")
        .with_handler(|app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                commands::handle_hotkey_toggle(app);
            }
        })
        .build();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(shortcut_plugin)
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_app_status,
            commands::get_config,
            commands::set_runtime_mode,
            commands::get_backend_health,
            commands::check_backend_health_with_urls,
            commands::get_session_state,
            commands::list_audio_input_devices,
            commands::start_recording,
            commands::stop_recording,
            commands::get_stt_status,
            commands::get_local_setup_status,
            commands::run_local_setup,
            commands::paste_latest_output,
            commands::get_permission_status_report,
            commands::open_permission_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
