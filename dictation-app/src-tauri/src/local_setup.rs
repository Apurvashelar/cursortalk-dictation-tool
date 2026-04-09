use std::{
    env, fs,
    path::{Path, PathBuf},
};

use anyhow::{anyhow, Context, Result};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::config::AppConfig;

pub const LOCAL_SETUP_PROGRESS_EVENT: &str = "local-setup-progress";

#[derive(Clone, Serialize)]
pub struct LocalSetupStatus {
    pub status: String,
    pub message: String,
    pub storage_path: String,
    pub stt_model_dir: String,
    pub cleanup_model_dir: String,
    pub missing_items: Vec<String>,
    pub detected_legacy_cleanup: bool,
}

#[derive(Clone, Serialize)]
pub struct LocalSetupProgress {
    pub step: String,
    pub message: String,
}

#[derive(Serialize)]
struct LocalSetupMetadata {
    mode: String,
    storage_path: String,
    stt_model_dir: String,
    cleanup_model_dir: String,
    reused_existing_files: bool,
    detected_legacy_cleanup: bool,
}

#[derive(Clone)]
struct SetupInspection {
    storage_path: PathBuf,
    canonical_stt_dir: PathBuf,
    canonical_cleanup_dir: PathBuf,
    configured_stt_dir: PathBuf,
    stt_ready: bool,
    canonical_stt_ready: bool,
    configured_stt_ready: bool,
    cleanup_ready: bool,
    canonical_cleanup_file: Option<PathBuf>,
    cleanup_source_file: Option<PathBuf>,
    effective_stt_dir: PathBuf,
    effective_cleanup_dir: PathBuf,
    missing_items: Vec<String>,
    detected_legacy_cleanup: bool,
}

const STT_REQUIRED_FILES: [&str; 4] = [
    "encoder.int8.onnx",
    "decoder.int8.onnx",
    "joiner.int8.onnx",
    "tokens.txt",
];

pub fn detect_local_setup() -> LocalSetupStatus {
    let inspection = inspect_local_setup();
    let (status, message) = inspection.status_and_message();

    LocalSetupStatus {
        status,
        message,
        storage_path: inspection.storage_path.display().to_string(),
        stt_model_dir: inspection.effective_stt_dir.display().to_string(),
        cleanup_model_dir: inspection.effective_cleanup_dir.display().to_string(),
        missing_items: inspection.missing_items,
        detected_legacy_cleanup: inspection.detected_legacy_cleanup,
    }
}

pub fn run_local_setup(app: &AppHandle) -> Result<LocalSetupStatus> {
    let initial = inspect_local_setup();

    if initial.is_complete() {
        emit_progress(
            app,
            "Setup already completed",
            "Required local files were found on this machine. Skipping download.",
        )?;
        write_local_setup_metadata(
            &initial.storage_path,
            &initial.effective_stt_dir,
            &initial.effective_cleanup_dir,
            false,
            initial.detected_legacy_cleanup,
        )?;
        return Ok(detect_local_setup());
    }

    emit_progress(
        app,
        "Preparing folders",
        "Preparing local storage folders for speech and cleanup models.",
    )?;
    prepare_storage_directories(&initial.storage_path)?;

    let mut reused_existing_files = false;

    emit_progress(
        app,
        "Downloading speech model",
        "Preparing the local speech model files.",
    )?;
    let current = inspect_local_setup();
    if !current.canonical_stt_ready {
        if current.configured_stt_ready {
            link_required_stt_files(&current.configured_stt_dir, &current.canonical_stt_dir)?;
            reused_existing_files = true;
        } else {
            return Err(anyhow!(
                "Speech model source was not found on this machine yet. A real download source still needs to be configured."
            ));
        }
    }

    emit_progress(
        app,
        "Downloading cleanup model",
        "Preparing the local cleanup model files.",
    )?;
    let current = inspect_local_setup();
    if current.canonical_cleanup_file.is_none() {
        if let Some(source_file) = current.cleanup_source_file {
            link_cleanup_model(&source_file, &current.canonical_cleanup_dir)?;
            reused_existing_files = true;
        } else {
            return Err(anyhow!(
                "Cleanup model source was not found on this machine yet. A real download source still needs to be configured."
            ));
        }
    }

    emit_progress(
        app,
        "Verifying files",
        "Validating the local speech and cleanup files.",
    )?;
    let final_state = inspect_local_setup();

    if !final_state.canonical_stt_ready {
        return Err(anyhow!(
            "Speech model files are still incomplete after setup preparation."
        ));
    }

    if final_state.canonical_cleanup_file.is_none() {
        return Err(anyhow!(
            "Cleanup model files are still incomplete after setup preparation."
        ));
    }

    emit_progress(
        app,
        "Preparing local runtime",
        "Finalizing local setup metadata and runtime state.",
    )?;
    write_local_setup_metadata(
        &final_state.storage_path,
        &final_state.canonical_stt_dir,
        &final_state.canonical_cleanup_dir,
        reused_existing_files,
        final_state.detected_legacy_cleanup,
    )?;

    Ok(detect_local_setup())
}

impl SetupInspection {
    fn is_complete(&self) -> bool {
        self.stt_ready && self.cleanup_ready
    }

    fn status_and_message(&self) -> (String, String) {
        if self.is_complete() {
            (
                "complete".to_string(),
                "Setup is already completed on this machine. Skipping download.".to_string(),
            )
        } else if self.stt_ready || self.cleanup_ready {
            (
                "partial".to_string(),
                "Existing local files were found. Finishing setup with the missing pieces."
                    .to_string(),
            )
        } else {
            (
                "missing".to_string(),
                "Local models were not found yet. Download is required for setup.".to_string(),
            )
        }
    }
}

fn inspect_local_setup() -> SetupInspection {
    let config = AppConfig::default();
    let storage_path = default_storage_path();
    let canonical_stt_dir = storage_path.join("models").join("stt");
    let canonical_cleanup_dir = storage_path.join("models").join("cleanup");
    let configured_stt_dir = PathBuf::from(&config.stt_model_dir);

    let canonical_stt_ready = required_stt_files_exist(&canonical_stt_dir);
    let configured_stt_ready = required_stt_files_exist(&configured_stt_dir);
    let stt_ready = canonical_stt_ready || configured_stt_ready;

    let canonical_cleanup_file = find_gguf_file(&canonical_cleanup_dir);
    let legacy_cleanup_file = find_legacy_cleanup_file();
    let cleanup_source_file = canonical_cleanup_file
        .clone()
        .or_else(|| legacy_cleanup_file.clone());
    let cleanup_ready = cleanup_source_file.is_some();

    let mut missing_items = Vec::new();

    if !stt_ready {
        missing_items.push("speech model files".to_string());
    }

    if !cleanup_ready {
        missing_items.push("cleanup model files".to_string());
    }

    let effective_stt_dir = if canonical_stt_ready {
        canonical_stt_dir.clone()
    } else {
        configured_stt_dir.clone()
    };

    let effective_cleanup_dir = cleanup_source_file
        .as_ref()
        .and_then(|path| path.parent().map(Path::to_path_buf))
        .unwrap_or_else(|| canonical_cleanup_dir.clone());

    SetupInspection {
        storage_path,
        canonical_stt_dir,
        canonical_cleanup_dir,
        configured_stt_dir,
        stt_ready,
        canonical_stt_ready,
        configured_stt_ready,
        cleanup_ready,
        canonical_cleanup_file,
        cleanup_source_file,
        effective_stt_dir,
        effective_cleanup_dir,
        missing_items,
        detected_legacy_cleanup: legacy_cleanup_file.is_some(),
    }
}

fn prepare_storage_directories(storage_path: &Path) -> Result<()> {
    fs::create_dir_all(storage_path.join("models").join("stt"))
        .context("failed to create local speech model directory")?;
    fs::create_dir_all(storage_path.join("models").join("cleanup"))
        .context("failed to create local cleanup model directory")?;
    fs::create_dir_all(storage_path.join("downloads"))
        .context("failed to create local downloads directory")?;
    fs::create_dir_all(storage_path.join("logs")).context("failed to create local logs directory")?;
    Ok(())
}

fn link_required_stt_files(source_dir: &Path, target_dir: &Path) -> Result<()> {
    for file_name in STT_REQUIRED_FILES {
        let source = source_dir.join(file_name);
        let target = target_dir.join(file_name);

        if !source.exists() {
            return Err(anyhow!("speech model file is missing: {}", source.display()));
        }

        ensure_linked_file(&source, &target)?;
    }

    Ok(())
}

fn link_cleanup_model(source_file: &Path, target_dir: &Path) -> Result<()> {
    let file_name = source_file
        .file_name()
        .ok_or_else(|| anyhow!("cleanup model file name could not be resolved"))?;
    let target = target_dir.join(file_name);
    ensure_linked_file(source_file, &target)
}

fn ensure_linked_file(source: &Path, target: &Path) -> Result<()> {
    if same_file_target(source, target) {
        return Ok(());
    }

    if target.exists() || target.symlink_metadata().is_ok() {
        if target.is_dir() {
            fs::remove_dir_all(target)
                .with_context(|| format!("failed to replace directory {}", target.display()))?;
        } else {
            fs::remove_file(target)
                .with_context(|| format!("failed to replace file {}", target.display()))?;
        }
    }

    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(source, target).with_context(|| {
            format!(
                "failed to create symbolic link from {} to {}",
                target.display(),
                source.display()
            )
        })?;
    }

    #[cfg(not(unix))]
    {
        fs::copy(source, target).with_context(|| {
            format!(
                "failed to copy local setup file from {} to {}",
                source.display(),
                target.display()
            )
        })?;
    }

    Ok(())
}

fn same_file_target(source: &Path, target: &Path) -> bool {
    match fs::read_link(target) {
        Ok(existing_target) => existing_target == source,
        Err(_) => false,
    }
}

fn write_local_setup_metadata(
    storage_path: &Path,
    stt_model_dir: &Path,
    cleanup_model_dir: &Path,
    reused_existing_files: bool,
    detected_legacy_cleanup: bool,
) -> Result<()> {
    fs::create_dir_all(storage_path)
        .with_context(|| format!("failed to prepare {}", storage_path.display()))?;
    let metadata = LocalSetupMetadata {
        mode: "local".to_string(),
        storage_path: storage_path.display().to_string(),
        stt_model_dir: stt_model_dir.display().to_string(),
        cleanup_model_dir: cleanup_model_dir.display().to_string(),
        reused_existing_files,
        detected_legacy_cleanup,
    };
    let metadata_path = storage_path.join("local-setup.json");
    let metadata_json =
        serde_json::to_string_pretty(&metadata).context("failed to serialize local setup metadata")?;
    fs::write(&metadata_path, metadata_json)
        .with_context(|| format!("failed to write {}", metadata_path.display()))?;
    Ok(())
}

fn default_storage_path() -> PathBuf {
    let home_dir = env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));

    home_dir
        .join("Library")
        .join("Application Support")
        .join("VoiceFlow Desktop")
}

fn required_stt_files_exist(dir: &Path) -> bool {
    STT_REQUIRED_FILES
        .iter()
        .all(|file_name| dir.join(file_name).exists())
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

            if is_gguf {
                Some(path)
            } else {
                None
            }
        })
        .collect::<Vec<_>>();

    gguf_files.sort();
    gguf_files.into_iter().next()
}

fn find_legacy_cleanup_file() -> Option<PathBuf> {
    let home_dir = env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));

    let legacy_models_dir = home_dir.join("llama.cpp").join("models");
    find_gguf_file(&legacy_models_dir)
}

fn emit_progress(app: &AppHandle, step: &str, message: &str) -> Result<()> {
    app.emit(
        LOCAL_SETUP_PROGRESS_EVENT,
        LocalSetupProgress {
            step: step.to_string(),
            message: message.to_string(),
        },
    )
    .context("failed to emit local setup progress event")
}
