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
            stt_model_dir: "/Users/appe/parakeet/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8"
                .to_string(),
        }
    }
}
