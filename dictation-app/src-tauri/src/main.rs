mod app_state;
mod cleanup;
mod commands;
mod config;
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
            commands::get_backend_health,
            commands::get_session_state,
            commands::list_audio_input_devices,
            commands::start_recording,
            commands::stop_recording,
            commands::get_stt_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
