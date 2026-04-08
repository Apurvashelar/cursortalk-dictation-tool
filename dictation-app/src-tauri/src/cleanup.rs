use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

#[derive(Clone, Deserialize, Serialize)]
pub struct CleanupResult {
    pub cleaned_text: String,
    pub latency_ms: u64,
    pub tokens_used: u64,
    pub model_version: String,
    pub used_fallback: bool,
    pub message: String,
}

#[derive(Deserialize)]
struct CleanupResponse {
    cleaned: String,
    latency_ms: u64,
    tokens_used: u64,
    model_version: String,
}

#[derive(Serialize)]
struct CleanupRequest<'a> {
    raw: &'a str,
}

pub async fn clean_text(cleanup_url: &str, raw_text: &str) -> Result<CleanupResult> {
    let client = reqwest::Client::new();
    let response = client
        .post(cleanup_url)
        .json(&CleanupRequest { raw: raw_text })
        .send()
        .await
        .context("failed to reach cleanup backend")?;

    let response = response
        .error_for_status()
        .context("cleanup backend returned an error status")?;

    let payload: CleanupResponse = response
        .json()
        .await
        .context("failed to parse cleanup backend response")?;

    Ok(CleanupResult {
        cleaned_text: payload.cleaned,
        latency_ms: payload.latency_ms,
        tokens_used: payload.tokens_used,
        model_version: payload.model_version,
        used_fallback: false,
        message: "Cleanup completed through the hosted backend.".to_string(),
    })
}

pub fn fallback_from_raw(raw_text: &str, error: &str) -> CleanupResult {
    CleanupResult {
        cleaned_text: raw_text.to_string(),
        latency_ms: 0,
        tokens_used: 0,
        model_version: "unavailable".to_string(),
        used_fallback: true,
        message: format!("Cleanup unavailable. Using raw transcript. ({error})"),
    }
}
