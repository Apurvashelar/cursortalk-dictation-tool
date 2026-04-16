# UI Foundation Spec

## Goal

The client app should behave like a `dictation utility`, not a dashboard.

The primary surface should help the user:

1. know whether the app is ready
2. start dictation quickly
3. see clearly when the app is listening
4. trust that text will land in the active app
5. recover quickly if something fails

This UI milestone is about creating the right product shell before we add more diagnostics and enterprise hardening.

## Product principle

The app is not an admin console.

The app is not a developer tool.

The app is not a settings-heavy workflow.

The app is a lightweight desktop dictation utility with enterprise connectivity underneath.

So the UI should feel:

1. minimal
2. calm
3. fast to understand
4. desktop-first
5. trustworthy

## What the user should see

### Main screen

The main screen should show only what the user needs for daily use:

1. readiness state
2. start/stop dictation action
3. recording indicator while active
4. latest final output
5. quick actions:
   - paste again
   - copy
   - clear
6. small recent activity list
7. compact issue state if something needs attention

### Settings screen

The settings screen should show only operational controls:

1. hotkey
2. microphone selection
3. startup behavior
4. enterprise connection settings
5. permissions status

### Diagnostics screen

The diagnostics screen should contain the technical detail we need for support and testing:

1. backend health
2. raw transcript
3. cleanup response details
4. error details
5. environment checks
6. model path and helper status

## What should not be shown on the main screen

These should not be on the primary surface:

1. backend URL
2. health URL
3. SSH tunnel host or port
4. model version
5. latency numbers
6. sample rate and channel count
7. recording file path
8. raw transcript by default
9. fallback flags
10. internal mode terminology beyond what is needed

These belong in `Settings` or `Diagnostics`.

## Screen structure

## 1. Home

This is the primary screen and should be the default landing surface.

### Home layout

The page should have four zones:

1. utility header
2. central dictation card
3. latest output card
4. recent activity card

### Utility header

Keep this compact.

Contents:

1. app name
2. one-line readiness summary
3. quick link to settings
4. quick link to diagnostics

The header should not feel like navigation for a large SaaS app. It should feel like a desktop utility.

### Central dictation card

This is the most important card in the app.

It should contain:

1. current state:
   - Ready
   - Recording
   - Processing
   - Pasting
   - Needs attention
2. primary dictation action
3. hotkey hint
4. recording indicator when active
5. short helper text based on state

### Recording indicator

We should add a small visible recording component on the main screen.

Recommended behavior:

1. appears only when recording is active
2. shows a microphone icon
3. shows animated waveform bars or pulse
4. shows `Listening...`
5. shows elapsed time
6. optionally shows `Stop` and `Cancel`

This gives confidence without overwhelming the user.

### Latest output card

This should show the most recent usable output, not the raw transcript.

Contents:

1. final output preview
2. source badge:
   - `Enterprise cleanup`
   - `Transcript fallback`
3. quick actions:
   - paste again
   - copy
   - clear
4. completion status:
   - inserted successfully
   - ready to paste
   - last action failed

### Recent activity card

This should be small and simple for v1.

Contents:

1. last 3 dictations
2. timestamp or relative time
3. truncated preview
4. quick actions:
   - paste
   - copy

This gives users confidence and a recovery path without building a full history system.

## 2. Settings

This should be a grouped operational settings page.

### Settings sections

#### Shortcut

1. current shortcut
2. change shortcut control
3. test shortcut action

#### Microphone

1. default microphone
2. selectable input device
3. microphone status

#### Startup

1. open at login
2. keep app in menu bar/tray
3. reopen last window or stay hidden

#### Enterprise connection

1. cleanup URL
2. health URL
3. connection state
4. optional tunnel guidance for current development phase

#### Permissions

1. microphone permission
2. accessibility permission
3. quick explanation if either is missing

## 3. Diagnostics

This page is for support, QA, and development. It should be available but not noisy.

### Diagnostics sections

#### Pipeline status

1. recording state
2. STT state
3. cleanup state
4. paste state

#### Transcript details

1. raw transcript
2. cleaned text
3. final output

#### Backend details

1. backend health
2. last cleanup response result
3. fallback usage
4. error details

#### Environment details

1. STT model path
2. Python helper availability
3. active microphone info

## First-version UI features we should add

These are the right v1 features for a seamless dictation experience.

1. clear recording indicator on the main screen
2. latest output card with paste again and copy
3. recent dictations list with last few entries
4. readiness summary for microphone, permissions, and enterprise backend
5. friendly issue messages instead of raw technical strings
6. microphone selector in settings
7. shortcut section in settings
8. permissions section in settings
9. diagnostics page for technical detail
10. optional sound toggle later if needed

## Features to defer

These are useful later, but should not be part of the first UI milestone:

1. personal dictionary
2. snippets
3. tone or style controls
4. app-specific behavior rules
5. multi-language switching UI
6. hands-free mode
7. team/shared vocabulary management
8. advanced history search
9. analytics views
10. server admin controls

## Design direction

The visual language should be more enterprise-ready, but still minimal.

### Design qualities

1. neutral and restrained
2. high contrast and legible
3. desktop utility feel
4. intentional spacing and hierarchy
5. no flashy startup aesthetics

### Visual recommendations

1. use a clean neutral background with subtle depth
2. use one accent color for active dictation and status
3. use compact cards with clear boundaries
4. use strong typography hierarchy
5. keep motion subtle and functional

### Status styling

We should define a stable visual system for:

1. ready
2. recording
3. processing
4. pasting
5. success
6. issue

## Information hierarchy

This should be the default order of importance in the app:

1. am I ready to dictate
2. am I recording right now
3. what output was produced
4. what can I do next
5. if something failed, how do I recover
6. only then show deeper technical detail

## Implementation plan for this UI milestone

### Phase 1: app shell redesign

1. replace the current setup/settings shell with `Home`, `Settings`, and `Diagnostics`
2. create a cleaner desktop utility layout
3. create reusable UI primitives for cards, status badges, and action rows

### Phase 2: home screen redesign

1. build the main dictation card
2. add the recording indicator
3. add the latest output card
4. add recent activity
5. simplify state messaging

### Phase 3: settings redesign

1. group settings by user intent
2. move operational controls into cleaner sections
3. keep enterprise configuration present but not visually dominant

### Phase 4: diagnostics extraction

1. move technical detail off the main screen
2. give diagnostics its own page
3. keep it useful for testing without leaking too much complexity into normal use

## Acceptance criteria

This milestone is complete when:

1. the app feels like a dictation utility rather than a dashboard
2. the primary workflow is obvious without explanation
3. the recording state is visually clear and trustworthy
4. the latest output is easy to review and reuse
5. technical detail is moved out of the main surface
6. the current enterprise dictation flow still works after the redesign

## What comes after this milestone

After this UI foundation is in place, the next milestone should be runtime hardening:

1. persisted config
2. permission diagnostics
3. backend diagnostics
4. environment validation
5. stronger error recovery
6. tray and background behavior improvements
