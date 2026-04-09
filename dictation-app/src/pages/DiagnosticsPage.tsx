import type {
  AppConfig,
  AudioInputDevice,
  BackendHealth,
  SessionState,
  SttStatus,
} from "../api/backend";

type DiagnosticsPageProps = {
  config: AppConfig | null;
  backendHealth: BackendHealth;
  sessionState: SessionState;
  audioDevices: AudioInputDevice[];
  sttStatus: SttStatus;
  isCheckingHealth: boolean;
  refreshBackendHealth: () => void;
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

export function DiagnosticsPage({
  config,
  backendHealth,
  sessionState,
  audioDevices,
  sttStatus,
  isCheckingHealth,
  refreshBackendHealth,
}: DiagnosticsPageProps) {
  const defaultDevice = audioDevices.find((device) => device.is_default);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Diagnostics</p>
          <h2>Support and pipeline detail</h2>
          <p className="muted">
            Technical details live here so the main surface can stay focused on dictation.
          </p>
        </div>
        <button className="secondary-button" onClick={refreshBackendHealth} type="button">
          {isCheckingHealth ? "Checking..." : "Refresh health"}
        </button>
      </div>

      <div className="stack">
        <section className="card">
          <h3>Pipeline status</h3>
          <div className="field-grid">
            <label className="field">
              <span>Session state</span>
              <input value={sessionState.state} readOnly />
            </label>
            <label className="field">
              <span>Backend health</span>
              <input value={statusLabel(backendHealth.status)} readOnly />
            </label>
            <label className="field">
              <span>STT engine</span>
              <input value={sttStatus.engine} readOnly />
            </label>
            <label className="field">
              <span>STT state</span>
              <input value={sttStatus.state} readOnly />
            </label>
          </div>
        </section>

        <section className="card">
          <h3>Transcript detail</h3>
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
              <span>Final output</span>
              <textarea value={sessionState.final_output ?? ""} readOnly />
            </label>
            <label className="field">
              <span>Paste status</span>
              <input value={sessionState.last_paste_message ?? "Not pasted yet"} readOnly />
            </label>
          </div>
        </section>

        <section className="card">
          <h3>Backend detail</h3>
          <div className="field-grid">
            <label className="field">
              <span>Backend URL</span>
              <input value={config?.cleanup_url ?? "http://127.0.0.1:8080/clean"} readOnly />
            </label>
            <label className="field">
              <span>Health URL</span>
              <input value={config?.health_url ?? "http://127.0.0.1:8080/health"} readOnly />
            </label>
            <label className="field">
              <span>Backend message</span>
              <input value={backendHealth.message} readOnly />
            </label>
            <label className="field">
              <span>Cleanup result</span>
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

        <section className="card">
          <h3>Environment detail</h3>
          <div className="field-grid">
            <label className="field">
              <span>Default microphone</span>
              <input value={defaultDevice?.name ?? "No input device detected"} readOnly />
            </label>
            <label className="field">
              <span>Active input</span>
              <input value={sessionState.input_device ?? "Not recording"} readOnly />
            </label>
            <label className="field">
              <span>Recording path</span>
              <input value={sessionState.last_recording_path ?? "Not available"} readOnly />
            </label>
            <label className="field">
              <span>STT model dir</span>
              <input value={config?.stt_model_dir ?? "Not configured"} readOnly />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
