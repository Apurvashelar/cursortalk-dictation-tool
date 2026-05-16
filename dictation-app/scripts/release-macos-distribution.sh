#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TAURI_BUNDLE_DIR="${ROOT_DIR}/src-tauri/target/release/bundle"
DMG_DIR="${TAURI_BUNDLE_DIR}/dmg"
APP_DIR="${TAURI_BUNDLE_DIR}/macos/CursorTalk.app"
DIST_DIR="${ROOT_DIR}/dist/releases/macos"
WEBSITE_DOWNLOAD_PATH_DEFAULT="/Users/appe/Documents/Vibe-Coding/Whisper Flow Ent/cursortalk-website/public/downloads/CursorTalk.dmg"
WEBSITE_EXPORT_PATH_DEFAULT="/Users/appe/Documents/Vibe-Coding/Whisper Flow Ent/cursortalk-website/out/downloads/CursorTalk.dmg"

APPLE_NOTARY_MODE=""

function require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

function require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

require_command security
require_command xcrun
require_command npm

if [[ -z "${APPLE_SIGNING_IDENTITY:-}" ]]; then
  echo "Missing APPLE_SIGNING_IDENTITY." >&2
  echo "Example: export APPLE_SIGNING_IDENTITY='Developer ID Application: Your Name (TEAMID)'" >&2
  exit 1
fi

if [[ -n "${APPLE_API_ISSUER:-}" || -n "${APPLE_API_KEY:-}" || -n "${APPLE_API_KEY_PATH:-}" ]]; then
  require_env APPLE_API_ISSUER
  require_env APPLE_API_KEY
  require_env APPLE_API_KEY_PATH
  APPLE_NOTARY_MODE="appstoreconnect"
elif [[ -n "${APPLE_ID:-}" || -n "${APPLE_PASSWORD:-}" || -n "${APPLE_TEAM_ID:-}" ]]; then
  require_env APPLE_ID
  require_env APPLE_PASSWORD
  require_env APPLE_TEAM_ID
  APPLE_NOTARY_MODE="appleid"
else
  echo "Missing notarization credentials." >&2
  echo "Provide either APPLE_API_ISSUER/APPLE_API_KEY/APPLE_API_KEY_PATH or APPLE_ID/APPLE_PASSWORD/APPLE_TEAM_ID." >&2
  exit 1
fi

echo "Using signing identity:"
echo "  ${APPLE_SIGNING_IDENTITY}"
echo "Using notarization mode:"
echo "  ${APPLE_NOTARY_MODE}"

(
  cd "${ROOT_DIR}"
  npm run tauri:build:mac
)

mkdir -p "${DIST_DIR}"

DMG_SOURCE="$(find "${DMG_DIR}" -maxdepth 1 -name 'CursorTalk_*.dmg' | head -n 1)"
if [[ -z "${DMG_SOURCE}" ]]; then
  echo "Built DMG not found in ${DMG_DIR}" >&2
  exit 1
fi

cp -f "${DMG_SOURCE}" "${DIST_DIR}/CursorTalk.dmg"

echo "Validating app signature with spctl..."
spctl -a -vv "${APP_DIR}"

echo "Validating DMG notarization ticket..."
xcrun stapler validate "${DMG_SOURCE}"

WEBSITE_DOWNLOAD_PATH="${WEBSITE_DOWNLOAD_PATH:-$WEBSITE_DOWNLOAD_PATH_DEFAULT}"
WEBSITE_EXPORT_PATH="${WEBSITE_EXPORT_PATH:-$WEBSITE_EXPORT_PATH_DEFAULT}"

if [[ -d "$(dirname "${WEBSITE_DOWNLOAD_PATH}")" ]]; then
  cp -f "${DMG_SOURCE}" "${WEBSITE_DOWNLOAD_PATH}"
  echo "Updated website public download asset:"
  echo "  ${WEBSITE_DOWNLOAD_PATH}"
fi

if [[ -d "$(dirname "${WEBSITE_EXPORT_PATH}")" ]]; then
  cp -f "${DMG_SOURCE}" "${WEBSITE_EXPORT_PATH}"
  echo "Updated website exported download asset:"
  echo "  ${WEBSITE_EXPORT_PATH}"
fi

echo "Release DMG ready:"
echo "  ${DIST_DIR}/CursorTalk.dmg"
