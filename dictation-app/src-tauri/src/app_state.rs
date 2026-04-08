use std::sync::Mutex;

use serde::Serialize;

use crate::{
    config::AppConfig,
    recorder::{RecorderController, RecordingDetails, RecordingSummary},
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
}

pub struct AppState {
    pub session: Mutex<SessionRuntime>,
    pub recorder: RecorderController,
}

pub struct SessionRuntime {
    pub status: SessionStatus,
    pub input_device: Option<String>,
    pub active_recording: Option<RecordingDetails>,
    pub last_recording: Option<RecordingSummary>,
    pub last_error: Option<String>,
}

pub enum SessionStatus {
    Idle,
    Recording,
    Transcribing,
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
                last_error: None,
            }),
            recorder: RecorderController::new(),
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
                "Recording from the default microphone. Press the hotkey again to stop.".to_string(),
            ),
            SessionStatus::Transcribing => (
                "transcribing".to_string(),
                "Recording captured. STT integration is the next milestone.".to_string(),
            ),
            SessionStatus::Error => (
                "error".to_string(),
                self.last_error
                    .clone()
                    .unwrap_or_else(|| "The recording pipeline hit an error.".to_string()),
            ),
        };

        let last_recording = self.last_recording.clone();

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
        }
    }
}
