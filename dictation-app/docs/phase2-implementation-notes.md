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
9. recorded WAV files now run through Parakeet STT and then into the hosted cleanup path with fallback

## Current tested status

The following commands have been verified successfully:

1. `npm run build`
2. `cargo check`
3. `npm run tauri -- build --debug`
4. `python3 dictation-app/scripts/parakeet_transcribe.py --audio ... --model-dir ...`

Current output artifact:

1. `src-tauri/target/debug/bundle/macos/Enterprise Voice Dictation.app`

### Known limitation in this milestone

DMG packaging is deferred for now.

The Tauri bundle target is intentionally set to `app` during early development so Milestone A stays focused on a stable desktop bundle instead of distribution packaging.

## Current implementation milestone

Milestone D:

1. recorded WAV files are transcribed by a local Parakeet helper script
2. raw transcript and cleaned text are surfaced in the app UI
3. cleanup requests target the hosted `/clean` endpoint
4. if cleanup is unavailable, the app falls back to raw transcript automatically

## Immediate next implementation milestone

Milestone E:

1. surface the final cleaned text in a paste-ready output flow
2. add clipboard save / paste / restore
3. transition from diagnostic UI into real dictation interaction
4. validate the tunnel-backed `/clean` path during a live session
