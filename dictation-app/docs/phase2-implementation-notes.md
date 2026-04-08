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

Milestone B:

1. Tauri commands now expose app config and backend health
2. the setup screen now shows tunnel-aware health diagnostics
3. the settings screen now reflects the active Organization-mode backend
4. Personal mode remains visible but disabled

## Immediate next implementation milestone

Milestone C:

1. start the hotkey path
2. add microphone capture
3. create session-level recording state transitions
4. prepare the local Parakeet STT boundary
