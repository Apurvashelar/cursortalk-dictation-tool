import type {
  AppConfig,
  AudioInputDevice,
  BackendHealth,
  SessionState,
} from "../api/backend";

type SettingsPageProps = {
  config: AppConfig | null;
  backendHealth: BackendHealth;
  sessionState: SessionState;
  audioDevices: AudioInputDevice[];
};

export function SettingsPage({
  config,
  backendHealth,
  sessionState,
  audioDevices,
}: SettingsPageProps) {
  const defaultDevice = audioDevices.find((device) => device.is_default);

  return (
    <div className="panel">
      <div className="panel-header">
        <p className="eyebrow">Settings</p>
        <h2>Connection</h2>
        <p className="muted">Minimal development configuration for the hosted cleanup backend.</p>
      </div>

      <div className="stack">
        <section className="card">
          <h3>Backend</h3>
          <div className="field-grid">
            <label className="field">
              <span>Backend URL</span>
              <input value={config?.server_url ?? "http://127.0.0.1:8080"} readOnly />
            </label>
            <label className="field">
              <span>Mode</span>
              <input value={config?.mode ?? "organization"} readOnly />
            </label>
            <label className="field">
              <span>Hotkey</span>
              <input value={config?.hotkey ?? sessionState.hotkey} readOnly />
            </label>
            <label className="field">
              <span>Health URL</span>
              <input
                value={config?.health_url ?? "http://127.0.0.1:8080/health"}
                readOnly
              />
            </label>
            <label className="field">
              <span>Backend status</span>
              <input value={backendHealth.status} readOnly />
            </label>
          </div>
        </section>

        <section className="card">
          <h3>Tunnel</h3>
          <ul className="plain-list">
            <li>Local forwarded port should be available before dictation starts.</li>
            <li>Cleanup requests will use the forwarded localhost endpoint.</li>
            <li>Raw transcript fallback will be used if the backend is unreachable.</li>
          </ul>
        </section>

        <section className="card">
          <h3>Audio</h3>
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
      </div>
    </div>
  );
}
