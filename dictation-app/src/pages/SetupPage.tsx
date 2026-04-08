import type { AppConfig, BackendHealth } from "../api/backend";

type SetupPageProps = {
  config: AppConfig | null;
  backendHealth: BackendHealth;
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

export function SetupPage({
  config,
  backendHealth,
  isCheckingHealth,
  refreshBackendHealth,
}: SetupPageProps) {
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
          <h3>Current state</h3>
          <ul className="plain-list">
            <li>App shell is build-tested.</li>
            <li>Organization backend diagnostics are live.</li>
            <li>Hotkey, recording, and STT are next.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
