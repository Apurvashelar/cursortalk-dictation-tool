#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${ROOT_DIR}/src-tauri/bin"
TARGET_PATH="${TARGET_DIR}/llama-server"

SOURCE_CANDIDATES=()

if [[ -n "${CURSORTALK_LLAMA_SERVER_SOURCE:-}" ]]; then
  SOURCE_CANDIDATES+=("${CURSORTALK_LLAMA_SERVER_SOURCE}")
fi

if [[ -n "${VOICEFLOW_LLAMA_SERVER_SOURCE:-}" ]]; then
  SOURCE_CANDIDATES+=("${VOICEFLOW_LLAMA_SERVER_SOURCE}")
fi

SOURCE_CANDIDATES+=(
  "/Users/appe/llama.cpp/build/bin/llama-server"
  "/Users/appe/.docker/bin/inference/llama-server"
)

SOURCE_PATH=""
for candidate in "${SOURCE_CANDIDATES[@]}"; do
  if [[ -f "${candidate}" ]]; then
    SOURCE_PATH="${candidate}"
    break
  fi
done

if [[ -z "${SOURCE_PATH}" ]]; then
  echo "No llama-server binary was found for packaging." >&2
  echo "Set CURSORTALK_LLAMA_SERVER_SOURCE to a valid local llama-server binary path." >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
cp -f "${SOURCE_PATH}" "${TARGET_PATH}"
chmod +x "${TARGET_PATH}"

echo "Prepared bundled llama-server:"
echo "  ${TARGET_PATH}"
echo "Using source:"
echo "  ${SOURCE_PATH}"
