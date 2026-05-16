use std::{thread, time::Duration};

use anyhow::{anyhow, Context, Result};
use arboard::Clipboard;
use serde::Serialize;

use crate::permissions;

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

    #[cfg(target_os = "macos")]
    if !permissions::accessibility_is_trusted() {
        return Err(anyhow!(
            "Accessibility permission is not trusted for this app instance. Re-enable it in System Settings and relaunch the packaged app."
        ));
    }

    let mut clipboard = Clipboard::new().context("failed to access clipboard")?;
    let previous_text = clipboard.get_text().ok();

    clipboard
        .set_text(text.to_string())
        .context("failed to write text to clipboard")?;

    send_paste_shortcut().context("failed to execute paste keystroke")?;

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

#[cfg(target_os = "macos")]
fn send_paste_shortcut() -> Result<()> {
    const COMMAND_FLAG: u64 = 0x0010_0000;
    const V_KEYCODE: u16 = 9;
    const HID_EVENT_TAP: u32 = 0;

    unsafe {
        let key_down = CGEventCreateKeyboardEvent(std::ptr::null_mut(), V_KEYCODE, true);
        if key_down.is_null() {
            return Err(anyhow!("failed to create key down event"));
        }
        CGEventSetFlags(key_down, COMMAND_FLAG);
        CGEventPost(HID_EVENT_TAP, key_down);
        CFRelease(key_down.cast());

        let key_up = CGEventCreateKeyboardEvent(std::ptr::null_mut(), V_KEYCODE, false);
        if key_up.is_null() {
            return Err(anyhow!("failed to create key up event"));
        }
        CGEventSetFlags(key_up, COMMAND_FLAG);
        CGEventPost(HID_EVENT_TAP, key_up);
        CFRelease(key_up.cast());
    }

    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn send_paste_shortcut() -> Result<()> {
    Err(anyhow!(
        "native paste shortcut is only implemented on macOS"
    ))
}

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
unsafe extern "C" {
    fn CGEventCreateKeyboardEvent(
        source: *mut std::ffi::c_void,
        virtual_key: u16,
        key_down: bool,
    ) -> *mut std::ffi::c_void;
    fn CGEventSetFlags(event: *mut std::ffi::c_void, flags: u64);
    fn CGEventPost(tap: u32, event: *mut std::ffi::c_void);
    fn CFRelease(value: *const std::ffi::c_void);
}
