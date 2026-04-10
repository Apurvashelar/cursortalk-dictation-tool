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

fn start_recording() -> Result<RecorderHandle> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| anyhow!("no microphone input device available"))?;
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

    let stream = match sample_format {
        SampleFormat::F32 => {
            build_stream::<f32>(&device, &config, writer_for_stream, error_callback)?
        }
        SampleFormat::I16 => {
            build_stream::<i16>(&device, &config, writer_for_stream, error_callback)?
        }
        SampleFormat::U16 => {
            build_stream::<u16>(&device, &config, writer_for_stream, error_callback)?
        }
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

impl RecorderController {
    pub fn new() -> Self {
        let (sender, receiver) = mpsc::channel::<RecorderCommand>();

        std::thread::spawn(move || {
            let mut recorder_handle: Option<RecorderHandle> = None;

            while let Ok(command) = receiver.recv() {
                match command {
                    RecorderCommand::Start { respond_to } => {
                        let response = if recorder_handle.is_some() {
                            Err(anyhow!("recording is already active"))
                        } else {
                            start_recording().map(|handle| {
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

    pub fn start(&self) -> Result<RecordingDetails> {
        let (respond_to, receiver) = mpsc::channel();
        self.sender
            .send(RecorderCommand::Start { respond_to })
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
