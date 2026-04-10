import type {
  AudioInputDevice,
  BackendHealth,
  SessionState,
} from "../api/backend";

export type RecentActivityItem = {
  id: string;
  text: string;
  source: "enterprise" | "fallback";
  createdAtLabel: string;
};

type HomePageProps = {
  selectedMode: "local" | "organization";
  backendHealth: BackendHealth;
  sessionState: SessionState;
  audioDevices: AudioInputDevice[];
  isRecordingActionPending: boolean;
  isPastePending: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPasteLatest: () => void;
  onCopyLatest: () => void;
  recentActivity: RecentActivityItem[];
};

function stateLabel(state: SessionState["state"]) {
  switch (state) {
    case "idle":
      return "Ready";
    case "recording":
      return "Recording";
    case "transcribing":
      return "Transcribing";
    case "cleaning":
      return "Cleaning";
    case "pasting":
      return "Pasting";
    case "error":
      return "Needs attention";
    default:
      return "Ready";
  }
}

function readinessLabel(status: BackendHealth["status"]) {
  switch (status) {
    case "healthy":
      return "Connected";
    case "degraded":
      return "Check backend";
    case "unreachable":
      return "Backend unavailable";
    default:
      return "Checking connection";
  }
}

function sourceLabel(sessionState: SessionState) {
  if (!sessionState.final_output) {
    return "Waiting for dictation";
  }

  return sessionState.used_cleanup_fallback ? "Transcript fallback" : "Enterprise cleanup";
}

function shortIssueText(sessionState: SessionState, backendHealth: BackendHealth) {
  if (sessionState.state === "error") {
    return sessionState.message;
  }

  if (backendHealth.status === "unreachable") {
    return "Enterprise cleanup is unavailable. Dictation can still fall back to transcript output.";
  }

  return "Start dictation quickly, see that the app is listening, and trust the final text will land in the active app.";
}

function secondaryRuntimeLabel(selectedMode: "local" | "organization", backendHealth: BackendHealth) {
  if (selectedMode === "local") {
    return "Local runtime ready";
  }

  return readinessLabel(backendHealth.status);
}

export function HomePage({
  selectedMode,
  backendHealth,
  sessionState,
  audioDevices,
  isRecordingActionPending,
  isPastePending,
  onStartRecording,
  onStopRecording,
  onPasteLatest,
  onCopyLatest,
  recentActivity,
}: HomePageProps) {
  const defaultDevice = audioDevices.find((device) => device.is_default);
  const isRecording = sessionState.state === "recording";
  const isBusy =
    sessionState.state === "transcribing" ||
    sessionState.state === "cleaning" ||
    sessionState.state === "pasting";

  return (
    <div className="page-shell">
      <section className="hero-card">
        <div className="hero-header">
          <div>
            <p className="eyebrow">
              {selectedMode === "organization" ? "Organization Mode" : "Local Mode"}
            </p>
            <h2>Ready for dictation</h2>
            <p className="hero-copy">{shortIssueText(sessionState, backendHealth)}</p>
          </div>
          <div className="utility-stack">
            <div className="status-dotline">
              <span className="status-dot" data-status={sessionState.state} />
              <span>{stateLabel(sessionState.state)}</span>
            </div>
            <div className="status-dotline">
              <span
                className="status-dot"
                data-status={selectedMode === "organization" ? backendHealth.status : "ready"}
              />
              <span>{secondaryRuntimeLabel(selectedMode, backendHealth)}</span>
            </div>
          </div>
        </div>

        <div className="hero-body">
          <div className="dictation-panel">
            <div className="dictation-state">
              <div className="state-ring" data-status={sessionState.state}>
                <div className="state-ring-inner" />
              </div>
              <div>
                <p className="state-title">{stateLabel(sessionState.state)}</p>
                <p className="muted">Shortcut: {sessionState.hotkey}</p>
              </div>
            </div>

            {isRecording ? (
              <div className="recording-indicator">
                <div className="recording-bars" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div>
                  <p className="recording-title">Listening...</p>
                  <p className="muted">Speak naturally. Release the shortcut to finish.</p>
                </div>
              </div>
            ) : null}

            <div className="button-row">
              <button
                className="action-button action-button-large"
                disabled={isRecording || isBusy || isRecordingActionPending}
                onClick={onStartRecording}
                type="button"
              >
                Start dictation
              </button>
              <button
                className="secondary-button"
                disabled={!isRecording || isRecordingActionPending}
                onClick={onStopRecording}
                type="button"
              >
                Stop
              </button>
            </div>

            <div className="quick-readiness">
              <div className="readiness-chip">
                <span className="chip-label">Microphone</span>
                <span>{defaultDevice?.name ?? "No input device detected"}</span>
              </div>
              <div className="readiness-chip">
                <span className="chip-label">
                  {selectedMode === "organization" ? "Backend" : "Runtime"}
                </span>
                <span>
                  {selectedMode === "organization"
                    ? readinessLabel(backendHealth.status)
                    : "Local setup preview"}
                </span>
              </div>
            </div>
          </div>

          <div className="summary-panel">
            <p className="section-label">Latest output</p>
            <p className="output-source">{sourceLabel(sessionState)}</p>
            <div className="output-preview">
              {sessionState.final_output ??
                "Your latest cleaned dictation will appear here. Use it to review, paste again, or copy."}
            </div>

            <div className="button-row">
              <button
                className="secondary-button"
                disabled={!sessionState.final_output || isPastePending}
                onClick={onPasteLatest}
                type="button"
              >
                Paste again
              </button>
              <button
                className="secondary-button"
                disabled={!sessionState.final_output}
                onClick={onCopyLatest}
                type="button"
              >
                Copy
              </button>
            </div>

            <p className="muted compact">
              {sessionState.last_paste_message ?? "The latest output is ready to paste."}
            </p>
          </div>
        </div>
      </section>

      <section className="compact-grid">
        <article className="info-card">
          <p className="section-label">Readiness</p>
          <ul className="status-list">
            <li>
              <span
                className="status-dot"
                data-status={selectedMode === "organization" ? backendHealth.status : "ready"}
              />
              {selectedMode === "organization"
                ? `Enterprise backend: ${readinessLabel(backendHealth.status)}`
                : "Local workflow: setup path selected"}
            </li>
            <li>
              <span className="status-dot" data-status={defaultDevice ? "ready" : "error"} />
              Microphone: {defaultDevice?.name ?? "Not detected"}
            </li>
            <li>
              <span className="status-dot" data-status="ready" />
              Shortcut active: {sessionState.hotkey}
            </li>
          </ul>
        </article>

        <article className="info-card">
          <p className="section-label">Recent dictations</p>
          {recentActivity.length > 0 ? (
            <div className="recent-list">
              {recentActivity.map((item) => (
                <div className="recent-item" key={item.id}>
                  <div>
                    <p className="recent-text">{item.text}</p>
                    <p className="recent-meta">
                      {item.source === "enterprise" ? "Enterprise cleanup" : "Transcript fallback"} •{" "}
                      {item.createdAtLabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted compact">
              Recent dictations will appear here after you complete the first session.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
