use std::process::Command;

use anyhow::{anyhow, Context, Result};
use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize)]
pub struct SttStatus {
    pub engine: String,
    pub state: String,
    pub message: String,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct TranscriptionResult {
    pub transcript: String,
    pub latency_ms: u64,
    pub sample_rate: u32,
}

pub fn current_status() -> SttStatus {
    SttStatus {
        engine: "Parakeet".to_string(),
        state: "ready".to_string(),
        message: "Audio capture is wired. Recorded WAV files are transcribed through the local Parakeet helper."
            .to_string(),
    }
}

pub fn transcribe_wav(audio_path: &str, model_dir: &str) -> Result<TranscriptionResult> {
    let script_path = format!("{}/../scripts/parakeet_transcribe.py", env!("CARGO_MANIFEST_DIR"));

    let output = Command::new("python3")
        .arg(script_path)
        .arg("--audio")
        .arg(audio_path)
        .arg("--model-dir")
        .arg(model_dir)
        .output()
        .context("failed to run Parakeet transcription helper")?;

    if !output.status.success() {
        return Err(anyhow!(
            "Parakeet helper failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    serde_json::from_slice::<TranscriptionResult>(&output.stdout)
        .context("failed to parse Parakeet helper output")
}
