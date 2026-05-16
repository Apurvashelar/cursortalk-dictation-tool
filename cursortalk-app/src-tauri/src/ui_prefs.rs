use std::fs;
use std::path::PathBuf;

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

use crate::local_setup;

const UI_PREFS_FILE_NAME: &str = "ui-preferences.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiPreferences {
    pub show_in_dock: bool,
    #[serde(default)]
    pub show_in_dock_initialized: bool,
}

impl Default for UiPreferences {
    fn default() -> Self {
        Self {
            show_in_dock: true,
            show_in_dock_initialized: false,
        }
    }
}

impl UiPreferences {
    pub fn resolved_show_in_dock(&self) -> bool {
        if self.show_in_dock_initialized {
            self.show_in_dock
        } else {
            true
        }
    }
}

pub fn load() -> UiPreferences {
    let prefs_path = prefs_path();
    let Ok(contents) = fs::read_to_string(&prefs_path) else {
        return UiPreferences::default();
    };

    serde_json::from_str(&contents).unwrap_or_default()
}

pub fn save(prefs: &UiPreferences) -> Result<()> {
    let storage_path = local_setup::default_storage_path();
    fs::create_dir_all(&storage_path)
        .with_context(|| format!("failed to create {}", storage_path.display()))?;

    let prefs_json =
        serde_json::to_string_pretty(prefs).context("failed to serialize ui preferences")?;
    let prefs_path = prefs_path();
    fs::write(&prefs_path, prefs_json)
        .with_context(|| format!("failed to write {}", prefs_path.display()))?;
    Ok(())
}

fn prefs_path() -> PathBuf {
    local_setup::default_storage_path().join(UI_PREFS_FILE_NAME)
}
