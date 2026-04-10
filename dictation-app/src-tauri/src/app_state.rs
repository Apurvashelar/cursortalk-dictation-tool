use std::{process::Child, sync::Mutex};

use serde::Serialize;

use crate::{
    cleanup::CleanupResult,
    config::AppConfig,
    paste::PasteResult,
    recorder::{RecorderController, RecordingDetails, RecordingSummary},
    stt::TranscriptionResult,
};

pub const SESSION_EVENT: &str = "session-state-changed";

#[derive(Clone, Serialize)]
pub struct SessionSnapshot {
    pub state: String,
    pub message: String,
    pub hotkey: String,
    pub input_device: Option<String>,
    pub last_recording_path: Option<String>,
    pub last_recording_duration_ms: Option<u64>,
    pub last_recording_sample_rate: Option<u32>,
    pub last_recording_channels: Option<u16>,
    pub raw_transcript: Option<String>,
    pub cleaned_text: Option<String>,
    pub stt_latency_ms: Option<u64>,
    pub cleanup_latency_ms: Option<u64>,
    pub cleanup_model_version: Option<String>,
    pub cleanup_source: Option<String>,
    pub used_cleanup_fallback: bool,
    pub final_output: Option<String>,
    pub last_paste_message: Option<String>,
}

pub struct AppState {
    pub session: Mutex<SessionRuntime>,
    pub recorder: RecorderController,
    pub runtime: Mutex<RuntimeSettings>,
    pub local_cleanup_server: Mutex<LocalCleanupServerState>,
}

#[derive(Clone)]
pub enum RuntimeMode {
    Local,
    Organization,
}

#[derive(Clone)]
pub struct RuntimeSettings {
    pub mode: RuntimeMode,
    pub organization_base_url: Option<String>,
    pub dictation_test_mode: bool,
}

pub struct LocalCleanupServerState {
    pub child: Option<Child>,
    pub model_path: Option<String>,
    pub port: Option<u16>,
}

pub struct SessionRuntime {
    pub status: SessionStatus,
    pub input_device: Option<String>,
    pub active_recording: Option<RecordingDetails>,
    pub last_recording: Option<RecordingSummary>,
    pub transcription: Option<TranscriptionResult>,
    pub cleanup: Option<CleanupResult>,
    pub paste: Option<PasteResult>,
    pub last_error: Option<String>,
}

pub enum SessionStatus {
    Idle,
    Recording,
    Transcribing,
    Cleaning,
    Pasting,
    Error,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            session: Mutex::new(SessionRuntime {
                status: SessionStatus::Idle,
                input_device: None,
                active_recording: None,
                last_recording: None,
                transcription: None,
                cleanup: None,
                paste: None,
                last_error: None,
            }),
            recorder: RecorderController::new(),
            runtime: Mutex::new(RuntimeSettings {
                mode: RuntimeMode::Organization,
                organization_base_url: None,
                dictation_test_mode: false,
            }),
            local_cleanup_server: Mutex::new(LocalCleanupServerState {
                child: None,
                model_path: None,
                port: None,
            }),
        }
    }
}

impl SessionRuntime {
    pub fn snapshot(&self) -> SessionSnapshot {
        let config = AppConfig::default();

        let (state, message) = match self.status {
            SessionStatus::Idle => (
                "idle".to_string(),
                self.last_error
                    .clone()
                    .unwrap_or_else(|| "Ready. Press the hotkey once to start recording.".to_string()),
            ),
            SessionStatus::Recording => (
                "recording".to_string(),
                "Recording from the default microphone. Release the hotkey to finish.".to_string(),
            ),
            SessionStatus::Transcribing => (
                "transcribing".to_string(),
                "Transcribing recorded audio with Parakeet.".to_string(),
            ),
            SessionStatus::Cleaning => (
                "cleaning".to_string(),
                "Running cleanup for the transcript.".to_string(),
            ),
            SessionStatus::Pasting => (
                "pasting".to_string(),
                "Pasting final text into the active application.".to_string(),
            ),
            SessionStatus::Error => (
                "error".to_string(),
                self.last_error
                    .clone()
                    .unwrap_or_else(|| "The recording pipeline hit an error.".to_string()),
            ),
        };

        let last_recording = self.last_recording.clone();
        let transcription = self.transcription.clone();
        let cleanup = self.cleanup.clone();
        let paste = self.paste.clone();
        let final_output = cleanup
            .as_ref()
            .map(|result| result.cleaned_text.clone())
            .filter(|text| !text.trim().is_empty())
            .or_else(|| transcription.as_ref().map(|result| result.transcript.clone()));

        SessionSnapshot {
            state,
            message,
            hotkey: config.hotkey,
            input_device: self.input_device.clone(),
            last_recording_path: last_recording.as_ref().map(|recording| recording.path.clone()),
            last_recording_duration_ms: last_recording
                .as_ref()
                .map(|recording| recording.duration_ms),
            last_recording_sample_rate: last_recording
                .as_ref()
                .map(|recording| recording.sample_rate),
            last_recording_channels: last_recording.as_ref().map(|recording| recording.channels),
            raw_transcript: transcription.as_ref().map(|result| result.transcript.clone()),
            cleaned_text: cleanup.as_ref().map(|result| result.cleaned_text.clone()),
            stt_latency_ms: transcription.as_ref().map(|result| result.latency_ms),
            cleanup_latency_ms: cleanup.as_ref().map(|result| result.latency_ms),
            cleanup_model_version: cleanup.as_ref().map(|result| result.model_version.clone()),
            cleanup_source: cleanup.as_ref().map(|result| result.source.clone()),
            used_cleanup_fallback: cleanup
                .as_ref()
                .map(|result| result.used_fallback)
                .unwrap_or(false),
            final_output,
            last_paste_message: paste.as_ref().map(|result| result.message.clone()),
        }
    }
}
