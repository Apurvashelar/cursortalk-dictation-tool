use std::{
    env,
    fs,
    path::{Path, PathBuf},
};

use serde::Serialize;

use crate::config::AppConfig;

#[derive(Clone, Serialize)]
pub struct LocalSetupStatus {
    pub status: String,
    pub message: String,
    pub storage_path: String,
    pub stt_model_dir: String,
    pub cleanup_model_dir: String,
    pub missing_items: Vec<String>,
    pub detected_legacy_cleanup: bool,
}

const STT_REQUIRED_FILES: [&str; 4] = [
    "encoder.int8.onnx",
    "decoder.int8.onnx",
    "joiner.int8.onnx",
    "tokens.txt",
];

pub fn detect_local_setup() -> LocalSetupStatus {
    let config = AppConfig::default();
    let storage_path = default_storage_path();
    let cleanup_model_dir = storage_path.join("models").join("cleanup");
    let stt_model_dir = PathBuf::from(&config.stt_model_dir);

    let mut missing_items = Vec::new();

    let stt_ready = STT_REQUIRED_FILES
        .iter()
        .all(|file_name| stt_model_dir.join(file_name).exists());

    if !stt_ready {
        missing_items.push("speech model files".to_string());
    }

    let cleanup_ready = contains_gguf_file(&cleanup_model_dir);
    let legacy_cleanup_ready = legacy_cleanup_detected();

    if !cleanup_ready && !legacy_cleanup_ready {
        missing_items.push("cleanup model files".to_string());
    }

    let (status, message) = if stt_ready && (cleanup_ready || legacy_cleanup_ready) {
        (
            "complete".to_string(),
            "Setup is already completed on this machine. Skipping download.".to_string(),
        )
    } else if stt_ready || cleanup_ready || legacy_cleanup_ready {
        (
            "partial".to_string(),
            "Existing local files were found. Finishing setup with the missing pieces."
                .to_string(),
        )
    } else {
        (
            "missing".to_string(),
            "Local models were not found yet. Download is required for setup.".to_string(),
        )
    };

    LocalSetupStatus {
        status,
        message,
        storage_path: storage_path.display().to_string(),
        stt_model_dir: stt_model_dir.display().to_string(),
        cleanup_model_dir: cleanup_model_dir.display().to_string(),
        missing_items,
        detected_legacy_cleanup: legacy_cleanup_ready,
    }
}

fn default_storage_path() -> PathBuf {
    let home_dir = env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));

    home_dir
        .join("Library")
        .join("Application Support")
        .join("VoiceFlow Desktop")
}

fn contains_gguf_file(dir: &Path) -> bool {
    fs::read_dir(dir)
        .ok()
        .into_iter()
        .flatten()
        .flatten()
        .any(|entry| {
            entry
                .path()
                .extension()
                .and_then(|extension| extension.to_str())
                .map(|extension| extension.eq_ignore_ascii_case("gguf"))
                .unwrap_or(false)
        })
}

fn legacy_cleanup_detected() -> bool {
    let home_dir = env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));

    let legacy_models_dir = home_dir.join("llama.cpp").join("models");
    contains_gguf_file(&legacy_models_dir)
}
