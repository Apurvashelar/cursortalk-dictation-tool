use std::process::Command;

use anyhow::{anyhow, Context, Result};
use cpal::traits::{DeviceTrait, HostTrait};
use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct PermissionState {
    pub status: String,
    pub label: String,
    pub message: String,
}

#[derive(Clone, Serialize)]
pub struct PermissionStatusReport {
    pub microphone: PermissionState,
    pub accessibility: PermissionState,
}

pub fn get_permission_status_report() -> PermissionStatusReport {
    PermissionStatusReport {
        microphone: microphone_permission_state(),
        accessibility: accessibility_permission_state(),
    }
}

pub fn open_permission_settings(permission: &str) -> Result<()> {
    let target = match permission {
        "microphone" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
        }
        "accessibility" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        }
        other => {
            return Err(anyhow!(
                "unknown permission target: {other}. Expected microphone or accessibility."
            ))
        }
    };

    let status = Command::new("open")
        .arg(target)
        .status()
        .with_context(|| format!("failed to open System Settings for {permission}"))?;

    if status.success() {
        Ok(())
    } else {
        Err(anyhow!(
            "System Settings returned a non-zero status while opening {permission} settings."
        ))
    }
}

pub fn accessibility_is_trusted() -> bool {
    #[cfg(target_os = "macos")]
    unsafe {
        CGPreflightPostEventAccess() || AXIsProcessTrusted()
    }

    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

fn microphone_permission_state() -> PermissionState {
    match probe_microphone_access() {
        Ok(()) => PermissionState {
            status: "ready".to_string(),
            label: "Granted".to_string(),
            message: "Microphone access is available for recording.".to_string(),
        },
        Err(error) => {
            let message = error.to_string();
            let status = if looks_like_permission_error(&message) {
                "needs_access"
            } else {
                "error"
            };
            let label = if status == "needs_access" {
                "Allow access"
            } else {
                "Needs attention"
            };

            PermissionState {
                status: status.to_string(),
                label: label.to_string(),
                message,
            }
        }
    }
}

fn accessibility_permission_state() -> PermissionState {
    #[cfg(target_os = "macos")]
    {
        if accessibility_is_trusted() {
            PermissionState {
                status: "ready".to_string(),
                label: "Granted".to_string(),
                message: "Accessibility access is available for paste automation.".to_string(),
            }
        } else {
            PermissionState {
                status: "needs_access".to_string(),
                label: "Allow access".to_string(),
                message: accessibility_denied_message(),
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        PermissionState {
            status: "unknown".to_string(),
            label: "Unknown".to_string(),
            message: "Accessibility checks are only implemented on macOS.".to_string(),
        }
    }
}

#[cfg(target_os = "macos")]
fn accessibility_denied_message() -> String {
    "Accessibility is not trusted for this exact app bundle. Re-add the final packaged app in System Settings, then relaunch it from that same bundle path."
        .to_string()
}

fn probe_microphone_access() -> Result<()> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| anyhow!("no microphone input device available"))?;
    device
        .name()
        .context("failed to inspect default microphone device")?;
    device
        .default_input_config()
        .context("failed to inspect default microphone configuration")?;
    Ok(())
}

fn looks_like_permission_error(message: &str) -> bool {
    let normalized = message.to_ascii_lowercase();

    [
        "permission",
        "not permitted",
        "not allowed",
        "unauthorized",
        "access denied",
        "operation not permitted",
    ]
    .iter()
    .any(|needle| normalized.contains(needle))
}

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
unsafe extern "C" {
    fn AXIsProcessTrusted() -> bool;
    fn CGPreflightPostEventAccess() -> bool;
}
