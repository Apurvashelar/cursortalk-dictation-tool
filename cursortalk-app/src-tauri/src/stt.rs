use std::sync::{Mutex, OnceLock};
use std::time::Instant;

use anyhow::{anyhow, Context, Result};
use hound::{SampleFormat, WavReader};
use serde::{Deserialize, Serialize};
use sherpa_rs::transducer::{TransducerConfig, TransducerRecognizer};

#[derive(Clone, Serialize)]
pub struct SttStatus {
    pub engine: String,
    pub state: String,
    pub message: String,
}

#[derive(Clone, Deserialize, Serialize)]
pub struct TranscriptionResult {
    pub transcript: String,
    pub latency_ms: u64,
    pub sample_rate: u32,
}

pub struct AudioActivity {
    pub has_speech: bool,
}

struct CachedRecognizer {
    model_dir: String,
    recognizer: TransducerRecognizer,
}

static RECOGNIZER: OnceLock<Mutex<Option<CachedRecognizer>>> = OnceLock::new();
const MIN_SPEECH_DURATION_MS: u64 = 350;
const MIN_SPEECH_RMS: f32 = 0.002;
const MIN_SPEECH_PEAK: f32 = 0.018;
const ACTIVE_SAMPLE_THRESHOLD: f32 = 0.01;
const MIN_ACTIVE_SAMPLE_RATIO: f32 = 0.002;

pub fn current_status() -> SttStatus {
    SttStatus {
        engine: "Parakeet".to_string(),
        state: "ready".to_string(),
        message:
            "Audio capture is wired. Recorded WAV files are transcribed through the native Rust Parakeet recognizer."
                .to_string(),
    }
}

pub fn transcribe_wav(audio_path: &str, model_dir: &str) -> Result<TranscriptionResult> {
    let started_at = Instant::now();
    let (sample_rate, samples) = read_wav_samples(audio_path)?;

    let transcript = with_recognizer(model_dir, |recognizer| {
        Ok(recognizer.transcribe(sample_rate, &samples))
    })?;

    Ok(TranscriptionResult {
        transcript: transcript.trim().to_string(),
        latency_ms: started_at.elapsed().as_millis() as u64,
        sample_rate,
    })
}

pub fn detect_audio_activity(audio_path: &str) -> Result<AudioActivity> {
    let (sample_rate, samples) = read_wav_samples(audio_path)?;

    if samples.is_empty() || sample_rate == 0 {
        return Ok(AudioActivity { has_speech: false });
    }

    let duration_ms = ((samples.len() as f64 / sample_rate as f64) * 1000.0).round() as u64;
    let mut sum_squares = 0.0_f32;
    let mut peak = 0.0_f32;
    let mut active_samples = 0usize;

    for sample in &samples {
        let absolute = sample.abs();
        sum_squares += absolute * absolute;
        peak = peak.max(absolute);

        if absolute >= ACTIVE_SAMPLE_THRESHOLD {
            active_samples += 1;
        }
    }

    let rms = (sum_squares / samples.len() as f32).sqrt();
    let active_ratio = active_samples as f32 / samples.len() as f32;
    let has_speech = duration_ms >= MIN_SPEECH_DURATION_MS
        && rms >= MIN_SPEECH_RMS
        && peak >= MIN_SPEECH_PEAK
        && active_ratio >= MIN_ACTIVE_SAMPLE_RATIO;

    Ok(AudioActivity { has_speech })
}

fn with_recognizer<T>(
    model_dir: &str,
    run: impl FnOnce(&mut TransducerRecognizer) -> Result<T>,
) -> Result<T> {
    let recognizer_slot = RECOGNIZER.get_or_init(|| Mutex::new(None));
    let mut guard = recognizer_slot
        .lock()
        .map_err(|_| anyhow!("failed to lock native STT recognizer"))?;

    let needs_init = guard
        .as_ref()
        .map(|cached| cached.model_dir != model_dir)
        .unwrap_or(true);

    if needs_init {
        let recognizer = build_recognizer(model_dir)?;
        *guard = Some(CachedRecognizer {
            model_dir: model_dir.to_string(),
            recognizer,
        });
    }

    let cached = guard
        .as_mut()
        .ok_or_else(|| anyhow!("native STT recognizer was not initialized"))?;

    run(&mut cached.recognizer)
}

fn build_recognizer(model_dir: &str) -> Result<TransducerRecognizer> {
    let config = TransducerConfig {
        encoder: format!("{model_dir}/encoder.int8.onnx"),
        decoder: format!("{model_dir}/decoder.int8.onnx"),
        joiner: format!("{model_dir}/joiner.int8.onnx"),
        tokens: format!("{model_dir}/tokens.txt"),
        num_threads: 1,
        sample_rate: 16_000,
        feature_dim: 80,
        decoding_method: "greedy_search".to_string(),
        model_type: "nemo_transducer".to_string(),
        ..Default::default()
    };

    TransducerRecognizer::new(config)
        .map_err(|error| anyhow!("failed to initialize native Parakeet recognizer: {error}"))
}

fn read_wav_samples(audio_path: &str) -> Result<(u32, Vec<f32>)> {
    let mut reader = WavReader::open(audio_path)
        .with_context(|| format!("failed to open recorded WAV file at {audio_path}"))?;
    let spec = reader.spec();

    let samples = match (spec.sample_format, spec.bits_per_sample) {
        (SampleFormat::Int, 16) => {
            let raw = reader
                .samples::<i16>()
                .collect::<std::result::Result<Vec<_>, _>>()
                .context("failed to read 16-bit PCM samples")?;
            normalize_i16_samples(raw, spec.channels)
        }
        (SampleFormat::Int, 32) => {
            let raw = reader
                .samples::<i32>()
                .collect::<std::result::Result<Vec<_>, _>>()
                .context("failed to read 32-bit PCM samples")?;
            normalize_i32_samples(raw, spec.channels)
        }
        (SampleFormat::Float, 32) => {
            let raw = reader
                .samples::<f32>()
                .collect::<std::result::Result<Vec<_>, _>>()
                .context("failed to read 32-bit float samples")?;
            fold_channels(raw, spec.channels)
        }
        _ => {
            return Err(anyhow!(
                "unsupported WAV format for native STT: {:?} {}-bit",
                spec.sample_format,
                spec.bits_per_sample
            ));
        }
    };

    Ok((spec.sample_rate, samples))
}

fn normalize_i16_samples(samples: Vec<i16>, channels: u16) -> Vec<f32> {
    let mono = samples
        .into_iter()
        .map(|sample| sample as f32 / i16::MAX as f32)
        .collect::<Vec<_>>();
    fold_channels(mono, channels)
}

fn normalize_i32_samples(samples: Vec<i32>, channels: u16) -> Vec<f32> {
    let mono = samples
        .into_iter()
        .map(|sample| sample as f32 / i32::MAX as f32)
        .collect::<Vec<_>>();
    fold_channels(mono, channels)
}

fn fold_channels(samples: Vec<f32>, channels: u16) -> Vec<f32> {
    if channels <= 1 {
        return samples;
    }

    samples
        .chunks(channels as usize)
        .map(|chunk| chunk.iter().copied().sum::<f32>() / chunk.len() as f32)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::transcribe_wav;

    #[test]
    #[ignore = "requires local model and recording fixture paths"]
    fn native_transcriber_handles_existing_recording() {
        let audio_path = std::env::var("VOICEFLOW_STT_TEST_AUDIO")
            .expect("VOICEFLOW_STT_TEST_AUDIO must point to a WAV file");
        let model_dir = std::env::var("VOICEFLOW_STT_TEST_MODEL_DIR")
            .expect("VOICEFLOW_STT_TEST_MODEL_DIR must point to the Parakeet model directory");

        let result =
            transcribe_wav(&audio_path, &model_dir).expect("native transcription should work");
        assert!(!result.transcript.trim().is_empty());
    }
}
