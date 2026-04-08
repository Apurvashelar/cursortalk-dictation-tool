import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type {
  AppConfig,
  AudioInputDevice,
  BackendHealth,
  SessionState,
  SttStatus,
} from "../api/backend";
import { defaultBackendHealth } from "../api/backend";
import { SetupPage } from "../pages/SetupPage";
import { SettingsPage } from "../pages/SettingsPage";
import { useAppState } from "../state/appState";

const defaultSessionState: SessionState = {
  state: "idle",
  message: "Ready.",
  hotkey: "CommandOrControl+Shift+D",
  input_device: null,
  last_recording_path: null,
  last_recording_duration_ms: null,
  last_recording_sample_rate: null,
  last_recording_channels: null,
  raw_transcript: null,
  cleaned_text: null,
  stt_latency_ms: null,
  cleanup_latency_ms: null,
  cleanup_model_version: null,
  used_cleanup_fallback: false,
};

const defaultSttStatus: SttStatus = {
  engine: "Parakeet",
  state: "planned",
  message: "STT boundary is not wired yet.",
};

export function App() {
  const { currentPage, setCurrentPage } = useAppState();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealth>(defaultBackendHealth);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>(defaultSessionState);
  const [audioDevices, setAudioDevices] = useState<AudioInputDevice[]>([]);
  const [sttStatus, setSttStatus] = useState<SttStatus>(defaultSttStatus);
  const [isRecordingActionPending, setIsRecordingActionPending] = useState(false);

  async function loadConfig() {
    const nextConfig = await invoke<AppConfig>("get_config");
    setConfig(nextConfig);
  }

  async function loadSessionState() {
    const nextState = await invoke<SessionState>("get_session_state");
    setSessionState(nextState);
  }

  async function loadAudioDevices() {
    const nextDevices = await invoke<AudioInputDevice[]>("list_audio_input_devices");
    setAudioDevices(nextDevices);
  }

  async function loadSttStatus() {
    const nextStatus = await invoke<SttStatus>("get_stt_status");
    setSttStatus(nextStatus);
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
        endpoint: config?.cleanup_url ?? defaultBackendHealth.endpoint,
        healthUrl: config?.health_url ?? defaultBackendHealth.healthUrl,
        message: `Health check could not be completed. ${String(error)}`,
      });
    } finally {
      setIsCheckingHealth(false);
    }
  }

  useEffect(() => {
    void loadConfig();
    void loadSessionState();
    void loadAudioDevices();
    void loadSttStatus();
  }, []);

  useEffect(() => {
    void refreshBackendHealth();
    // The initial check should run once after the shell mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let isMounted = true;

    const setupListener = async () => {
      const unlisten = await listen<SessionState>("session-state-changed", (event) => {
        if (isMounted) {
          setSessionState(event.payload);
        }
      });

      return unlisten;
    };

    const unlistenPromise = setupListener();

    return () => {
      isMounted = false;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  async function startRecording() {
    setIsRecordingActionPending(true);

    try {
      const nextState = await invoke<SessionState>("start_recording");
      setSessionState(nextState);
    } finally {
      setIsRecordingActionPending(false);
    }
  }

  async function stopRecording() {
    setIsRecordingActionPending(true);

    try {
      const nextState = await invoke<SessionState>("stop_recording");
      setSessionState(nextState);
    } finally {
      setIsRecordingActionPending(false);
    }
  }

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
            sessionState={sessionState}
            audioDevices={audioDevices}
            sttStatus={sttStatus}
            isRecordingActionPending={isRecordingActionPending}
            startRecording={startRecording}
            stopRecording={stopRecording}
          />
        ) : (
          <SettingsPage
            config={config}
            backendHealth={backendHealth}
            sessionState={sessionState}
            audioDevices={audioDevices}
          />
        )}
      </section>
    </main>
  );
}
