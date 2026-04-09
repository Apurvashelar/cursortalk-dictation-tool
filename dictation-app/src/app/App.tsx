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
import { DiagnosticsPage } from "../pages/DiagnosticsPage";
import { HomePage, type RecentActivityItem } from "../pages/HomePage";
import {
  LocalOnboardingPage,
  type LocalOnboardingStage,
} from "../pages/LocalOnboardingPage";
import { SettingsPage } from "../pages/SettingsPage";
import { WelcomePage } from "../pages/WelcomePage";
import { useAppState } from "../state/appState";

const ONBOARDING_COMPLETE_KEY = "voiceflow-enterprise-app.onboarding-complete";
const SELECTED_MODE_KEY = "voiceflow-enterprise-app.selected-mode";
const localSetupSteps = [
  "Checking storage",
  "Preparing local folders",
  "Downloading speech model",
  "Downloading cleanup model",
  "Verifying files",
  "Preparing local runtime",
] as const;

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
  final_output: null,
  last_paste_message: null,
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
  const [isPastePending, setIsPastePending] = useState(false);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [selectedMode, setSelectedMode] = useState<"local" | "organization">(() => {
    if (typeof window === "undefined") {
      return "organization";
    }

    return window.localStorage.getItem(SELECTED_MODE_KEY) === "local"
      ? "local"
      : "organization";
  });
  const [onboardingStep, setOnboardingStep] = useState<
    "welcome" | "mode" | "local_setup" | "local_demo" | "local_test" | null
  >(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true" ? null : "welcome";
  });
  const [localSetupStepIndex, setLocalSetupStepIndex] = useState(0);

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

  useEffect(() => {
    if (!sessionState.final_output) {
      return;
    }

    const finalOutput = sessionState.final_output;

    setRecentActivity((currentItems) => {
      if (currentItems[0]?.text === finalOutput) {
        return currentItems;
      }

      const nextItem = {
        id: `${Date.now()}`,
        text: finalOutput,
        source: sessionState.used_cleanup_fallback ? "fallback" : "enterprise",
        createdAtLabel: "Just now",
      } satisfies RecentActivityItem;

      const withoutDuplicate = currentItems.filter((item) => item.text !== nextItem.text);
      return [nextItem, ...withoutDuplicate].slice(0, 3);
    });
  }, [sessionState.final_output, sessionState.used_cleanup_fallback]);

  useEffect(() => {
    if (onboardingStep !== "local_setup") {
      return;
    }

    setLocalSetupStepIndex(0);

    const timeouts: number[] = [];

    localSetupSteps.forEach((_, index) => {
      const timeoutId = window.setTimeout(() => {
        setLocalSetupStepIndex(index);

        if (index === localSetupSteps.length - 1) {
          const completeTimeoutId = window.setTimeout(() => {
            setOnboardingStep("local_demo");
          }, 900);

          timeouts.push(completeTimeoutId);
        }
      }, index * 1200);

      timeouts.push(timeoutId);
    });

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [onboardingStep]);

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

  async function pasteLatestOutput() {
    setIsPastePending(true);

    try {
      const nextState = await invoke<SessionState>("paste_latest_output");
      setSessionState(nextState);
    } finally {
      setIsPastePending(false);
    }
  }

  async function copyLatestOutput() {
    if (!sessionState.final_output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(sessionState.final_output);
    } catch (error) {
      console.error("Failed to copy latest output", error);
    }
  }

  function completeOrganizationOnboarding() {
    setSelectedMode("organization");
    window.localStorage.setItem(SELECTED_MODE_KEY, "organization");
    window.localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    setOnboardingStep(null);
    setCurrentPage("home");
  }

  function beginLocalOnboarding() {
    setSelectedMode("local");
    window.localStorage.setItem(SELECTED_MODE_KEY, "local");
    setOnboardingStep("local_setup");
  }

  function finishLocalOnboarding() {
    setSelectedMode("local");
    window.localStorage.setItem(SELECTED_MODE_KEY, "local");
    window.localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    setOnboardingStep(null);
    setCurrentPage("home");
  }

  if (onboardingStep) {
    if (onboardingStep === "welcome" || onboardingStep === "mode") {
      return (
        <WelcomePage
          step={onboardingStep}
          onContinue={() => setOnboardingStep("mode")}
          onBack={() => setOnboardingStep("welcome")}
          onChooseMode={(mode) => {
            if (mode === "local") {
              beginLocalOnboarding();
            } else {
              completeOrganizationOnboarding();
            }
          }}
        />
      );
    }

    const localOnboardingStage: LocalOnboardingStage =
      onboardingStep === "local_setup"
        ? "setup"
        : onboardingStep === "local_demo"
          ? "demo"
          : "test";

    return (
      <LocalOnboardingPage
        stage={localOnboardingStage}
        progressStepLabel={localSetupSteps[localSetupStepIndex] ?? localSetupSteps[0]}
        progressValue={((localSetupStepIndex + 1) / localSetupSteps.length) * 100}
        onBack={() => setOnboardingStep("mode")}
        onSkipDemo={() => setOnboardingStep("local_test")}
        onContinueFromDemo={() => setOnboardingStep("local_test")}
        onComplete={finishLocalOnboarding}
      />
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand-block">
          <p className="eyebrow">
            {selectedMode === "organization" ? "Enterprise Voice Dictation" : "Local Voice Dictation"}
          </p>
          <h1>VoiceFlow Desktop</h1>
          <p className="muted app-subtitle">
            {selectedMode === "organization"
              ? "A focused dictation utility for organization mode."
              : "A focused dictation utility for local mode preview."}
          </p>
        </div>
        <nav className="nav">
          <button
            className={currentPage === "home" ? "nav-button active" : "nav-button"}
            onClick={() => setCurrentPage("home")}
            type="button"
          >
            Home
          </button>
          <button
            className={currentPage === "settings" ? "nav-button active" : "nav-button"}
            onClick={() => setCurrentPage("settings")}
            type="button"
          >
            Settings
          </button>
          <button
            className={currentPage === "diagnostics" ? "nav-button active" : "nav-button"}
            onClick={() => setCurrentPage("diagnostics")}
            type="button"
          >
            Diagnostics
          </button>
        </nav>
      </header>

      <section className="content">
        {currentPage === "home" ? (
          <HomePage
            selectedMode={selectedMode}
            backendHealth={backendHealth}
            sessionState={sessionState}
            audioDevices={audioDevices}
            isRecordingActionPending={isRecordingActionPending}
            isPastePending={isPastePending}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onPasteLatest={pasteLatestOutput}
            onCopyLatest={copyLatestOutput}
            recentActivity={recentActivity}
          />
        ) : currentPage === "settings" ? (
          <SettingsPage
            selectedMode={selectedMode}
            config={config}
            backendHealth={backendHealth}
            sessionState={sessionState}
            audioDevices={audioDevices}
          />
        ) : (
          <DiagnosticsPage
            config={config}
            backendHealth={backendHealth}
            sessionState={sessionState}
            audioDevices={audioDevices}
            sttStatus={sttStatus}
            isCheckingHealth={isCheckingHealth}
            refreshBackendHealth={refreshBackendHealth}
          />
        )}
      </section>
    </main>
  );
}
