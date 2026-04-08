mod app_state;
mod commands;
mod config;

use app_state::AppState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_app_status,
            commands::get_config,
            commands::get_backend_health
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
