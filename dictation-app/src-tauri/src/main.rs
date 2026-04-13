mod app_state;
mod auth;
mod cleanup;
mod commands;
mod config;
mod desktop_ui;
mod dictation_log;
mod local_setup;
mod paste;
mod permissions;
mod recorder;
mod sound;
mod stt;
mod tray;
mod ui_prefs;

use app_state::AppState;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::Builder as GlobalShortcutBuilder;

fn main() {
    let shortcut_plugin = GlobalShortcutBuilder::new().build();

    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None::<Vec<&str>>,
        ))
        .plugin(tauri_plugin_dialog::init())
        .plugin(shortcut_plugin)
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let ui_prefs = ui_prefs::load();
            if let Ok(mut runtime) = app.state::<AppState>().runtime.lock() {
                runtime.show_in_dock = ui_prefs.resolved_show_in_dock();
            }
            desktop_ui::setup(&app.handle())?;
            commands::initialize_hotkey(&app.handle()).expect("failed to initialize global hotkey");
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }

            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                desktop_ui::handle_main_window_close(&window.app_handle());
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_status,
            commands::get_auth_state,
            commands::refresh_auth_state,
            commands::sign_in,
            commands::sign_up,
            commands::update_account_profile,
            commands::sign_out,
            commands::delete_account,
            commands::get_config,
            commands::set_runtime_mode,
            commands::set_dictation_test_mode,
            commands::set_overlay_position,
            commands::set_paste_raw_on_failure,
            commands::set_audio_preferences,
            commands::set_hotkey,
            commands::get_show_in_dock_enabled,
            commands::get_launch_at_login_enabled,
            commands::set_launch_at_login,
            commands::set_show_in_dock,
            commands::hide_main_window,
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
            commands::open_permission_settings,
            commands::get_dictation_log_summary,
            commands::get_recent_dictation_entries,
            commands::clear_dictation_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
