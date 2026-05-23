#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI_BUNDLE_DIR="${ROOT_DIR}/src-tauri/target/release/bundle"
APP_BUNDLE="${TAURI_BUNDLE_DIR}/macos/CursorTalk.app"
FRAMEWORKS_DIR="${APP_BUNDLE}/Contents/Frameworks"
MACOS_DIR="${APP_BUNDLE}/Contents/MacOS"
DIST_DIR="${ROOT_DIR}/dist/releases/macos"
DMG_PATH="${DIST_DIR}/CursorTalk.dmg"
VOLUME_NAME="CursorTalk"
STAGING_DIR=""

function cleanup() {
  if [[ -n "${STAGING_DIR}" && -d "${STAGING_DIR}" ]]; then
    rm -rf "${STAGING_DIR}"
  fi
}

trap cleanup EXIT

function require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_command codesign
require_command hdiutil
require_command xattr
require_command npm

(
  cd "${ROOT_DIR}"
  npm run clean-macos-bundles
  npm run prepare:macos-runtime
  npm run tauri build -- --bundles app
)

if [[ ! -d "${APP_BUNDLE}" ]]; then
  echo "Built app bundle not found at ${APP_BUNDLE}" >&2
  exit 1
fi

mkdir -p "${DIST_DIR}"
rm -f "${DMG_PATH}"
STAGING_DIR="$(mktemp -d /private/tmp/cursortalk-dmg-staging-XXXXXX)"

echo "Preparing unsigned distribution app bundle..."
xattr -cr "${APP_BUNDLE}"

if [[ -d "${FRAMEWORKS_DIR}" ]]; then
  while IFS= read -r dylib; do
    codesign --force --sign - --timestamp=none "${dylib}"
  done < <(find "${FRAMEWORKS_DIR}" -maxdepth 1 -type f -name '*.dylib' | sort)
fi

if [[ -d "${MACOS_DIR}" ]]; then
  while IFS= read -r helper; do
    chmod +x "${helper}"
    codesign --force --sign - --timestamp=none "${helper}"
  done < <(find "${MACOS_DIR}" -maxdepth 1 -type f \( -name 'llama-server' -o -name 'llama-server-*' \) | sort)
fi

# Keep the unsigned distribution on a plain ad-hoc signature.
# Hardened runtime triggers library validation against the bundled native dylibs,
# which breaks launch on machines that do not share a Developer ID team signature.
codesign --force --sign - --deep --timestamp=none "${APP_BUNDLE}"
codesign --verify --deep --strict --verbose=2 "${APP_BUNDLE}"

echo "Creating DMG staging directory..."
cp -R "${APP_BUNDLE}" "${STAGING_DIR}/CursorTalk.app"
ln -s /Applications "${STAGING_DIR}/Applications"
xattr -cr "${STAGING_DIR}/CursorTalk.app"

echo "Building DMG..."
hdiutil create \
  -volname "${VOLUME_NAME}" \
  -srcfolder "${STAGING_DIR}" \
  -ov \
  -format UDZO \
  -fs HFS+ \
  "${DMG_PATH}"

echo "Unsigned DMG ready:"
echo "  ${DMG_PATH}"
