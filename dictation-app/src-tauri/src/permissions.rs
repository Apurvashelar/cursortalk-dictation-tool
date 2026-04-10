use std::{
    process::Command,
    thread,
    time::Duration,
};

use anyhow::{anyhow, Context, Result};
use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    SampleFormat, SampleRate, Stream, SupportedStreamConfig,
};
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
        "microphone" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
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
    unsafe {
        if AXIsProcessTrusted() {
            PermissionState {
                status: "ready".to_string(),
                label: "Granted".to_string(),
                message: "Accessibility access is available for paste automation.".to_string(),
            }
        } else {
            PermissionState {
                status: "needs_access".to_string(),
                label: "Allow access".to_string(),
                message: "Allow Accessibility access so Voice Dictation can paste into other apps."
                    .to_string(),
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

fn probe_microphone_access() -> Result<()> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| anyhow!("no microphone input device available"))?;
    let config = preferred_input_config(&device)?;
    let sample_format = config.sample_format();
    let stream_config = config.config();

    let error_callback = |_error| {};

    let stream = match sample_format {
        SampleFormat::F32 => build_probe_stream::<f32>(&device, &stream_config, error_callback)?,
        SampleFormat::I16 => build_probe_stream::<i16>(&device, &stream_config, error_callback)?,
        SampleFormat::U16 => build_probe_stream::<u16>(&device, &stream_config, error_callback)?,
        other => {
            return Err(anyhow!(
                "unsupported microphone sample format during permission check: {other:?}"
            ))
        }
    };

    stream
        .play()
        .context("failed to start microphone stream during permission check")?;
    thread::sleep(Duration::from_millis(120));
    drop(stream);

    Ok(())
}

fn preferred_input_config(device: &cpal::Device) -> Result<SupportedStreamConfig> {
    let preferred = device
        .supported_input_configs()
        .context("failed to query supported microphone configs")?
        .find_map(|range| {
            if range.channels() == 1
                && range.min_sample_rate().0 <= 16_000
                && range.max_sample_rate().0 >= 16_000
            {
                Some(range.with_sample_rate(SampleRate(16_000)))
            } else {
                None
            }
        });

    preferred
        .or_else(|| device.default_input_config().ok())
        .ok_or_else(|| anyhow!("could not find a usable microphone input configuration"))
}

fn build_probe_stream<T>(
    device: &cpal::Device,
    config: &cpal::StreamConfig,
    error_callback: impl FnMut(cpal::StreamError) + Send + 'static,
) -> Result<Stream>
where
    T: cpal::SizedSample,
    i16: cpal::FromSample<T>,
{
    let stream = device.build_input_stream(config, move |_data: &[T], _| {}, error_callback, None)?;
    Ok(stream)
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
}
