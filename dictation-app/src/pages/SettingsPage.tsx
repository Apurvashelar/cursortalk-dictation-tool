import type {
  AppConfig,
  AudioInputDevice,
  BackendHealth,
  SessionState,
} from "../api/backend";

type SettingsPageProps = {
  selectedMode: "local" | "organization";
  config: AppConfig | null;
  backendHealth: BackendHealth;
  sessionState: SessionState;
  audioDevices: AudioInputDevice[];
};

export function SettingsPage({
  selectedMode,
  config,
  backendHealth,
  sessionState,
  audioDevices,
}: SettingsPageProps) {
  const defaultDevice = audioDevices.find((device) => device.is_default);

  return (
    <div className="page-shell">
      <div className="page-header">
        <p className="eyebrow">Settings</p>
        <h2>Operational settings</h2>
        <p className="muted">
          Keep daily controls simple. Technical troubleshooting lives in Diagnostics.
        </p>
      </div>

      <div className="stack">
        <section className="card">
          <h3>Shortcut</h3>
          <div className="field-grid">
            <label className="field">
              <span>Mode</span>
              <input value={selectedMode} readOnly />
            </label>
            <label className="field">
              <span>Dictation shortcut</span>
              <input value={config?.hotkey ?? sessionState.hotkey} readOnly />
            </label>
          </div>
        </section>

        <section className="card">
          <h3>Microphone</h3>
          <div className="field-grid">
            <label className="field">
              <span>Default input</span>
              <input value={defaultDevice?.name ?? "No input device detected"} readOnly />
            </label>
            <label className="field">
              <span>Session state</span>
              <input value={sessionState.state} readOnly />
            </label>
          </div>
        </section>

        <section className="card">
          <h3>{selectedMode === "organization" ? "Enterprise connection" : "Local models"}</h3>
          {selectedMode === "organization" ? (
            <div className="field-grid">
              <label className="field">
                <span>Backend status</span>
                <input value={backendHealth.status} readOnly />
              </label>
              <label className="field">
                <span>Backend URL</span>
                <input value={config?.cleanup_url ?? "http://127.0.0.1:8080/clean"} readOnly />
              </label>
              <label className="field">
                <span>Health URL</span>
                <input
                  value={config?.health_url ?? "http://127.0.0.1:8080/health"}
                  readOnly
                />
              </label>
              <label className="field">
                <span>Tunnel target</span>
                <input value={config?.tunnel_host ?? "AWS EC2"} readOnly />
              </label>
            </div>
          ) : (
            <div className="field-grid">
              <label className="field">
                <span>Speech model package</span>
                <input value="Downloaded locally" readOnly />
              </label>
              <label className="field">
                <span>Cleanup model package</span>
                <input value="Downloaded locally" readOnly />
              </label>
              <label className="field">
                <span>Estimated storage</span>
                <input value="About 3.2 GB" readOnly />
              </label>
              <label className="field">
                <span>STT model dir</span>
                <input value={config?.stt_model_dir ?? "Not configured"} readOnly />
              </label>
            </div>
          )}
        </section>

        <section className="card">
          <h3>Permissions and behavior</h3>
          <ul className="plain-list">
            <li>Allow microphone access so the app can capture dictation.</li>
            <li>Allow accessibility access so the app can paste into other apps.</li>
            <li>Keep the SSH tunnel active when using the hosted cleanup path.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
