use std::{process::Command, thread, time::Duration};

use anyhow::{anyhow, Context, Result};
use arboard::Clipboard;
use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct PasteResult {
    pub pasted_text: String,
    pub restored_clipboard: bool,
    pub message: String,
}

pub fn paste_text(text: &str) -> Result<PasteResult> {
    if text.trim().is_empty() {
        return Err(anyhow!("there is no text available to paste"));
    }

    let mut clipboard = Clipboard::new().context("failed to access clipboard")?;
    let previous_text = clipboard.get_text().ok();

    clipboard
        .set_text(text.to_string())
        .context("failed to write text to clipboard")?;

    let status = Command::new("osascript")
        .arg("-e")
        .arg("tell application \"System Events\" to keystroke \"v\" using command down")
        .status()
        .context("failed to execute paste keystroke")?;

    if !status.success() {
        return Err(anyhow!("paste keystroke did not complete successfully"));
    }

    thread::sleep(Duration::from_millis(150));

    let restored_clipboard = if let Some(previous_text) = previous_text {
        clipboard
            .set_text(previous_text)
            .context("failed to restore previous clipboard text")?;
        true
    } else {
        false
    };

    Ok(PasteResult {
        pasted_text: text.to_string(),
        restored_clipboard,
        message: if restored_clipboard {
            "Pasted text and restored previous clipboard text.".to_string()
        } else {
            "Pasted text. Previous clipboard text could not be restored.".to_string()
        },
    })
}
