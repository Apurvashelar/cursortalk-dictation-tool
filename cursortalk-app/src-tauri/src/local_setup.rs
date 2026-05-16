use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

use anyhow::{anyhow, Context, Result};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::config::AppConfig;

pub const LOCAL_SETUP_PROGRESS_EVENT: &str = "local-setup-progress";

const STT_REQUIRED_FILES: [&str; 4] = [
    "encoder.int8.onnx",
    "decoder.int8.onnx",
    "joiner.int8.onnx",
    "tokens.txt",
];
const STT_DOWNLOAD_URL: &str =
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2";
const STT_ARCHIVE_FILE_NAME: &str = "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2";
const STT_ARCHIVE_ROOT_DIR: &str = "sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8";
const CLEANUP_MODEL_FILE_NAME: &str = "dictation-cleanup-q4km.gguf";
const DEFAULT_CLEANUP_DOWNLOAD_URL: &str =
    "https://github.com/Apurvashelar/cursortalk-dictation-tool/releases/download/local-models/dictation-cleanup-q4km.gguf";
const CLEANUP_DOWNLOAD_URL_ENV: &str = "CURSORTALK_LOCAL_CLEANUP_MODEL_URL";
const LEGACY_CLEANUP_DOWNLOAD_URL_ENV: &str = "VOICEFLOW_LOCAL_CLEANUP_MODEL_URL";
const STORAGE_DIR_NAME: &str = "CursorTalk";
const LEGACY_STORAGE_DIR_NAME: &str = "VoiceFlow Desktop";

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

    let downloads_dir = initial.storage_path.join("downloads");
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
            download_and_install_stt_model(&downloads_dir, &current.canonical_stt_dir)?;
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
        } else if let Some(download_url) = cleanup_download_url() {
            download_and_install_cleanup_model(
                &download_url,
                &downloads_dir,
                &current.canonical_cleanup_dir,
            )?;
        } else {
            return Err(anyhow!(
                "Cleanup model source was not found. Place {} in the project models folder or Desktop, or set {} to a downloadable URL.",
                CLEANUP_MODEL_FILE_NAME,
                CLEANUP_DOWNLOAD_URL_ENV
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
    let workspace_cleanup_file = find_workspace_cleanup_file();
    let desktop_cleanup_file = find_desktop_cleanup_file();
    let legacy_cleanup_file = find_legacy_cleanup_file();
    let cleanup_source_file = canonical_cleanup_file
        .clone()
        .or_else(|| workspace_cleanup_file.clone())
        .or_else(|| desktop_cleanup_file.clone())
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
    fs::create_dir_all(storage_path.join("logs"))
        .context("failed to create local logs directory")?;
    Ok(())
}

fn download_and_install_stt_model(downloads_dir: &Path, target_dir: &Path) -> Result<()> {
    let archive_path = downloads_dir.join(STT_ARCHIVE_FILE_NAME);
    let extracted_root = downloads_dir.join(STT_ARCHIVE_ROOT_DIR);

    download_file(STT_DOWNLOAD_URL, &archive_path, "speech model archive")?;

    if extracted_root.exists() {
        fs::remove_dir_all(&extracted_root)
            .with_context(|| format!("failed to clear {}", extracted_root.display()))?;
    }

    run_process(
        Command::new("tar")
            .arg("-xjf")
            .arg(&archive_path)
            .arg("-C")
            .arg(downloads_dir),
        "extract speech model archive",
    )?;

    if !required_stt_files_exist(&extracted_root) {
        return Err(anyhow!(
            "Speech model archive extracted, but the expected Parakeet files were not found."
        ));
    }

    copy_required_stt_files(&extracted_root, target_dir)?;

    let _ = fs::remove_dir_all(&extracted_root);
    let _ = fs::remove_file(&archive_path);

    Ok(())
}

fn download_and_install_cleanup_model(
    download_url: &str,
    downloads_dir: &Path,
    target_dir: &Path,
) -> Result<()> {
    let downloaded_path = downloads_dir.join(CLEANUP_MODEL_FILE_NAME);
    let target_path = target_dir.join(CLEANUP_MODEL_FILE_NAME);

    download_file(download_url, &downloaded_path, "cleanup model")?;
    move_or_copy_file(&downloaded_path, &target_path)?;

    let _ = fs::remove_file(&downloaded_path);
    Ok(())
}

fn link_required_stt_files(source_dir: &Path, target_dir: &Path) -> Result<()> {
    for file_name in STT_REQUIRED_FILES {
        let source = source_dir.join(file_name);
        let target = target_dir.join(file_name);

        if !source.exists() {
            return Err(anyhow!(
                "speech model file is missing: {}",
                source.display()
            ));
        }

        ensure_linked_file(&source, &target)?;
    }

    Ok(())
}

fn copy_required_stt_files(source_dir: &Path, target_dir: &Path) -> Result<()> {
    for file_name in STT_REQUIRED_FILES {
        let source = source_dir.join(file_name);
        let target = target_dir.join(file_name);

        if !source.exists() {
            return Err(anyhow!(
                "speech model file is missing: {}",
                source.display()
            ));
        }

        move_or_copy_file(&source, &target)?;
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

fn move_or_copy_file(source: &Path, target: &Path) -> Result<()> {
    if target.exists() || target.symlink_metadata().is_ok() {
        if target.is_dir() {
            fs::remove_dir_all(target)
                .with_context(|| format!("failed to replace directory {}", target.display()))?;
        } else {
            fs::remove_file(target)
                .with_context(|| format!("failed to replace file {}", target.display()))?;
        }
    }

    match fs::rename(source, target) {
        Ok(()) => Ok(()),
        Err(_) => {
            fs::copy(source, target).with_context(|| {
                format!(
                    "failed to copy local setup file from {} to {}",
                    source.display(),
                    target.display()
                )
            })?;
            Ok(())
        }
    }
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

fn download_file(url: &str, target_path: &Path, label: &str) -> Result<()> {
    let partial_path = target_path.with_extension("part");

    if partial_path.exists() {
        fs::remove_file(&partial_path)
            .with_context(|| format!("failed to clear {}", partial_path.display()))?;
    }

    run_process(
        Command::new("curl")
            .arg("-L")
            .arg("--fail")
            .arg("--silent")
            .arg("--show-error")
            .arg("-o")
            .arg(&partial_path)
            .arg(url),
        &format!("download {label}"),
    )?;

    if target_path.exists() {
        fs::remove_file(target_path)
            .with_context(|| format!("failed to replace {}", target_path.display()))?;
    }

    fs::rename(&partial_path, target_path)
        .with_context(|| format!("failed to finalize {}", target_path.display()))?;
    Ok(())
}

fn run_process(command: &mut Command, label: &str) -> Result<()> {
    let output = command
        .output()
        .with_context(|| format!("failed to {label}"))?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let detail = if !stderr.trim().is_empty() {
        stderr.trim().to_string()
    } else if !stdout.trim().is_empty() {
        stdout.trim().to_string()
    } else {
        "command failed without additional output".to_string()
    };

    Err(anyhow!("Failed to {label}: {detail}"))
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
    let metadata_json = serde_json::to_string_pretty(&metadata)
        .context("failed to serialize local setup metadata")?;
    fs::write(&metadata_path, metadata_json)
        .with_context(|| format!("failed to write {}", metadata_path.display()))?;
    Ok(())
}

pub fn default_storage_path() -> PathBuf {
    let home_dir = env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));

    let application_support_dir = home_dir
        .join("Library")
        .join("Application Support");
    let storage_path = application_support_dir.join(STORAGE_DIR_NAME);
    let legacy_storage_path = application_support_dir.join(LEGACY_STORAGE_DIR_NAME);

    if storage_path.exists() {
        return storage_path;
    }

    if legacy_storage_path.exists() {
        if fs::rename(&legacy_storage_path, &storage_path).is_ok() && storage_path.exists() {
            return storage_path;
        }

        return legacy_storage_path;
    }

    storage_path
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
    gguf_files
        .iter()
        .find(|path| {
            path.file_name()
                .and_then(|file_name| file_name.to_str())
                .map(|file_name| file_name == CLEANUP_MODEL_FILE_NAME)
                .unwrap_or(false)
        })
        .cloned()
        .or_else(|| gguf_files.into_iter().next())
}

fn find_workspace_cleanup_file() -> Option<PathBuf> {
    let workspace_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../Models")
        .join(CLEANUP_MODEL_FILE_NAME);

    workspace_path.exists().then_some(workspace_path)
}

fn find_desktop_cleanup_file() -> Option<PathBuf> {
    let home_dir = env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));
    let desktop_path = home_dir.join("Desktop").join(CLEANUP_MODEL_FILE_NAME);
    desktop_path.exists().then_some(desktop_path)
}

fn find_legacy_cleanup_file() -> Option<PathBuf> {
    let home_dir = env::var("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."));

    let legacy_models_dir = home_dir.join("llama.cpp").join("models");
    find_gguf_file(&legacy_models_dir)
}

fn cleanup_download_url() -> Option<String> {
    env::var(CLEANUP_DOWNLOAD_URL_ENV)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .or_else(|| {
            env::var(LEGACY_CLEANUP_DOWNLOAD_URL_ENV)
                .ok()
                .map(|value| value.trim().to_string())
                .filter(|value| !value.is_empty())
        })
        .or_else(|| Some(DEFAULT_CLEANUP_DOWNLOAD_URL.to_string()))
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
