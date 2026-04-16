# VoiceFlow Desktop: Current Status and Production Roadmap

## Purpose

This document is the current implementation summary for the desktop client. It records what is already working, what changed after the earlier roadmap draft, where local-mode assets live on disk, and what remains before the product can be called production-ready.

This file is intentionally concise. The full detailed explanation lives in:

- [IMPLEMENTATION_AND_TESTING_DEEP_DIVE.md](/Users/appe/Documents/Vibe-Coding/Whisper%20Flow%20Ent/Production/Desktop%20Client/dictation-app/IMPLEMENTATION_AND_TESTING_DEEP_DIVE.md)

---

## Current Product State

The desktop app is now a real Tauri-based client with:

- React + TypeScript + Vite frontend
- Rust native/runtime backend
- local dictation mode
- enterprise dictation mode
- packaged macOS app support
- tray/menu bar behavior
- floating dictation pill
- onboarding flow
- settings shell and diagnostics
- native microphone and accessibility handling in packaged macOS builds
- early real auth/session wiring

The product is beyond prototype stage. The major remaining work is production backend hardening, secure auth, packaging/signing, updater, and release discipline.

---

## What Has Been Achieved

## 1. Onboarding and Main App Shell

Implemented:

- welcome flow
- auth onboarding screen
- local setup onboarding
- organization setup onboarding
- onboarding test dictation
- main desktop shell with:
  - Home
  - General
  - Account
  - Audio
  - Connection
  - Advanced
  - Diagnostics

Current status:

- onboarding is functional
- onboarding now lands on Home instead of hiding the app
- packaged build onboarding permissions now behave correctly

---

## 2. Local Mode

Implemented:

- local setup inspection
- local setup download/install flow
- local STT model handling
- local cleanup model handling
- local test dictation
- local runtime use from the packaged app

### Local mode file/model location

Canonical local storage path:

- `~/Library/Application Support/VoiceFlow Desktop`

Inside that directory, the app uses:

- `models/stt`
- `models/cleanup`
- `downloads`
- `local-setup.json`
- `ui-preferences.json`
- `auth-session.json` (auth metadata only; access tokens now belong in secure OS storage)

The local setup logic also looks for an existing cleanup model in these fallback locations before copying/linking into canonical storage:

- workspace models folder:
  - `Production/Desktop Client/Models/dictation-cleanup-q4km.gguf`
- Desktop:
  - `~/Desktop/dictation-cleanup-q4km.gguf`
- legacy llama.cpp models folder:
  - `~/llama.cpp/models`

Current status:

- local mode works
- local setup is no longer a placeholder
- model/update management UX is still deferred

---

## 3. Enterprise Mode

Implemented:

- organization setup flow
- server URL configuration
- API key field
- connection checks
- enterprise test dictation
- enterprise mode routing from `Settings -> General`
- fallback back to local mode from disconnected state

Current status:

- enterprise mode works against a reachable backend
- EC2/tunnel-based validation succeeded
- production domain + always-available backend are still pending

---

## 4. Dictation Runtime

Implemented:

- recording
- transcription
- cleanup
- paste into active app
- no-speech handling
- raw fallback handling
- dictation logging
- recent dictation summary/stat computation

Current status:

- end-to-end dictation works
- logs are real
- recent dictations are backend-driven

---

## 5. Pill / Overlay

Implemented:

- dedicated overlay window
- recording / processing / done / error states
- speaking waveform transition
- onboarding test dictation pill states
- overlay position support
- default bottom-center position

Current status:

- the pill works in the packaged app
- done/error reset behavior is fixed

---

## 6. Tray / Menu Bar / Dock

Implemented:

- tray/menu bar icon
- tray menu actions
- close-to-tray behavior
- state-based tray icon changes
- dock visibility setting
- launch-at-login wiring
- packaged macOS Dock behavior stabilization

Current status:

- tray-first behavior is working
- Dock behavior is much more stable than earlier builds
- this area still needs one final full regression pass before release

---

## 7. Permissions and Packaged macOS Runtime

Implemented:

- packaged app can launch from Finder
- bundled dylib/rpath fixes
- real microphone usage description in app bundle
- packaged-app microphone permission prompt
- packaged-app accessibility permission checks
- native paste path on macOS
- onboarding-time microphone permission prompt

Current status:

- packaged macOS runtime is functional
- microphone and accessibility issues that were specific to Finder-launched builds were resolved

---

## 8. UI / Settings Finalization

Implemented:

- desktop-style sidebar shell
- flattened settings layout
- redesigned Home page
- diagnostics simplified to operational health cards
- account screen layout finalized visually
- audio/connection/advanced UI refined

Current status:

- visual structure is largely stable
- further changes should now be driven by production requirements, not exploratory UI iteration

---

## 9. Auth / Account Wiring

Newly achieved after the previous roadmap draft:

- native auth session module exists
- production auth backend service exists in:
  - `/Users/appe/Documents/Vibe-Coding/Whisper Flow Ent/Production/Desktop Client/voiceflow-auth-service`
- Tauri commands now exist for:
  - `get_auth_state`
  - `refresh_auth_state`
  - `sign_in`
  - `sign_up`
  - `update_account_profile`
  - `sign_out`
  - `delete_account`
- auth state is emitted to the frontend through an event
- onboarding auth screen now submits real auth actions
- top-right account menu reflects auth state
- account screen now uses backend auth/profile actions instead of frontend-only placeholder form state
- auth session metadata persists in app storage
- auth tokens are stored through secure OS credential storage

Backend service implemented:

- `GET /health`
- `POST /auth/sign-up`
- `POST /auth/sign-in`
- `POST /auth/sign-out`
- `GET /auth/me`
- `PATCH /auth/me`
- `DELETE /auth/me`

Security model implemented:

- Postgres-backed user/session storage
- Argon2id password hashing
- opaque bearer tokens
- only token hashes stored in the database

Current status:

- the client and backend auth/account foundation now both exist
- this is not fully production-ready yet because:
  - deployed end-to-end backend validation is still pending
  - org membership/identity enforcement is not fully connected yet
  - packaged-build secure storage validation still needs to be completed

---

## What Is Still Not Production-Ready

These are the major gaps:

- real production auth service deployment is not validated yet
- secure token storage still needs final packaged-build validation
- enterprise API authentication/enforcement is not hardened yet
- updater is not implemented
- macOS signing/notarization is not done
- Windows packaging/distribution validation is not done
- launch-at-login and packaged runtime still need a final full regression checklist pass
- account deletion/sign-out need real backend-backed validation, not just client implementation
- release automation/checklists are not finalized

---

## Immediate Next Step

The next step is:

## Milestone 7.2: Deploy and Validate Auth End-To-End

This means:

- provision production-grade Postgres
- deploy `voiceflow-auth-service`
- point the desktop app at the deployed auth base URL
- validate:
  - sign in
  - sign up
  - session restore
  - profile update
  - sign out
  - delete account
- validate secure token storage in packaged builds
- connect organization access to authenticated account state

---

## Recommended Milestone Order From Here

## Milestone 7.2: Deploy and Validate Auth End-To-End

- deploy the new auth service
- validate the full auth lifecycle against the deployed backend
- validate secure token storage in packaged builds

## Milestone 7.3: Account and Organization Identity

- hydrate real user profile from backend
- derive org access from account/org membership
- remove remaining placeholder account behavior
- enforce auth-aware enterprise mode access

## Milestone 8: Enterprise Hardening

- real API key enforcement
- server-side auth validation
- retry/reconnect behavior
- better enterprise admin diagnostics
- clearer failure classification and recovery

## Milestone 9: Release and Distribution

- updater wiring
- stable release bundle flow
- proper signing
- notarization
- installer/DMG work
- Windows packaging
- repeatable release checklist

---

## Production Readiness Checklist

Before calling the app production-ready, all of the following should be true:

- packaged macOS app is stable on first launch
- local mode works in packaged build
- enterprise mode works in packaged build
- tray behavior is reliable
- Dock behavior is reliable
- launch-at-login works reliably
- account/auth is backed by the real service
- tokens are stored securely in OS credential storage
- settings persist correctly across relaunch
- updater is real
- packaged builds are signed and distributable
- backend auth/API key enforcement is real
- release checklist exists and is repeatable
- Windows build is validated

---

## Future Scope

These are worthwhile later improvements but are not the current blocker:

- richer admin diagnostics
- enterprise health auto-polling
- synced settings across devices
- telemetry/analytics if privacy policy permits
- crash reporting
- improved export/share workflow for recent dictations
- richer account/profile management
- multi-monitor-aware overlay rules
- more advanced enterprise policy controls

---

## Notes

- Many changes are still local-only and intentionally not pushed yet.
- The packaged macOS validation path is now meaningful, but final distribution work is still ahead.
- For the deep explanation of how each step works and how to test it, use:
  - [IMPLEMENTATION_AND_TESTING_DEEP_DIVE.md](/Users/appe/Documents/Vibe-Coding/Whisper%20Flow%20Ent/Production/Desktop%20Client/dictation-app/IMPLEMENTATION_AND_TESTING_DEEP_DIVE.md)
