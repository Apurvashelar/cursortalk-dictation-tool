#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE_DIR="${ROOT_DIR}/src-tauri/target/release/bundle"

rm -rf "${BUNDLE_DIR}/macos"
rm -rf "${BUNDLE_DIR}/dmg"

echo "Cleaned stale macOS bundle artifacts:"
echo "  ${BUNDLE_DIR}/macos"
echo "  ${BUNDLE_DIR}/dmg"
