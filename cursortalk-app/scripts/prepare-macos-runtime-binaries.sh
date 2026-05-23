#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${ROOT_DIR}/src-tauri/bin/llama-runtime"
BUILD_DIR="${CURSORTALK_LLAMA_SERVER_BUILD_DIR:-/private/tmp/cursortalk-llama-runtime-build}"
LLAMA_CPP_ROOT="${CURSORTALK_LLAMA_CPP_ROOT:-/Users/appe/llama.cpp}"
DEPLOYMENT_TARGET="${CURSORTALK_LLAMA_DEPLOYMENT_TARGET:-14.0}"

RUNTIME_FILES=(
  "llama-server"
  "libmtmd.0.dylib"
  "libllama.0.dylib"
  "libggml.0.dylib"
  "libggml-cpu.0.dylib"
  "libggml-blas.0.dylib"
  "libggml-metal.0.dylib"
  "libggml-base.0.dylib"
)

function require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

function ensure_llama_cpp_root() {
  if [[ ! -d "${LLAMA_CPP_ROOT}" ]]; then
    echo "llama.cpp source root not found at ${LLAMA_CPP_ROOT}" >&2
    echo "Set CURSORTALK_LLAMA_CPP_ROOT to a valid llama.cpp checkout." >&2
    exit 1
  fi
}

function configure_and_build_runtime() {
  rm -rf "${BUILD_DIR}"
  mkdir -p "${BUILD_DIR}"

  cmake -S "${LLAMA_CPP_ROOT}" -B "${BUILD_DIR}" \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=ON \
    -DLLAMA_OPENSSL=OFF \
    -DCMAKE_OSX_DEPLOYMENT_TARGET="${DEPLOYMENT_TARGET}"

  cmake --build "${BUILD_DIR}" --config Release --target llama-server -j
}

function patch_runtime_rpath() {
  local file="$1"
  local original_rpath="$2"

  if otool -l "${file}" | grep -q "${original_rpath}"; then
    install_name_tool -delete_rpath "${original_rpath}" "${file}"
  fi

  if ! otool -l "${file}" | grep -q "@executable_path"; then
    install_name_tool -add_rpath "@executable_path" "${file}"
  fi
}

function stage_runtime_files() {
  local build_bin_dir="${BUILD_DIR}/bin"

  mkdir -p "${TARGET_DIR}"
  rm -f "${TARGET_DIR}"/*

  for runtime_file in "${RUNTIME_FILES[@]}"; do
    if [[ ! -e "${build_bin_dir}/${runtime_file}" ]]; then
      echo "Expected runtime file missing from build output: ${build_bin_dir}/${runtime_file}" >&2
      exit 1
    fi

    cp -fL "${build_bin_dir}/${runtime_file}" "${TARGET_DIR}/${runtime_file}"
    chmod +x "${TARGET_DIR}/${runtime_file}" || true
    xattr -cr "${TARGET_DIR}/${runtime_file}" || true
  done

  patch_runtime_rpath "${TARGET_DIR}/llama-server" "${build_bin_dir}"

  for runtime_file in "${RUNTIME_FILES[@]:1}"; do
    patch_runtime_rpath "${TARGET_DIR}/${runtime_file}" "${build_bin_dir}"
  done
}

function print_build_info() {
  echo "Prepared portable local cleanup runtime:"
  echo "  ${TARGET_DIR}"
  echo "Using llama.cpp source:"
  echo "  ${LLAMA_CPP_ROOT}"
  echo "Build directory:"
  echo "  ${BUILD_DIR}"
  echo "Deployment target:"
  echo "  ${DEPLOYMENT_TARGET}"
}

require_command cmake
require_command install_name_tool
require_command otool
require_command xattr

ensure_llama_cpp_root
configure_and_build_runtime
stage_runtime_files
print_build_info
