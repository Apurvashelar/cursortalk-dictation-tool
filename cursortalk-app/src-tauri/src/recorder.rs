use std::{
    fs::{self, File},
    io::BufWriter,
    path::PathBuf,
    sync::{mpsc, Arc, Mutex},
    time::{Instant, SystemTime, UNIX_EPOCH},
};

use anyhow::{anyhow, Context, Result};
use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    Device, Sample, SampleFormat, SampleRate, Stream, StreamConfig, SupportedStreamConfig,
};
use serde::Serialize;
use tauri::AppHandle;

use crate::local_setup;

pub const RECORDING_ACTIVITY_EVENT: &str = "recording-activity-changed";

#[derive(Clone, Serialize)]
pub struct RecordingActivityPayload {
    pub is_speaking: bool,
}

#[derive(Clone, Serialize)]
pub struct AudioInputDevice {
    pub name: String,
    pub is_default: bool,
}

#[derive(Clone, Serialize)]
pub struct RecordingSummary {
    pub path: String,
    pub device_name: String,
    pub sample_rate: u32,
    pub channels: u16,
    pub duration_ms: u64,
}

#[derive(Clone, Serialize)]
pub struct RecordingDetails {
    pub device_name: String,
    pub sample_rate: u32,
    pub channels: u16,
}

struct RecorderHandle {
    stream: Stream,
    writer: Arc<Mutex<Option<hound::WavWriter<BufWriter<File>>>>>,
    device_name: String,
    sample_rate: u32,
    channels: u16,
    sample_format: SampleFormat,
    config: StreamConfig,
}

struct ActiveRecording {
    path: PathBuf,
    started_at: Instant,
}

#[derive(Clone)]
struct CachedInputConfig {
    device_name: String,
    sample_format: SampleFormat,
    config: StreamConfig,
}

#[derive(Clone)]
pub struct RecorderController {
    sender: mpsc::Sender<RecorderCommand>,
}

enum RecorderCommand {
    Start {
        app: AppHandle,
        respond_to: mpsc::Sender<Result<RecordingDetails>>,
    },
    Stop {
        respond_to: mpsc::Sender<Result<RecordingSummary>>,
    },
}

pub fn list_input_devices() -> Result<Vec<AudioInputDevice>> {
    let host = cpal::default_host();
    let default_name = host
        .default_input_device()
        .and_then(|device| device.name().ok());

    let mut devices = Vec::new();
    for device in host
        .input_devices()
        .context("failed to enumerate input devices")?
    {
        let name = device
            .name()
            .unwrap_or_else(|_| "Unknown Input".to_string());
        devices.push(AudioInputDevice {
            is_default: default_name
                .as_ref()
                .map(|value| value == &name)
                .unwrap_or(false),
            name,
        });
    }

    Ok(devices)
}

fn prepare_recorder(
    _app: AppHandle,
    cached_config: Option<&CachedInputConfig>,
) -> Result<(RecorderHandle, CachedInputConfig)> {
    let host = cpal::default_host();
    if let Some(cached_config) = cached_config {
        if let Some(device) = find_input_device_by_name(&host, &cached_config.device_name)? {
            match prepare_recorder_with_config(
                device,
                cached_config.sample_format,
                cached_config.config.clone(),
            ) {
                Ok(handle) => return Ok((handle, cached_config.clone())),
                Err(error) => {
                    eprintln!(
                        "failed to reopen cached microphone config for '{}': {error}",
                        cached_config.device_name
                    );
                }
            }
        }
    }

    let device = host
        .default_input_device()
        .ok_or_else(|| anyhow!("no microphone input device available"))?;
    prepare_recorder_for_device(device)
}

fn prepare_recorder_for_device(device: Device) -> Result<(RecorderHandle, CachedInputConfig)> {
    let device_name = device
        .name()
        .unwrap_or_else(|_| "Unknown Input".to_string());
    let writer = Arc::new(Mutex::new(None));
    let (stream, sample_format, config) = build_recording_stream(&device, writer.clone())
        .with_context(|| format!("failed to choose a stream config for '{device_name}'"))?;
    let cached_config = CachedInputConfig {
        device_name: device_name.clone(),
        sample_format,
        config: config.clone(),
    };
    stream
        .play()
        .with_context(|| format!("failed to start microphone stream for '{device_name}'"))?;

    Ok((
        RecorderHandle {
            stream,
            writer,
            device_name,
            sample_rate: config.sample_rate.0,
            channels: config.channels,
            sample_format,
            config: config.clone(),
        },
        cached_config,
    ))
}

fn prepare_recorder_with_config(
    device: Device,
    sample_format: SampleFormat,
    config: StreamConfig,
) -> Result<RecorderHandle> {
    let device_name = device
        .name()
        .unwrap_or_else(|_| "Unknown Input".to_string());
    let writer = Arc::new(Mutex::new(None));
    let stream = build_stream_for_config(&device, sample_format, &config, writer.clone())
        .with_context(|| format!("failed to reuse cached stream config for '{device_name}'"))?;
    stream
        .play()
        .with_context(|| format!("failed to start microphone stream for '{device_name}'"))?;

    Ok(RecorderHandle {
        stream,
        writer,
        device_name,
        sample_rate: config.sample_rate.0,
        channels: config.channels,
        sample_format,
        config,
    })
}

fn find_input_device_by_name(host: &cpal::Host, target_name: &str) -> Result<Option<Device>> {
    for device in host
        .input_devices()
        .context("failed to enumerate input devices")?
    {
        let matches = device
            .name()
            .map(|name| name == target_name)
            .unwrap_or(false);
        if matches {
            return Ok(Some(device));
        }
    }

    Ok(None)
}

impl RecorderController {
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::channel::<RecorderCommand>();

        std::thread::spawn(move || {
            let mut prepared_recorder: Option<RecorderHandle> = None;
            let mut active_recording: Option<ActiveRecording> = None;
            let mut cached_config: Option<CachedInputConfig> = None;

            while let Ok(command) = receiver.recv() {
                match command {
                    RecorderCommand::Start { app, respond_to } => {
                        let response = if active_recording.is_some() {
                            let prepared = prepared_recorder
                                .as_ref()
                                .ok_or_else(|| anyhow!("recording is already active but recorder handle is missing"));
                            prepared.map(|prepared| RecordingDetails {
                                device_name: prepared.device_name.clone(),
                                sample_rate: prepared.sample_rate,
                                channels: prepared.channels,
                            })
                        } else {
                            if prepared_recorder.is_none() {
                                match prepare_recorder(app.clone(), cached_config.as_ref()) {
                                    Ok((prepared, next_cached_config)) => {
                                        cached_config = Some(next_cached_config);
                                        prepared_recorder = Some(prepared);
                                    }
                                    Err(error) => {
                                        let _ = respond_to.send(Err(error));
                                        continue;
                                    }
                                }
                            }

                            activate_prepared_recorder(prepared_recorder.as_mut().unwrap())
                                .or_else(|error| {
                                    eprintln!("failed to activate prepared recorder: {error}");
                                    let (prepared, next_cached_config) =
                                        prepare_recorder(app, cached_config.as_ref())?;
                                    cached_config = Some(next_cached_config);
                                    prepared_recorder = Some(prepared);
                                    activate_prepared_recorder(prepared_recorder.as_mut().unwrap())
                                })
                                .map(|active| {
                                    let prepared = prepared_recorder.as_ref().unwrap();
                                let details = RecordingDetails {
                                        device_name: prepared.device_name.clone(),
                                        sample_rate: prepared.sample_rate,
                                        channels: prepared.channels,
                                };
                                    active_recording = Some(active);
                                details
                            })
                        };

                        let _ = respond_to.send(response);
                    }
                    RecorderCommand::Stop { respond_to } => {
                        let response = if let Some(active) = active_recording.take() {
                            stop_active_recording(prepared_recorder.as_mut(), active)
                        } else {
                            Err(anyhow!("recording is not active"))
                        };

                        let _ = respond_to.send(response);
                    }
                }
            }
        });

        Self { sender }
    }

    pub fn start(&self, app: AppHandle) -> Result<RecordingDetails> {
        let (respond_to, receiver) = mpsc::channel();
        self.sender
            .send(RecorderCommand::Start { app, respond_to })
            .context("failed to send start command to recorder thread")?;
        receiver
            .recv()
            .context("failed to receive start response from recorder thread")?
    }

    pub fn stop(&self) -> Result<RecordingSummary> {
        let (respond_to, receiver) = mpsc::channel();
        self.sender
            .send(RecorderCommand::Stop { respond_to })
            .context("failed to send stop command to recorder thread")?;
        receiver
            .recv()
            .context("failed to receive stop response from recorder thread")?
    }
}

impl RecorderHandle {
}

fn activate_prepared_recorder(prepared: &mut RecorderHandle) -> Result<ActiveRecording> {
    let recordings_dir = local_setup::default_storage_path().join("recordings");
    fs::create_dir_all(&recordings_dir).context("failed to create recordings directories")?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .context("failed to calculate timestamp")?
        .as_secs();
    let path = recordings_dir.join(format!("recording-{timestamp}.wav"));

    let wav_writer = hound::WavWriter::create(
        &path,
        hound::WavSpec {
            channels: prepared.channels,
            sample_rate: prepared.sample_rate,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        },
    )
    .context("failed to create wav writer")?;

    {
        let mut guard = prepared
            .writer
            .lock()
            .map_err(|_| anyhow!("failed to lock wav writer"))?;
        *guard = Some(wav_writer);
    }

    Ok(ActiveRecording {
        path,
        started_at: Instant::now(),
    })
}

fn stop_active_recording(
    prepared: Option<&mut RecorderHandle>,
    active: ActiveRecording,
) -> Result<RecordingSummary> {
    let prepared = prepared.ok_or_else(|| anyhow!("prepared recorder was not available"))?;

    let mut writer = prepared
        .writer
        .lock()
        .map_err(|_| anyhow!("failed to lock wav writer"))?;
    let writer = writer
        .take()
        .ok_or_else(|| anyhow!("recording writer was not available"))?;
    writer.finalize().context("failed to finalize recording")?;

    Ok(RecordingSummary {
        path: active.path.display().to_string(),
        device_name: prepared.device_name.clone(),
        sample_rate: prepared.sample_rate,
        channels: prepared.channels,
        duration_ms: active.started_at.elapsed().as_millis() as u64,
    })
}

fn build_recording_stream(
    device: &Device,
    writer: Arc<Mutex<Option<hound::WavWriter<BufWriter<File>>>>>,
) -> Result<(Stream, SampleFormat, StreamConfig)> {
    let mut attempts = Vec::new();

    if let Ok(default_config) = device.default_input_config() {
        let sample_format = default_config.sample_format();
        let config = default_config.config();
        match build_stream_for_config(device, sample_format, &config, writer.clone()) {
            Ok(stream) => return Ok((stream, sample_format, config)),
            Err(error) => attempts.push(describe_attempt(sample_format, &config, &error)),
        }
    }

    for supported_config in fallback_input_configs(device)? {
        let sample_format = supported_config.sample_format();
        let config = supported_config.config();
        match build_stream_for_config(device, sample_format, &config, writer.clone()) {
            Ok(stream) => return Ok((stream, sample_format, config)),
            Err(error) => attempts.push(describe_attempt(sample_format, &config, &error)),
        }
    }

    Err(anyhow!(
        "failed to open microphone input stream with a usable configuration. attempted: {}",
        attempts.join(" | ")
    ))
}

fn fallback_input_configs(device: &Device) -> Result<Vec<SupportedStreamConfig>> {
    let mut candidates = Vec::new();
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

    if let Some(config) = preferred {
        candidates.push(config);
    }

    Ok(candidates)
}

fn build_stream_for_config(
    device: &Device,
    sample_format: SampleFormat,
    config: &StreamConfig,
    writer: Arc<Mutex<Option<hound::WavWriter<BufWriter<File>>>>>,
) -> Result<Stream> {
    let error_callback = |_error| {};

    match sample_format {
        SampleFormat::F32 => build_stream::<f32>(device, config, writer, error_callback),
        SampleFormat::I16 => build_stream::<i16>(device, config, writer, error_callback),
        SampleFormat::U16 => build_stream::<u16>(device, config, writer, error_callback),
        other => {
            Err(anyhow!("unsupported input sample format: {other:?}"))
        }
    }
}

fn describe_attempt(sample_format: SampleFormat, config: &StreamConfig, error: &anyhow::Error) -> String {
    format!(
        "{sample_format:?} {}ch @ {}Hz: {}",
        config.channels,
        config.sample_rate.0,
        error
    )
}

fn build_stream<T>(
    device: &Device,
    config: &cpal::StreamConfig,
    writer: Arc<Mutex<Option<hound::WavWriter<BufWriter<File>>>>>,
    error_callback: impl FnMut(cpal::StreamError) + Send + 'static,
) -> Result<Stream>
where
    T: cpal::SizedSample,
    i16: cpal::FromSample<T>,
{
    let stream = device.build_input_stream(
        config,
        move |data: &[T], _: &cpal::InputCallbackInfo| {
            if let Ok(mut writer_guard) = writer.lock() {
                if let Some(writer) = writer_guard.as_mut() {
                    for &sample in data {
                        let value: i16 = i16::from_sample(sample);
                        let _ = writer.write_sample(value);
                    }
                }
            }
        },
        error_callback,
        None,
    )?;

    Ok(stream)
}
