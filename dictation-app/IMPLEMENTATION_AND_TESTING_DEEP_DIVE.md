# VoiceFlow Desktop: Detailed Implementation and Testing Guide

## Purpose

This document explains the current desktop application in detail:

- what each major part does
- how each part works
- how to test each part
- why this implementation approach was chosen
- what alternatives existed
- what is still missing before the app becomes fully production-ready

This file is written to be understandable to a non-technical stakeholder, while still being precise enough for engineering use.

---

## 1. What the Product Is

VoiceFlow Desktop is a desktop dictation application.

Its job is simple from the user’s point of view:

1. Listen when the user starts dictation.
2. Convert speech into text.
3. Clean that text into better written output.
4. Paste the result into the app where the user’s cursor is active.

The app supports two operating models:

- Local mode
- Enterprise mode

### Local mode

In local mode, the speech-to-text and cleanup resources are prepared on the user’s machine and used locally.

### Enterprise mode

In enterprise mode, the desktop app still captures audio locally, but the cleanup stage uses a remote backend service.

---

## 2. High-Level Architecture

The product is split into two major layers:

## Frontend

This is the visible app interface:

- onboarding
- Home
- Settings
- Diagnostics
- account flows
- pill UI

Technically, it is built with:

- React
- TypeScript
- Vite

## Native/Desktop Runtime

This is the system-facing layer that makes the app behave like a desktop utility:

- microphone recording
- permissions checks
- paste into active apps
- tray/menu bar
- global hotkey
- Dock behavior
- packaged app behavior
- file persistence

Technically, it is built with:

- Tauri v2
- Rust

### Why this architecture was chosen

This was the correct choice because:

- React gives fast UI iteration and maintainable screens.
- Rust gives direct desktop/runtime control.
- Tauri is lighter than Electron and more aligned with a native utility app.

### Alternatives that existed

- Electron
- fully native macOS app in Swift
- a browser-based app plus helper binary

### Why those alternatives were not chosen

- Electron would be heavier for a tray-first dictation utility.
- Swift-only would slow down UI iteration and cross-platform plans.
- browser + helper split would complicate installation and runtime coordination.

---

## 3. Main User Flows

## 3.1 First-Time Onboarding

The onboarding flow currently has these logical steps:

1. Welcome
2. Auth
3. Mode selection
4. Local setup or organization setup
5. Permissions
6. Test dictation
7. Enter Home

### Why onboarding exists

Without onboarding, users would hit a desktop app that requires:

- microphone access
- accessibility access
- model/runtime setup
- server configuration in enterprise mode

That would be confusing and cause failures later.

### Why this onboarding approach was chosen

The onboarding sequence is a guided readiness flow. It ensures the app is usable before landing on Home.

### Other possible approaches

- ask for everything only when the user first hits Home
- use a single long setup form
- defer permissions until dictation fails

### Why those approaches were rejected

- They produce a confusing first-use experience.
- They push failures later into normal usage.
- They make support/debugging harder.

### How to test onboarding

#### Local onboarding

1. Open the app.
2. Use `Settings -> Advanced -> Restart onboarding` if needed.
3. Choose Local mode.
4. Confirm local setup runs or detects existing setup.
5. Confirm microphone permission is prompted during onboarding.
6. Confirm accessibility permission can be checked/opened.
7. Run onboarding test dictation.
8. Confirm:
   - recording pill appears
   - processing pill appears
   - done/error pill appears
9. Finish onboarding.
10. Confirm the app lands on Home.

#### Enterprise onboarding

1. Restart onboarding.
2. Choose Enterprise mode.
3. Enter the organization server URL.
4. Click `Check connection`.
5. Confirm connection health is shown correctly.
6. Confirm permissions are requested at the right step.
7. Run test dictation.
8. Confirm completion lands on Home.

---

## 4. Local Mode

## 4.1 What local mode does

Local mode allows the app to work without an enterprise server for the main local setup path.

The app prepares:

- speech model files
- cleanup model files
- local metadata about setup state

## 4.2 Where local mode files live

Canonical storage path:

- `~/Library/Application Support/VoiceFlow Desktop`

Inside that path:

- `models/stt`
- `models/cleanup`
- `downloads`
- `local-setup.json`
- `ui-preferences.json`
- `auth-session.json` (auth metadata only)

Auth token storage now uses secure OS credential storage instead of plain file storage.

### STT model location

Canonical STT model folder:

- `~/Library/Application Support/VoiceFlow Desktop/models/stt`

Expected required STT files:

- `encoder.int8.onnx`
- `decoder.int8.onnx`
- `joiner.int8.onnx`
- `tokens.txt`

### Cleanup model location

Canonical cleanup model folder:

- `~/Library/Application Support/VoiceFlow Desktop/models/cleanup`

Expected cleanup file:

- `dictation-cleanup-q4km.gguf`

### Fallback search locations for cleanup model

Before downloading, the setup code also checks:

- workspace model file:
  - `Production/Desktop Client/Models/dictation-cleanup-q4km.gguf`
- Desktop:
  - `~/Desktop/dictation-cleanup-q4km.gguf`
- legacy folder:
  - `~/llama.cpp/models`

### Why this approach was chosen

This approach makes local setup deterministic:

- one canonical storage location
- clear setup metadata
- ability to reuse already downloaded assets

### Other possible approaches

- keep models inside the app bundle
- keep models in arbitrary user-selected folders
- download every model every time

### Why those approaches were rejected

- app bundle storage is not flexible for updates and can bloat distribution
- arbitrary folders create reliability and support problems
- repeated downloads are inefficient and fragile

### How to test local mode

1. Restart onboarding.
2. Choose Local mode.
3. Let setup run.
4. Confirm setup completes.
5. Check the storage path on disk.
6. Confirm model files exist under:
   - `~/Library/Application Support/VoiceFlow Desktop/models/stt`
   - `~/Library/Application Support/VoiceFlow Desktop/models/cleanup`
7. Run test dictation.
8. Finish onboarding.
9. On Home, run a real dictation.
10. Confirm recent dictations update.

---

## 5. Enterprise Mode

## 5.1 What enterprise mode does

Enterprise mode uses a remote backend for cleanup/server-driven behavior.

The user provides:

- server URL
- optional API key

The app verifies:

- backend health endpoint
- cleanup endpoint availability

## 5.2 Why enterprise mode exists

This allows organizations to:

- centralize cleanup logic
- control model/runtime policies
- evolve backend behavior without shipping a new desktop client every time

### Why this approach was chosen

The desktop app remains lightweight in enterprise scenarios while still controlling local capture, UI, tray, hotkey, permissions, and paste behavior.

### Alternatives that existed

- fully local-only product
- fully remote product where even recording/STT are remote
- manual enterprise config with no validation

### Why those approaches were rejected

- local-only would not satisfy enterprise deployment needs
- fully remote would hurt desktop responsiveness and privacy positioning
- blind enterprise toggles would create broken runtime states

### How to test enterprise mode

1. Ensure backend is reachable.
2. Open `Settings -> General`.
3. Switch to Enterprise.
4. Confirm app redirects to organization setup if config is missing.
5. Enter base URL.
6. Click `Check connection`.
7. Confirm status changes to connected/healthy or degraded as appropriate.
8. Run test dictation.
9. Finish onboarding or return to Home.
10. Run a real dictation and confirm it completes successfully.

### Production-ready enterprise note

Today, enterprise mode is operational, but not yet fully production-hardened because:

- production domain deployment is still pending
- server-side auth enforcement needs hardening
- retry/reconnect behavior needs final polish

---

## 6. Dictation Runtime

## 6.1 What happens during a dictation

The runtime flow is:

1. Recording
2. Transcribing
3. Cleaning
4. Pasting
5. Idle or Error

### Recording

Audio is captured from the selected microphone.

### Transcribing

Recorded speech is turned into raw text.

### Cleaning

Raw transcript is cleaned into more usable final text.

### Pasting

The final text is placed where the user’s cursor is active.

### Why this staged runtime exists

It gives:

- clearer UX
- more debuggable state transitions
- better diagnostics and logging

### Other possible approaches

- hide all internal stages
- show only a spinner
- run cleanup and paste without explicit state tracking

### Why those approaches were rejected

- less transparency during failures
- harder debugging
- harder to build tray/pill/diagnostics correctly

### How to test the dictation runtime

1. Open Home.
2. Click `Start dictation`.
3. Speak clearly.
4. Stop dictation.
5. Confirm:
   - recording pill
   - processing pill
   - done pill
6. Place cursor in another app.
7. Trigger hotkey.
8. Confirm text pastes into target app.

### Failure tests

1. Deny accessibility.
2. Confirm paste fails and app surfaces error.
3. Disconnect enterprise backend in enterprise mode.
4. Confirm enterprise error handling behaves correctly.

---

## 7. Dictation Logging and Recent Dictations

## 7.1 What is logged

The app keeps a local dictation history including:

- timestamp
- mode
- transcript/final output
- latency values
- success/fallback/error state

### Why this exists

It powers:

- recent dictations on Home
- activity stats
- diagnostics/debugging

### Why local JSONL-style logging was chosen

It is:

- simple
- easy to inspect
- resilient
- sufficient for desktop-local activity history

### Alternatives

- SQLite
- browser-only localStorage
- no persistent logging

### Why those were not chosen initially

- SQLite would add more complexity than needed for the current use case
- browser localStorage is the wrong source of truth for desktop runtime activity
- no persistence would weaken the Home screen and support story

### How to test logging

1. Run a successful dictation.
2. Return to Home.
3. Confirm it appears in Recent dictations.
4. Confirm timestamps and copy action work.
5. Check activity stats update.
6. Use `Settings -> Advanced -> Clear logs`.
7. Confirm recent dictations and stats reset.

---

## 8. Pill / Overlay

## 8.1 What the pill does

The pill is the floating status indicator that appears during dictation.

Current stages:

- Recording
- Processing
- Done
- Error

### Why this design exists

The app is meant to behave like a desktop utility that stays out of the way. The pill provides status without pulling the full app forward.

### Why this approach was chosen

It is:

- compact
- desktop-native in feel
- visible enough for trust
- suitable for typing into other apps

### Alternatives

- modal progress window
- large overlay card
- no visual feedback

### Why those were rejected

- modal windows are disruptive
- large cards feel like a web app overlay, not a utility
- no feedback causes uncertainty

### How to test the pill

1. Start dictation.
2. Confirm recording pill appears.
3. Stop dictation.
4. Confirm processing pill appears.
5. Confirm done pill appears after success.
6. Confirm idle tray/top icon returns after timeout.
7. Trigger a real failure and confirm error pill appears.

---

## 9. Tray, Menu Bar, Dock, and Launch Behavior

## 9.1 Tray / Menu Bar

The app is designed to behave like a tray/menu-bar utility.

Implemented:

- tray icon
- tray menu
- tray state changes
- hide-to-tray on close

### Why this approach was chosen

This is the correct model for a dictation utility. Users do not need a constantly open full window.

### Alternatives

- normal always-open desktop app
- dock-first app with no tray/menu bar behavior

### Why those were rejected

- they do not fit the product’s ambient workflow

### How to test tray behavior

1. Open app.
2. Close main window.
3. Confirm app stays running.
4. Reopen from tray.
5. Quit from tray and confirm full exit.

## 9.2 Dock behavior

The app supports a `Show in dock` setting.

### Why this exists

Some users want normal macOS dock visibility; others want a quieter tray-first utility.

### How to test Dock behavior

1. Turn `Show in dock` on.
2. Quit app.
3. Reopen from Finder.
4. Confirm Dock icon appears on first launch.
5. Turn it off.
6. Quit and reopen.
7. Confirm Dock icon stays hidden.

## 9.3 Launch at login

The app can be set to open automatically when the user logs into macOS.

### Why this exists

For a background utility, startup behavior is part of the core experience.

### How to test launch at login

1. Enable `Launch at login`.
2. Quit the app.
3. Log out and back in, or restart.
4. Confirm the app starts automatically.
5. Disable it and repeat.

---

## 10. Permissions

## 10.1 Microphone permission

The app needs microphone permission to capture speech.

### Why the packaged app needed extra work

macOS packaged apps need the correct usage description in the app bundle or the permission flow will not behave correctly.

That is why the app bundle now includes:

- `NSMicrophoneUsageDescription`

### Why the onboarding prompt was moved earlier

If microphone permission is deferred until later, users encounter failures only after they think setup is complete.

### How to test microphone permission

1. Restart onboarding.
2. Go through setup.
3. Confirm microphone permission is requested during onboarding.
4. Open macOS Microphone settings.
5. Confirm app appears there.
6. Run `Test mic`.
7. Run dictation.

## 10.2 Accessibility permission

The app needs accessibility permission on macOS so it can send paste events into other applications.

### Why this is needed

Without it, the app may capture and process audio but cannot reliably paste into the active app.

### Why native event posting was chosen

The earlier AppleScript/System Events path was not the right production-grade paste mechanism for packaged builds. Native event posting is the correct foundation for a desktop utility.

### Alternatives

- AppleScript
- UI scripting through System Events

### Why they were rejected

- less reliable in packaged desktop-app conditions
- more dependent on macOS automation behavior instead of proper event posting

### How to test accessibility

1. Open packaged app from Finder.
2. In `Audio`, refresh permissions.
3. Open System Settings for Accessibility.
4. Confirm the exact app bundle is authorized.
5. Put cursor in another app.
6. Dictate and confirm paste works there.

---

## 11. Account and Auth

## 11.1 What exists now

A real native auth/session foundation now exists in the desktop client.

The client now supports:

- sign in
- sign up
- session restore
- profile refresh
- profile update
- sign out
- delete account

The desktop app:

- stores the current auth session natively
- stores auth metadata in app storage and tokens in secure OS credential storage
- exposes auth commands through Tauri
- updates the account screen and Home menu from real auth state

The workspace now also contains a real backend auth service:

- `/Users/appe/Documents/Vibe-Coding/Whisper Flow Ent/Production/Desktop Client/voiceflow-auth-service`

## 11.2 Why this was implemented now

The earlier account screen was only local UI state. That was no longer sufficient for a production-ready product.

### Why this approach was chosen

The correct first step was:

- create a native auth session layer
- persist session state outside browser UI state
- expose stable commands/events to the frontend

This gives a real desktop account model.

### Alternatives

- continue with frontend-only localStorage profile data
- wait to do any account work until backend is finished
- use browser-only auth state

### Why those were rejected

- frontend-only local account state is not real auth
- deferring all auth work would block backend integration later
- browser-only state is wrong for a desktop app with packaged runtime expectations

## 11.3 Current limitation

This is much closer to production-ready now, but not fully finished yet.

The desktop client and a real backend auth service now both exist in the workspace. What is still pending is deployed end-to-end validation and the final account/org enforcement layer.

Current expected endpoints:

- `POST /auth/sign-in`
- `POST /auth/sign-up`
- `GET /auth/me`
- `PATCH /auth/me`
- `DELETE /auth/me`
- `POST /auth/sign-out`

### Important production note

Current token persistence has already been moved toward the production model:

- auth metadata stays in app storage
- tokens are stored through secure OS credential storage

What still remains is final validation of that secure-storage behavior in packaged builds on every supported platform.

### How to test auth once the backend is available

1. Open onboarding auth step.
2. Point the desktop app at the deployed auth base URL.
3. Sign up a new account.
4. Confirm app continues with authenticated state.
5. Open Account screen.
6. Confirm first name, last name, and email are populated.
7. Edit first/last name and save.
8. Relaunch app.
9. Confirm session restores.
10. Sign out.
11. Confirm signed-out state.
12. Sign back in.
13. If allowed in test environment, confirm delete account works.
14. Confirm the token is not written to plain JSON session metadata.

### How to test the backend service itself

1. Start Postgres.
2. Configure `.env` in:
   - `/Users/appe/Documents/Vibe-Coding/Whisper Flow Ent/Production/Desktop Client/voiceflow-auth-service`
3. Run:

```bash
cd "/Users/appe/Documents/Vibe-Coding/Whisper Flow Ent/Production/Desktop Client/voiceflow-auth-service"
cargo run
```

4. Check:

```bash
curl http://127.0.0.1:4000/health
```

5. Use the backend README examples for:
   - sign up
   - sign in
   - get profile
   - update profile
   - sign out
   - delete account

These backend run/test steps are documented in:

- `/Users/appe/Documents/Vibe-Coding/Whisper Flow Ent/Production/Desktop Client/voiceflow-auth-service/README.md`

---

## 12. Packaged macOS App

## 12.1 What was fixed

The packaged app originally had several launch/runtime problems:

- launch from Finder issues
- missing bundled dylibs
- bad runtime library search paths
- permission inconsistencies
- Dock behavior inconsistencies

These were addressed through:

- bundle/runtime path fixes
- explicit app metadata
- packaged-app permission fixes
- Dock activation policy fixes

### Why packaged build testing matters

`tauri dev` is not enough. Desktop products fail in packaged form for reasons that do not exist in dev mode.

### How to test the packaged app

Use the packaged app bundle directly from Finder, not only the dev server.

Validate:

1. first launch
2. microphone permission
3. accessibility permission
4. onboarding
5. local dictation
6. enterprise dictation
7. tray behavior
8. Dock behavior
9. launch-at-login

---

## 13. Why We Chose the Current Overall Approach

The current implementation direction prioritized:

- real desktop behavior first
- real packaged app behavior before pretending the product is ready
- native runtime control where browser APIs are not enough
- gradual replacement of placeholders with durable system-backed implementations

That is why the work order was:

1. make dictation real
2. make onboarding and settings usable
3. make packaged macOS behavior real
4. begin real auth/account foundation
5. only now move toward fully production backend integration

This sequence reduced risk. It prevented building a polished backend integration on top of an unstable desktop runtime.

---

## 14. What the Immediate Production-Ready Next Step Is

Because the goal is now explicitly production-ready backend work with no shortcuts, the next step should be:

## Production Auth Backend Integration

This means:

- deploy the real auth service
- validate every auth action end-to-end
- validate secure token storage in packaged builds
- connect enterprise access to authenticated account/org state

This is the correct next step because the desktop app is now far enough along that backend/auth is the main remaining product-risk area.

---

## 15. Remaining Production Milestones

## Milestone 7.2: Deploy and Validate Auth End-To-End

- deploy the real backend auth service
- sign in/sign up validation
- session restore validation
- secure token storage validation
- real account hydration

## Milestone 7.3: Account and Organization Identity

- org detection from authenticated backend data
- enterprise gating by account/org identity
- final account behavior cleanup

## Milestone 8: Enterprise Hardening

- API key enforcement
- server-side auth validation
- retry/reconnect strategy
- clearer admin diagnostics

## Milestone 9: Packaging and Distribution

- updater
- signing
- notarization
- release process
- Windows distribution

---

## 16. Summary for a Non-Technical Reader

In simple terms:

- The app can now actually function as a desktop dictation tool.
- It can set itself up locally.
- It can connect to an enterprise backend.
- It behaves like a tray/menu-bar app.
- It works in a packaged macOS build, not only in development.
- It now has a real account/auth foundation inside the desktop app.

What is still missing before it is fully production-ready:

- deployment and validation of the production auth backend
- final packaged-build validation of secure token storage
- stronger enterprise backend enforcement
- updater and release/distribution work

That is the correct remaining work. The product is no longer blocked by basic desktop behavior. It is now blocked by final backend, security, and release hardening.
