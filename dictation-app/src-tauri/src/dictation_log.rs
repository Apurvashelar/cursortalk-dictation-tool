use std::fs::{self, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

use crate::local_setup;

const DICTATION_LOG_FILE_NAME: &str = "dictation-log.jsonl";

#[derive(Clone, Deserialize, Serialize)]
pub struct DictationLogEntry {
    pub timestamp_ms: u64,
    pub mode: String,
    pub raw_transcript: Option<String>,
    pub cleaned_output: Option<String>,
    pub final_output: String,
    pub word_count: usize,
    pub stt_latency_ms: Option<u64>,
    pub cleanup_latency_ms: Option<u64>,
    pub total_latency_ms: Option<u64>,
    pub status: String,
    pub cleanup_source: Option<String>,
    pub cleanup_model_version: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Serialize)]
pub struct DictationLogSummary {
    pub dictations: usize,
    pub words: usize,
    pub average_latency_ms: Option<u64>,
    pub recent_entries: Vec<DictationLogEntry>,
}

pub fn append_entry(entry: &DictationLogEntry) -> Result<()> {
    let log_path = dictation_log_path();
    if let Some(parent) = log_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("failed to create {}", parent.display()))?;
    }

    let serialized =
        serde_json::to_string(entry).context("failed to serialize dictation log entry")?;
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .with_context(|| format!("failed to open {}", log_path.display()))?;

    writeln!(file, "{serialized}")
        .with_context(|| format!("failed to append {}", log_path.display()))?;
    Ok(())
}

pub fn read_entries(limit: Option<usize>) -> Result<Vec<DictationLogEntry>> {
    let log_path = dictation_log_path();

    if !log_path.exists() {
        return Ok(Vec::new());
    }

    let file = OpenOptions::new()
        .read(true)
        .open(&log_path)
        .with_context(|| format!("failed to open {}", log_path.display()))?;
    let reader = BufReader::new(file);

    let mut entries = reader
        .lines()
        .map_while(Result::ok)
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| serde_json::from_str::<DictationLogEntry>(&line).ok())
        .collect::<Vec<_>>();

    entries.sort_by(|left, right| right.timestamp_ms.cmp(&left.timestamp_ms));

    if let Some(limit) = limit {
        entries.truncate(limit);
    }

    Ok(entries)
}

pub fn summary() -> Result<DictationLogSummary> {
    let entries = read_entries(None)?;
    let latencies = entries
        .iter()
        .filter_map(|entry| entry.total_latency_ms)
        .collect::<Vec<_>>();

    Ok(DictationLogSummary {
        dictations: entries.len(),
        words: entries.iter().map(|entry| entry.word_count).sum(),
        average_latency_ms: if latencies.is_empty() {
            None
        } else {
            Some(latencies.iter().sum::<u64>() / latencies.len() as u64)
        },
        recent_entries: entries.into_iter().take(5).collect(),
    })
}

pub fn clear() -> Result<()> {
    let log_path = dictation_log_path();
    if log_path.exists() {
        fs::remove_file(&log_path)
            .with_context(|| format!("failed to remove {}", log_path.display()))?;
    }

    Ok(())
}

pub fn now_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

pub fn count_words(text: &str) -> usize {
    text.split_whitespace()
        .filter(|word| !word.trim().is_empty())
        .count()
}

fn dictation_log_path() -> PathBuf {
    local_setup::default_storage_path()
        .join("logs")
        .join(DICTATION_LOG_FILE_NAME)
}
