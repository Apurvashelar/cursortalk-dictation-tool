#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_BUNDLE="${ROOT_DIR}/src-tauri/target/release/bundle/macos/CursorTalk.app"
PUBLIC_DOWNLOADS_DIR="${ROOT_DIR}/public/downloads"
OUTPUT_ZIP="${PUBLIC_DOWNLOADS_DIR}/CursorTalk-macOS.zip"

mkdir -p "${PUBLIC_DOWNLOADS_DIR}"

if [[ ! -d "${APP_BUNDLE}" ]]; then
  echo "Desktop bundle not found yet, skipping website download asset packaging:"
  echo "  ${APP_BUNDLE}"
  exit 0
fi

rm -f "${OUTPUT_ZIP}"

# Use ditto so the .app bundle stays macOS-installable after download.
ditto -c -k --sequesterRsrc --keepParent "${APP_BUNDLE}" "${OUTPUT_ZIP}"

echo "Prepared website download asset:"
echo "  ${OUTPUT_ZIP}"
