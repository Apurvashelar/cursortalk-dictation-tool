import type {
  AppConfig,
  AudioInputDevice,
  BackendHealth,
  SessionState,
  SttStatus,
} from "../api/backend";

type SetupPageProps = {
  config: AppConfig | null;
  backendHealth: BackendHealth;
  sessionState: SessionState;
  audioDevices: AudioInputDevice[];
  sttStatus: SttStatus;
  isCheckingHealth: boolean;
  isRecordingActionPending: boolean;
  isPastePending: boolean;
  refreshBackendHealth: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  pasteLatestOutput: () => void;
};

function statusLabel(status: BackendHealth["status"]) {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "unreachable":
      return "Unreachable";
    default:
      return "Unknown";
  }
}

export function SetupPage({
  config,
  backendHealth,
  sessionState,
  audioDevices,
  sttStatus,
  isCheckingHealth,
  isRecordingActionPending,
  isPastePending,
  refreshBackendHealth,
  startRecording,
  stopRecording,
  pasteLatestOutput,
}: SetupPageProps) {
  const defaultDevice = audioDevices.find((device) => device.is_default);
  const isRecording = sessionState.state === "recording";

  return (
    <div className="panel">
      <div className="panel-header">
        <p className="eyebrow">Setup</p>
        <h2>Organization mode</h2>
        <p className="muted">
          This build uses local STT and the EC2 cleanup API through an SSH
          tunnel.
        </p>
      </div>

      <div className="stack">
        <section className="card">
          <h3>Modes</h3>
          <div className="mode-grid">
            <article className="mode-card selected">
              <p className="mode-title">Organization</p>
              <p className="muted">Enabled for this phase.</p>
            </article>
            <article className="mode-card disabled">
              <p className="mode-title">Personal</p>
              <p className="muted">Visible, but not enabled yet.</p>
            </article>
          </div>
        </section>

        <section className="card">
          <div className="split-header">
            <div>
              <h3>Backend</h3>
            </div>
            <button className="action-button" onClick={refreshBackendHealth} type="button">
              {isCheckingHealth ? "Checking..." : "Check health"}
            </button>
          </div>

          <div className="status-grid">
            <div className="status-pill" data-status={backendHealth.status}>
              {statusLabel(backendHealth.status)}
            </div>
            <p className="muted">{backendHealth.message}</p>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Forwarded endpoint</span>
              <input value={backendHealth.endpoint} readOnly />
            </label>
            <label className="field">
              <span>Health endpoint</span>
              <input value={backendHealth.healthUrl} readOnly />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Tunnel target</span>
              <input value={config?.tunnel_host ?? "AWS EC2"} readOnly />
            </label>
            <label className="field">
              <span>Port mapping</span>
              <input
                value={
                  config
                    ? `${config.tunnel_local_port} -> ${config.tunnel_remote_port}`
                    : "8080 -> 8080"
                }
                readOnly
              />
            </label>
          </div>
        </section>

        <section className="card">
          <div className="split-header">
            <div>
              <h3>Recording</h3>
              <p className="muted">{sessionState.message}</p>
            </div>
            <div className="button-row">
              <button
                className="action-button"
                disabled={isRecording || isRecordingActionPending}
                onClick={startRecording}
                type="button"
              >
                Start
              </button>
              <button
                className="secondary-button"
                disabled={!isRecording || isRecordingActionPending}
                onClick={stopRecording}
                type="button"
              >
                Stop
              </button>
              <button
                className="secondary-button"
                disabled={!sessionState.final_output || isPastePending}
                onClick={pasteLatestOutput}
                type="button"
              >
                Paste latest
              </button>
            </div>
          </div>

          <div className="status-grid">
            <div className="status-pill" data-status={sessionState.state}>
              {sessionState.state}
            </div>
            <p className="muted">Hotkey: {sessionState.hotkey}</p>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Default input</span>
              <input value={defaultDevice?.name ?? "No input device detected"} readOnly />
            </label>
            <label className="field">
              <span>Active input</span>
              <input value={sessionState.input_device ?? "Not recording"} readOnly />
            </label>
          </div>

          {sessionState.last_recording_path ? (
            <div className="field-grid">
              <label className="field">
                <span>Last recording</span>
                <input value={sessionState.last_recording_path} readOnly />
              </label>
              <label className="field">
                <span>Last capture</span>
                <input
                  value={`${sessionState.last_recording_duration_ms ?? 0} ms • ${
                    sessionState.last_recording_sample_rate ?? 0
                  } Hz • ${sessionState.last_recording_channels ?? 0} ch`}
                  readOnly
                />
              </label>
            </div>
          ) : null}
        </section>

        <section className="card">
          <h3>Transcript</h3>
          <div className="status-grid">
            <div className="status-pill" data-status={sttStatus.state}>
              {sttStatus.engine}
            </div>
            <p className="muted">{sttStatus.message}</p>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Raw transcript</span>
              <textarea value={sessionState.raw_transcript ?? ""} readOnly />
            </label>
            <label className="field">
              <span>Cleaned text</span>
              <textarea value={sessionState.cleaned_text ?? ""} readOnly />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>STT latency</span>
              <input
                value={
                  sessionState.stt_latency_ms != null
                    ? `${sessionState.stt_latency_ms} ms`
                    : "Not available"
                }
                readOnly
              />
            </label>
            <label className="field">
              <span>Paste</span>
              <input value={sessionState.last_paste_message ?? "Not pasted yet"} readOnly />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Final output</span>
              <textarea value={sessionState.final_output ?? ""} readOnly />
            </label>
            <label className="field">
              <span>Cleanup</span>
              <input
                value={
                  sessionState.cleanup_model_version
                    ? `${sessionState.used_cleanup_fallback ? "Fallback" : "Remote"} • ${
                        sessionState.cleanup_model_version
                      } • ${sessionState.cleanup_latency_ms ?? 0} ms`
                    : "Not available"
                }
                readOnly
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
