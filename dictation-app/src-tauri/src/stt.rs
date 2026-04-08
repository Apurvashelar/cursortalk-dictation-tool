use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct SttStatus {
    pub engine: String,
    pub state: String,
    pub message: String,
}

pub fn current_status() -> SttStatus {
    SttStatus {
        engine: "Parakeet".to_string(),
        state: "planned".to_string(),
        message: "STT boundary is prepared. Audio capture is implemented; transcription wiring is next."
            .to_string(),
    }
}
