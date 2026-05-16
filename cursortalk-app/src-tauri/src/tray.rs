use tauri::{image::Image, AppHandle};

pub const TRAY_ICON_ID: &str = "dictation-tray";

const IDLE: &str = "idle";
const RECORDING: &str = "recording";
const PROCESSING: &str = "processing";
const DONE: &str = "done";
const ERROR: &str = "error";

#[cfg(target_os = "macos")]
const IDLE_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-idle-dark-44@2x.png"
));
#[cfg(target_os = "macos")]
const IDLE_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-idle-light-44@2x.png"
));
#[cfg(target_os = "macos")]
const RECORDING_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-recording-dark-44@2x.png"
));
#[cfg(target_os = "macos")]
const RECORDING_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-recording-light-44@2x.png"
));
#[cfg(target_os = "macos")]
const PROCESSING_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-processing-dark-44@2x.png"
));
#[cfg(target_os = "macos")]
const PROCESSING_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-processing-light-44@2x.png"
));
#[cfg(target_os = "macos")]
const DONE_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-done-dark-44@2x.png"
));
#[cfg(target_os = "macos")]
const DONE_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-done-light-44@2x.png"
));
#[cfg(target_os = "macos")]
const ERROR_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-error-dark-44@2x.png"
));
#[cfg(target_os = "macos")]
const ERROR_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-error-light-44@2x.png"
));

#[cfg(target_os = "windows")]
const IDLE_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-idle-dark-32@2x.png"
));
#[cfg(target_os = "windows")]
const IDLE_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-idle-light-32@2x.png"
));
#[cfg(target_os = "windows")]
const RECORDING_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-recording-dark-32@2x.png"
));
#[cfg(target_os = "windows")]
const RECORDING_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-recording-light-32@2x.png"
));
#[cfg(target_os = "windows")]
const PROCESSING_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-processing-dark-32@2x.png"
));
#[cfg(target_os = "windows")]
const PROCESSING_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-processing-light-32@2x.png"
));
#[cfg(target_os = "windows")]
const DONE_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-done-dark-32@2x.png"
));
#[cfg(target_os = "windows")]
const DONE_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-done-light-32@2x.png"
));
#[cfg(target_os = "windows")]
const ERROR_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-error-dark-32@2x.png"
));
#[cfg(target_os = "windows")]
const ERROR_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-error-light-32@2x.png"
));

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
const IDLE_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-idle-dark-32@2x.png"
));
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
const IDLE_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-idle-light-32@2x.png"
));
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
const RECORDING_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-recording-dark-32@2x.png"
));
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
const RECORDING_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-recording-light-32@2x.png"
));
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
const PROCESSING_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-processing-dark-32@2x.png"
));
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
const PROCESSING_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-processing-light-32@2x.png"
));
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
const DONE_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-done-dark-32@2x.png"
));
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
const DONE_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-done-light-32@2x.png"
));
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
const ERROR_DARK_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-error-dark-32@2x.png"
));
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
const ERROR_LIGHT_BYTES: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/icons/tray/tray-error-light-32@2x.png"
));

#[cfg(target_os = "macos")]
pub fn initial_icon() -> tauri::Result<Image<'static>> {
    Ok(Image::from_bytes(IDLE_DARK_BYTES)?.to_owned())
}

#[cfg(not(target_os = "macos"))]
pub fn initial_icon() -> tauri::Result<Image<'static>> {
    load_icon(IDLE)
}

pub fn update_tray_icon(app: &AppHandle, state: &str) {
    let Some(tray) = app.tray_by_id(TRAY_ICON_ID) else {
        return;
    };

    let icon = match load_icon(state) {
        Ok(icon) => icon,
        Err(error) => {
            eprintln!("failed to load tray icon for state {state}: {error}");
            return;
        }
    };

    if let Err(error) = tray.set_icon(Some(icon)) {
        eprintln!("failed to update tray icon: {error}");
    }
}

fn load_icon(state: &str) -> tauri::Result<Image<'static>> {
    Ok(Image::from_bytes(icon_bytes(normalize_state(state), system_uses_dark_mode()))?.to_owned())
}

fn normalize_state(state: &str) -> &'static str {
    match state {
        RECORDING => RECORDING,
        PROCESSING => PROCESSING,
        DONE => DONE,
        ERROR => ERROR,
        _ => IDLE,
    }
}

fn icon_bytes(state: &str, dark_mode: bool) -> &'static [u8] {
    match (state, dark_mode) {
        (RECORDING, true) => RECORDING_DARK_BYTES,
        (RECORDING, false) => RECORDING_LIGHT_BYTES,
        (PROCESSING, true) => PROCESSING_DARK_BYTES,
        (PROCESSING, false) => PROCESSING_LIGHT_BYTES,
        (DONE, true) => DONE_DARK_BYTES,
        (DONE, false) => DONE_LIGHT_BYTES,
        (ERROR, true) => ERROR_DARK_BYTES,
        (ERROR, false) => ERROR_LIGHT_BYTES,
        (_, true) => IDLE_DARK_BYTES,
        _ => IDLE_LIGHT_BYTES,
    }
}

#[cfg(target_os = "macos")]
fn system_uses_dark_mode() -> bool {
    use objc2::msg_send;
    use objc2::rc::Retained;
    use objc2_app_kit::NSApplication;
    use objc2_foundation::{MainThreadMarker, NSArray, NSString};

    unsafe {
        let appearances: Vec<Retained<NSString>> = vec![
            NSString::from_str("NSAppearanceNameAqua"),
            NSString::from_str("NSAppearanceNameDarkAqua"),
        ];
        let Some(mtm) = MainThreadMarker::new() else {
            return true;
        };
        let app = NSApplication::sharedApplication(mtm);
        let has_theme: bool =
            msg_send![&*app, respondsToSelector: objc2::sel!(effectiveAppearance)];
        if !has_theme {
            return true;
        }

        let name: Retained<NSString> = msg_send![
            &*app.effectiveAppearance(),
            bestMatchFromAppearancesWithNames: &*NSArray::from_retained_slice(&appearances)
        ];

        name.to_string() == "NSAppearanceNameDarkAqua"
    }
}

#[cfg(target_os = "windows")]
fn system_uses_dark_mode() -> bool {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let personalize = match hkcu
        .open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize")
    {
        Ok(key) => key,
        Err(_) => return false,
    };

    match personalize.get_value::<u32, _>("AppsUseLightTheme") {
        Ok(value) => value == 0,
        Err(_) => false,
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn system_uses_dark_mode() -> bool {
    false
}
