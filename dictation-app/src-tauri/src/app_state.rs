use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub status: Mutex<String>,
}

