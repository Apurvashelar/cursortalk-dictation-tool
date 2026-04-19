use std::{env, path::PathBuf};

use serde::Serialize;

#[derive(Serialize)]
pub struct AppConfig {
    pub mode: String,
    pub personal_mode_enabled: bool,
    pub hotkey: String,
    pub cleanup_url: String,
    pub health_url: String,
    pub tunnel_enabled: bool,
    pub tunnel_host: String,
    pub tunnel_local_port: u16,
    pub tunnel_remote_port: u16,
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
            personal_mode_enabled: false,
            hotkey: "CommandOrControl+Shift+D".to_string(),
            cleanup_url: "http://127.0.0.1:8080/clean".to_string(),
            health_url: "http://127.0.0.1:8080/health".to_string(),
            tunnel_enabled: true,
            tunnel_host: "AWS EC2".to_string(),
            tunnel_local_port: 8080,
            tunnel_remote_port: 8080,
            stt_model_dir,
        }
    }
}
