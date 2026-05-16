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
    Device, Sample, SampleFormat, SampleRate, Stream, SupportedStreamConfig,
};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::{app_state::AppState, desktop_ui};

pub const RECORDING_ACTIVITY_EVENT: &str = "recording-activity-changed";

const SPEECH_RMS_THRESHOLD: f32 = 0.006;
const SILENT_CALLBACKS_BEFORE_IDLE: u8 = 3;

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
    path: PathBuf,
    device_name: String,
    sample_rate: u32,
    channels: u16,
    started_at: Instant,
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

fn start_recording(app: AppHandle) -> Result<RecorderHandle> {
    let host = cpal::default_host();
    let preferred_input_name = app
        .state::<AppState>()
        .runtime
        .lock()
        .ok()
        .and_then(|runtime| runtime.preferred_audio_input.clone());
    let device = choose_input_device(&host, preferred_input_name.as_deref())?;
    let device_name = device
        .name()
        .unwrap_or_else(|_| "Unknown Input".to_string());
    let supported_config = preferred_input_config(&device)?;
    let sample_format = supported_config.sample_format();
    let config = supported_config.config();

    let recordings_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("debug-recordings");
    fs::create_dir_all(&recordings_dir).context("failed to create recordings directory")?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .context("failed to calculate timestamp")?
        .as_secs();
    let path = recordings_dir.join(format!("recording-{timestamp}.wav"));

    let writer = hound::WavWriter::create(
        &path,
        hound::WavSpec {
            channels: config.channels,
            sample_rate: config.sample_rate.0,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        },
    )
    .context("failed to create wav writer")?;

    let writer = Arc::new(Mutex::new(Some(writer)));
    let writer_for_stream = writer.clone();

    let error_callback = |error| {
        eprintln!("recording stream error: {error}");
    };

    let activity_state = Arc::new(Mutex::new(RecordingActivityState::default()));
    let stream = match sample_format {
        SampleFormat::F32 => build_stream::<f32>(
            &device,
            &config,
            writer_for_stream,
            app,
            activity_state,
            error_callback,
        )?,
        SampleFormat::I16 => build_stream::<i16>(
            &device,
            &config,
            writer_for_stream,
            app,
            activity_state,
            error_callback,
        )?,
        SampleFormat::U16 => build_stream::<u16>(
            &device,
            &config,
            writer_for_stream,
            app,
            activity_state,
            error_callback,
        )?,
        other => {
            return Err(anyhow!("unsupported input sample format: {other:?}"));
        }
    };

    stream.play().context("failed to start microphone stream")?;

    Ok(RecorderHandle {
        stream,
        writer,
        path,
        device_name,
        sample_rate: config.sample_rate.0,
        channels: config.channels,
        started_at: Instant::now(),
    })
}

fn choose_input_device(host: &cpal::Host, preferred_name: Option<&str>) -> Result<Device> {
    if let Some(preferred_name) = preferred_name {
        let preferred_name = preferred_name.trim();
        if !preferred_name.is_empty() {
            for device in host
                .input_devices()
                .context("failed to enumerate input devices")?
            {
                let matches_preference = device
                    .name()
                    .map(|name| name == preferred_name)
                    .unwrap_or(false);
                if matches_preference {
                    return Ok(device);
                }
            }
        }
    }

    host.default_input_device()
        .ok_or_else(|| anyhow!("no microphone input device available"))
}

#[derive(Default)]
struct RecordingActivityState {
    is_speaking: bool,
    silent_callbacks: u8,
}

impl RecorderController {
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::channel::<RecorderCommand>();

        std::thread::spawn(move || {
            let mut recorder_handle: Option<RecorderHandle> = None;

            while let Ok(command) = receiver.recv() {
                match command {
                    RecorderCommand::Start { app, respond_to } => {
                        let response = if recorder_handle.is_some() {
                            Err(anyhow!("recording is already active"))
                        } else {
                            start_recording(app).map(|handle| {
                                let details = RecordingDetails {
                                    device_name: handle.device_name.clone(),
                                    sample_rate: handle.sample_rate,
                                    channels: handle.channels,
                                };
                                recorder_handle = Some(handle);
                                details
                            })
                        };

                        let _ = respond_to.send(response);
                    }
                    RecorderCommand::Stop { respond_to } => {
                        let response = if let Some(handle) = recorder_handle.take() {
                            handle.stop()
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
    pub fn stop(self) -> Result<RecordingSummary> {
        drop(self.stream);

        let mut writer = self
            .writer
            .lock()
            .map_err(|_| anyhow!("failed to lock wav writer"))?;
        let writer = writer
            .take()
            .ok_or_else(|| anyhow!("recording writer was not available"))?;
        writer.finalize().context("failed to finalize recording")?;

        Ok(RecordingSummary {
            path: self.path.display().to_string(),
            device_name: self.device_name,
            sample_rate: self.sample_rate,
            channels: self.channels,
            duration_ms: self.started_at.elapsed().as_millis() as u64,
        })
    }
}

fn preferred_input_config(device: &Device) -> Result<SupportedStreamConfig> {
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

fn build_stream<T>(
    device: &Device,
    config: &cpal::StreamConfig,
    writer: Arc<Mutex<Option<hound::WavWriter<BufWriter<File>>>>>,
    app: AppHandle,
    activity_state: Arc<Mutex<RecordingActivityState>>,
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
                    let mut sum_squares = 0.0_f32;
                    let mut sample_count = 0_usize;
                    for &sample in data {
                        let value: i16 = i16::from_sample(sample);
                        let _ = writer.write_sample(value);
                        let normalized = value as f32 / i16::MAX as f32;
                        sum_squares += normalized * normalized;
                        sample_count += 1;
                    }

                    if sample_count > 0 {
                        let rms = (sum_squares / sample_count as f32).sqrt();
                        let speaking_now = rms >= SPEECH_RMS_THRESHOLD;
                        if let Ok(mut activity_guard) = activity_state.lock() {
                            if speaking_now {
                                activity_guard.silent_callbacks = 0;
                                if !activity_guard.is_speaking {
                                    activity_guard.is_speaking = true;
                                    if let Ok(mut pill) =
                                        app.state::<crate::app_state::AppState>().pill.lock()
                                    {
                                        pill.is_speaking = true;
                                    }
                                    let _ = app.emit(
                                        RECORDING_ACTIVITY_EVENT,
                                        RecordingActivityPayload { is_speaking: true },
                                    );
                                    desktop_ui::emit_recording_pill_update(&app);
                                }
                            } else if activity_guard.is_speaking {
                                activity_guard.silent_callbacks =
                                    activity_guard.silent_callbacks.saturating_add(1);
                                if activity_guard.silent_callbacks >= SILENT_CALLBACKS_BEFORE_IDLE {
                                    activity_guard.is_speaking = false;
                                    activity_guard.silent_callbacks = 0;
                                    if let Ok(mut pill) =
                                        app.state::<crate::app_state::AppState>().pill.lock()
                                    {
                                        pill.is_speaking = false;
                                    }
                                    let _ = app.emit(
                                        RECORDING_ACTIVITY_EVENT,
                                        RecordingActivityPayload { is_speaking: false },
                                    );
                                    desktop_ui::emit_recording_pill_update(&app);
                                }
                            }
                        }
                    }
                }
            }
        },
        error_callback,
        None,
    )?;

    Ok(stream)
}
