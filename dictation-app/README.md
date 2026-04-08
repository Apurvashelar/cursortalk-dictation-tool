# Dictation App

Enterprise-first macOS desktop client for the Enterprise Voice Dictation project.

## Current status

This is the initial scaffold for Phase 2.

The intended first working pipeline is:

1. Global hotkey
2. Microphone capture
3. Local Parakeet transcription
4. Remote cleanup request to EC2 through an SSH tunnel
5. Clipboard paste into the active app

## Current prerequisites

The frontend files are scaffolded, but a runnable Tauri app still requires:

1. Rust toolchain (`rustup`, `cargo`, `rustc`)
2. Tauri system prerequisites for macOS
3. `npm install` to fetch JavaScript dependencies

## Planned layout

```text
dictation-app/
├── docs/
├── icons/
├── sounds/
├── src/
└── src-tauri/
```

