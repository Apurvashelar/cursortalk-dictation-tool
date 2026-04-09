import type {
  AppConfig,
  AudioInputDevice,
  BackendHealth,
  PermissionStatusReport,
  SessionState,
} from "../api/backend";

type SettingsPageProps = {
  selectedMode: "local" | "organization";
  config: AppConfig | null;
  backendHealth: BackendHealth;
  sessionState: SessionState;
  audioDevices: AudioInputDevice[];
  permissionStatus: PermissionStatusReport;
  isRefreshingPermissions: boolean;
  onRefreshPermissions: () => void;
  onOpenPermissionSettings: (permission: "microphone" | "accessibility") => void;
  organizationBaseUrl?: string;
};

export function SettingsPage({
  selectedMode,
  config,
  backendHealth,
  sessionState,
  audioDevices,
  permissionStatus,
  isRefreshingPermissions,
  onRefreshPermissions,
  onOpenPermissionSettings,
  organizationBaseUrl,
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
                <input
                  value={
                    organizationBaseUrl
                      ? `${organizationBaseUrl.replace(/\/$/, "")}/clean`
                      : config?.cleanup_url ?? "http://127.0.0.1:8080/clean"
                  }
                  readOnly
                />
              </label>
              <label className="field">
                <span>Health URL</span>
                <input
                  value={
                    organizationBaseUrl
                      ? `${organizationBaseUrl.replace(/\/$/, "")}/health`
                      : config?.health_url ?? "http://127.0.0.1:8080/health"
                  }
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
          <div className="card-toolbar">
            <p className="muted compact">
              {selectedMode === "organization"
                ? "Permissions are checked locally. Server connectivity is managed separately."
                : "Local mode needs microphone access for recording and Accessibility access for paste automation."}
            </p>
            <button className="secondary-button" onClick={onRefreshPermissions} type="button">
              {isRefreshingPermissions ? "Refreshing..." : "Refresh permissions"}
            </button>
          </div>

          <div className="permission-list">
            <div className="permission-row">
              <div>
                <p className="section-label">Microphone</p>
                <p className="muted compact">{permissionStatus.microphone.message}</p>
              </div>
              <div className="permission-actions">
                <span
                  className="status-pill"
                  data-status={permissionStatus.microphone.status}
                >
                  {permissionStatus.microphone.label}
                </span>
                <button
                  className="secondary-button"
                  onClick={() => onOpenPermissionSettings("microphone")}
                  type="button"
                >
                  Open System Settings
                </button>
              </div>
            </div>

            <div className="permission-row">
              <div>
                <p className="section-label">Accessibility</p>
                <p className="muted compact">{permissionStatus.accessibility.message}</p>
              </div>
              <div className="permission-actions">
                <span
                  className="status-pill"
                  data-status={permissionStatus.accessibility.status}
                >
                  {permissionStatus.accessibility.label}
                </span>
                <button
                  className="secondary-button"
                  onClick={() => onOpenPermissionSettings("accessibility")}
                  type="button"
                >
                  Open System Settings
                </button>
              </div>
            </div>

            <div className="permission-hint">
              {selectedMode === "organization"
                ? "Keep the SSH tunnel active when using the hosted cleanup path."
                : "If you grant access while the app is open, use Refresh permissions to update the status immediately."}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
