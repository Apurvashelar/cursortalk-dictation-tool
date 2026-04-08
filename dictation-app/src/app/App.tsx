import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { AppConfig, BackendHealth } from "../api/backend";
import { defaultBackendHealth } from "../api/backend";
import { SetupPage } from "../pages/SetupPage";
import { SettingsPage } from "../pages/SettingsPage";
import { useAppState } from "../state/appState";

export function App() {
  const { currentPage, setCurrentPage } = useAppState();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealth>(defaultBackendHealth);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  async function loadConfig() {
    const nextConfig = await invoke<AppConfig>("get_config");
    setConfig(nextConfig);
  }

  async function refreshBackendHealth() {
    setIsCheckingHealth(true);

    try {
      const nextHealth = await invoke<{
        status: BackendHealth["status"];
        endpoint: string;
        health_url: string;
        message: string;
      }>("get_backend_health");

      setBackendHealth({
        status: nextHealth.status,
        endpoint: nextHealth.endpoint,
        healthUrl: nextHealth.health_url,
        message: nextHealth.message,
      });
    } catch (error) {
      setBackendHealth({
        status: "unreachable",
        endpoint: config?.server_url ?? defaultBackendHealth.endpoint,
        healthUrl: config?.health_url ?? defaultBackendHealth.healthUrl,
        message: `Health check could not be completed. ${String(error)}`,
      });
    } finally {
      setIsCheckingHealth(false);
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  useEffect(() => {
    void refreshBackendHealth();
    // The initial check should run once after the shell mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Enterprise Voice Dictation</p>
          <h1>Whisper Flow Desktop</h1>
        </div>
        <nav className="nav">
          <button
            className={currentPage === "setup" ? "nav-button active" : "nav-button"}
            onClick={() => setCurrentPage("setup")}
            type="button"
          >
            Setup
          </button>
          <button
            className={currentPage === "settings" ? "nav-button active" : "nav-button"}
            onClick={() => setCurrentPage("settings")}
            type="button"
          >
            Settings
          </button>
        </nav>
      </header>

      <section className="content">
        {currentPage === "setup" ? (
          <SetupPage
            config={config}
            backendHealth={backendHealth}
            isCheckingHealth={isCheckingHealth}
            refreshBackendHealth={refreshBackendHealth}
          />
        ) : (
          <SettingsPage config={config} backendHealth={backendHealth} />
        )}
      </section>
    </main>
  );
}
