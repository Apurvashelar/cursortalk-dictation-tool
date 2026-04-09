use std::{
    env,
    fs,
    net::TcpListener,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

use anyhow::{anyhow, Context, Result};
use reqwest::blocking::Client as BlockingClient;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::app_state::LocalCleanupServerState;

const LOCAL_SERVER_HOST: &str = "127.0.0.1";
const DEFAULT_LOCAL_SERVER_PORT: u16 = 8081;
const CLEANUP_MODEL_FILE_NAME: &str = "dictation-cleanup-q4km.gguf";
const LLAMA_SERVER_ENV: &str = "VOICEFLOW_LLAMA_SERVER_PATH";
const DEV_LLAMA_SERVER_PATH: &str = "/Users/appe/llama.cpp/build/bin/llama-server";
const LOCAL_SYSTEM_PROMPT: &str = "You clean raw English dictation transcripts. Remove disfluencies, false starts, repetitions, and obvious ASR artifacts. Restore punctuation and capitalization. Preserve meaning exactly, especially numbers, names, identifiers, URLs, file paths, versions, and dates. Output only the cleaned plain text.\n\nRules:\n- Fix filler words (um, uh, like, you know)\n- Fix false starts and self-corrections (keep the corrected version only)\n- Do NOT add any content that wasn't spoken\n- Do NOT remove meaningful content\n- Do NOT change the meaning or intent\n- Do NOT add greetings, sign-offs, or formatting not present in the original\n- Output ONLY the cleaned text, nothing else";

#[derive(Clone, Deserialize, Serialize)]
pub struct CleanupResult {
    pub cleaned_text: String,
    pub latency_ms: u64,
    pub tokens_used: u64,
    pub model_version: String,
    pub used_fallback: bool,
    pub source: String,
    pub message: String,
}

#[derive(Deserialize)]
struct RemoteCleanupResponse {
    cleaned: String,
    latency_ms: u64,
    tokens_used: u64,
    model_version: String,
}

#[derive(Serialize)]
struct RemoteCleanupRequest<'a> {
    raw: &'a str,
}

#[derive(Deserialize)]
struct LocalModelsResponse {
    data: Vec<LocalModelEntry>,
}

#[derive(Deserialize)]
struct LocalModelEntry {
    id: String,
}

#[derive(Serialize)]
struct LocalCleanupRequest<'a> {
    model: &'a str,
    messages: [LocalChatMessage<'a>; 2],
    temperature: f32,
    max_tokens: u32,
}

#[derive(Serialize)]
struct LocalChatMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Deserialize)]
struct LocalCleanupResponse {
    model: Option<String>,
    choices: Vec<LocalChoice>,
    usage: Option<LocalUsage>,
}

#[derive(Deserialize)]
struct LocalChoice {
    message: LocalResponseMessage,
}

#[derive(Deserialize)]
struct LocalResponseMessage {
    content: String,
}

#[derive(Deserialize)]
struct LocalUsage {
    total_tokens: Option<u64>,
}

pub async fn clean_text(cleanup_url: &str, raw_text: &str) -> Result<CleanupResult> {
    let client = reqwest::Client::new();
    let response = client
        .post(cleanup_url)
        .json(&RemoteCleanupRequest { raw: raw_text })
        .send()
        .await
        .context("failed to reach cleanup backend")?;

    let response = response
        .error_for_status()
        .context("cleanup backend returned an error status")?;

    let payload: RemoteCleanupResponse = response
        .json()
        .await
        .context("failed to parse cleanup backend response")?;

    Ok(CleanupResult {
        cleaned_text: payload.cleaned,
        latency_ms: payload.latency_ms,
        tokens_used: payload.tokens_used,
        model_version: payload.model_version,
        used_fallback: false,
        source: "remote".to_string(),
        message: "Cleanup completed through the hosted backend.".to_string(),
    })
}

pub fn clean_text_local(
    app: &AppHandle,
    server_state: &mut LocalCleanupServerState,
    cleanup_model_dir: &str,
    raw_text: &str,
) -> Result<CleanupResult> {
    let model_path = resolve_local_model_path(cleanup_model_dir)?;
    let port = ensure_local_server(app, server_state, &model_path)?;

    let started_at = Instant::now();
    let models_client = BlockingClient::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .context("failed to create local cleanup client")?;

    let models_payload: LocalModelsResponse = models_client
        .get(local_server_models_url(port))
        .send()
        .context("failed to query local cleanup models")?
        .error_for_status()
        .context("local cleanup server returned an error while listing models")?
        .json()
        .context("failed to parse local cleanup model list")?;

    let model_id = models_payload
        .data
        .first()
        .map(|entry| entry.id.clone())
        .unwrap_or_else(|| CLEANUP_MODEL_FILE_NAME.to_string());

    let response: LocalCleanupResponse = models_client
        .post(local_server_chat_url(port))
        .json(&LocalCleanupRequest {
            model: &model_id,
            messages: [
                LocalChatMessage {
                    role: "system",
                    content: LOCAL_SYSTEM_PROMPT,
                },
                LocalChatMessage {
                    role: "user",
                    content: raw_text,
                },
            ],
            temperature: 0.0,
            max_tokens: 256,
        })
        .send()
        .context("failed to call local cleanup server")?
        .error_for_status()
        .context("local cleanup server returned an error status")?
        .json()
        .context("failed to parse local cleanup response")?;

    let cleaned_text = response
        .choices
        .first()
        .map(|choice| choice.message.content.trim().to_string())
        .filter(|content| !content.is_empty())
        .ok_or_else(|| anyhow!("local cleanup server returned an empty response"))?;

    Ok(CleanupResult {
        cleaned_text,
        latency_ms: started_at.elapsed().as_millis() as u64,
        tokens_used: response
            .usage
            .and_then(|usage| usage.total_tokens)
            .unwrap_or(0),
        model_version: response.model.unwrap_or(model_id),
        used_fallback: false,
        source: "local".to_string(),
        message: "Cleanup completed through the local runtime.".to_string(),
    })
}

pub fn fallback_from_raw(raw_text: &str, error: &str) -> CleanupResult {
    CleanupResult {
        cleaned_text: raw_text.to_string(),
        latency_ms: 0,
        tokens_used: 0,
        model_version: "unavailable".to_string(),
        used_fallback: true,
        source: "fallback".to_string(),
        message: format!("Cleanup unavailable. Using raw transcript. ({error})"),
    }
}

fn ensure_local_server(
    app: &AppHandle,
    server_state: &mut LocalCleanupServerState,
    model_path: &Path,
) -> Result<u16> {
    if let Some(port) = server_state.port {
        if local_server_is_healthy(port) {
            server_state.model_path = Some(model_path.display().to_string());
            return Ok(port);
        }
    }

    if local_server_is_healthy(DEFAULT_LOCAL_SERVER_PORT) && server_state.child.is_none() {
        server_state.model_path = Some(model_path.display().to_string());
        server_state.port = Some(DEFAULT_LOCAL_SERVER_PORT);
        return Ok(DEFAULT_LOCAL_SERVER_PORT);
    }

    if let Some(child) = server_state.child.as_mut() {
        if child
            .try_wait()
            .context("failed to inspect local cleanup server process")?
            .is_some()
        {
            server_state.child = None;
            server_state.model_path = None;
            server_state.port = None;
        }
    }

    if server_state
        .model_path
        .as_deref()
        .map(|existing| existing != model_path.display().to_string())
        .unwrap_or(false)
    {
        if let Some(mut child) = server_state.child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
        server_state.model_path = None;
        server_state.port = None;
    }

    if server_state.child.is_none() {
        let port = choose_local_server_port()?;
        let llama_server_path = resolve_llama_server_path(app)?;
        let child = Command::new(&llama_server_path)
            .arg("--model")
            .arg(model_path)
            .arg("--host")
            .arg(LOCAL_SERVER_HOST)
            .arg("--port")
            .arg(port.to_string())
            .arg("--ctx-size")
            .arg("4096")
            .arg("--gpu-layers")
            .arg("all")
            .arg("--jinja")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .with_context(|| {
                format!(
                    "failed to start local cleanup server with {}",
                    llama_server_path.display()
                )
            })?;

        server_state.child = Some(child);
        server_state.model_path = Some(model_path.display().to_string());
        server_state.port = Some(port);
    }

    let port = server_state.port.unwrap_or(DEFAULT_LOCAL_SERVER_PORT);
    let started_at = Instant::now();
    while started_at.elapsed() < Duration::from_secs(30) {
        if local_server_is_healthy(port) {
            return Ok(port);
        }

        if let Some(child) = server_state.child.as_mut() {
            if let Some(status) = child
                .try_wait()
                .context("failed to inspect local cleanup server process")?
            {
                server_state.child = None;
                server_state.model_path = None;
                server_state.port = None;
                return Err(anyhow!(
                    "Local cleanup server exited before becoming ready (status: {status})."
                ));
            }
        }
        thread::sleep(Duration::from_millis(500));
    }

    Err(anyhow!(
        "Local cleanup server did not become ready within 30 seconds on port {}.",
        port
    ))
}

fn resolve_llama_server_path(_app: &AppHandle) -> Result<PathBuf> {
    if let Ok(path) = env::var(LLAMA_SERVER_ENV) {
        let candidate = PathBuf::from(path.trim());
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    for candidate in candidate_llama_server_paths() {
        if candidate.exists() {
            return Ok(candidate);
        }
    }

    Err(anyhow!(
        "No llama-server binary was found. Expected a bundled binary or set {} to a valid path.",
        LLAMA_SERVER_ENV
    ))
}

fn candidate_llama_server_paths() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(current_exe) = env::current_exe() {
        if let Some(macos_dir) = current_exe.parent() {
            candidates.push(macos_dir.join("llama-server"));
            candidates.push(macos_dir.join("llama-server-aarch64-apple-darwin"));

            if let Some(contents_dir) = macos_dir.parent() {
                let resources_dir = contents_dir.join("Resources");
                candidates.push(resources_dir.join("llama-server"));
                candidates.push(resources_dir.join("llama-server-aarch64-apple-darwin"));
            }
        }
    }

    candidates.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("bin").join("llama-server"));
    candidates.push(PathBuf::from(DEV_LLAMA_SERVER_PATH));

    candidates
}

fn local_server_is_healthy(port: u16) -> bool {
    let client = match BlockingClient::builder()
        .timeout(Duration::from_secs(2))
        .build()
    {
        Ok(client) => client,
        Err(_) => return false,
    };

    client
        .get(local_server_models_url(port))
        .send()
        .and_then(|response| response.error_for_status())
        .is_ok()
}

fn choose_local_server_port() -> Result<u16> {
    if TcpListener::bind((LOCAL_SERVER_HOST, DEFAULT_LOCAL_SERVER_PORT)).is_ok() {
        return Ok(DEFAULT_LOCAL_SERVER_PORT);
    }

    let listener = TcpListener::bind((LOCAL_SERVER_HOST, 0))
        .context("failed to reserve a local port for the cleanup runtime")?;
    let port = listener
        .local_addr()
        .context("failed to inspect reserved local cleanup port")?
        .port();
    drop(listener);
    Ok(port)
}

fn local_server_models_url(port: u16) -> String {
    format!("http://{LOCAL_SERVER_HOST}:{port}/v1/models")
}

fn local_server_chat_url(port: u16) -> String {
    format!("http://{LOCAL_SERVER_HOST}:{port}/v1/chat/completions")
}

fn resolve_local_model_path(cleanup_model_dir: &str) -> Result<PathBuf> {
    let cleanup_dir = PathBuf::from(cleanup_model_dir);

    let direct_path = cleanup_dir.join(CLEANUP_MODEL_FILE_NAME);
    if direct_path.exists() {
        return Ok(direct_path);
    }

    find_gguf_file(&cleanup_dir).ok_or_else(|| {
        anyhow!(
            "No local cleanup model was found in {}.",
            cleanup_dir.display()
        )
    })
}

fn find_gguf_file(dir: &Path) -> Option<PathBuf> {
    let mut gguf_files = fs::read_dir(dir)
        .ok()?
        .flatten()
        .filter_map(|entry| {
            let path = entry.path();
            let is_gguf = path
                .extension()
                .and_then(|extension| extension.to_str())
                .map(|extension| extension.eq_ignore_ascii_case("gguf"))
                .unwrap_or(false);

            if is_gguf { Some(path) } else { None }
        })
        .collect::<Vec<_>>();

    gguf_files.sort();
    gguf_files.into_iter().next()
}
