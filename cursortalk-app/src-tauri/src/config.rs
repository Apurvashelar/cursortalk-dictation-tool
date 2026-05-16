use std::{env, path::PathBuf};

use serde::Serialize;

#[derive(Serialize)]
pub struct AppConfig {
    pub mode: String,
    pub hotkey: String,
    pub cleanup_url: String,
    pub health_url: String,
    pub stt_model_dir: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        let home_dir = env::var("HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("."));
        let stt_model_dir = home_dir
            .join("Library")
            .join("Application Support")
            .join("CursorTalk")
            .join("models")
            .join("stt")
            .display()
            .to_string();

        Self {
            mode: "organization".to_string(),
            hotkey: "CommandOrControl+Shift+D".to_string(),
            cleanup_url: "http://127.0.0.1:8080/clean".to_string(),
            health_url: "http://127.0.0.1:8080/health".to_string(),
            stt_model_dir,
        }
    }
}
