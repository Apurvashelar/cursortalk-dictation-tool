# Phase 2 Implementation Notes

## What exists now

This scaffold establishes:

1. repository structure for the Tauri app
2. frontend shell for setup and settings
3. Rust module placeholders
4. local git initialization in the workspace root
5. working Node and Rust toolchain setup on this machine
6. successful frontend build, Rust check, and Tauri `.app` bundle build
7. Organization-mode backend diagnostics wired through Tauri commands
8. recording session state, hotkey toggle path, and microphone capture foundation

## Current tested status

The following commands have been verified successfully:

1. `npm run build`
2. `cargo check`
3. `npm run tauri -- build --debug`

Current output artifact:

1. `src-tauri/target/debug/bundle/macos/Enterprise Voice Dictation.app`

### Known limitation in this milestone

DMG packaging is deferred for now.

The Tauri bundle target is intentionally set to `app` during early development so Milestone A stays focused on a stable desktop bundle instead of distribution packaging.

## Current implementation milestone

Milestone C:

1. the app now exposes live recording session state through Tauri commands and events
2. a global toggle hotkey is registered for starting and stopping recording
3. microphone capture writes a WAV file to a local temp recordings directory
4. the STT boundary is represented explicitly so Parakeet integration can land next

## Immediate next implementation milestone

Milestone D:

1. wire the recorded audio into the Parakeet STT path
2. move session state from `transcribing` placeholder to real transcript output
3. connect raw transcript output to the remote cleanup request
4. preserve raw-transcript fallback behavior when cleanup fails
