import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import type {
  AppConfig,
  AudioInputDevice,
  BackendHealth,
  LocalSetupProgress,
  LocalSetupStatus,
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
import { OrganizationOnboardingPage } from "../pages/OrganizationOnboardingPage";
import { SettingsPage } from "../pages/SettingsPage";
import { WelcomePage } from "../pages/WelcomePage";
import { useAppState } from "../state/appState";

const ONBOARDING_COMPLETE_KEY = "voiceflow-enterprise-app.onboarding-complete";
const SELECTED_MODE_KEY = "voiceflow-enterprise-app.selected-mode";
const ORGANIZATION_BASE_URL_KEY = "voiceflow-enterprise-app.organization-base-url";
const ORGANIZATION_API_KEY_KEY = "voiceflow-enterprise-app.organization-api-key";
const LOCAL_SETUP_PROGRESS_EVENT = "local-setup-progress";
const localPreflightSteps = [
  "Checking local setup",
  "Looking for speech model",
  "Looking for cleanup model",
  "Validating local files",
] as const;
const localInstallSteps = [
  "Preparing folders",
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
  cleanup_source: null,
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
    "welcome" | "mode" | "local_setup" | "local_demo" | "local_test" | "organization_setup" | null
  >(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "true" ? null : "welcome";
  });
  const [localSetupStepIndex, setLocalSetupStepIndex] = useState(0);
  const [localSetupStatus, setLocalSetupStatus] = useState<LocalSetupStatus | null>(null);
  const [localSetupStepItems, setLocalSetupStepItems] =
    useState<readonly string[]>(localPreflightSteps);
  const [organizationBaseUrl, setOrganizationBaseUrl] = useState(() => {
    if (typeof window === "undefined") {
      return "http://127.0.0.1:8080";
    }

    return (
      window.localStorage.getItem(ORGANIZATION_BASE_URL_KEY) ?? "http://127.0.0.1:8080"
    );
  });
  const [organizationApiKey, setOrganizationApiKey] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(ORGANIZATION_API_KEY_KEY) ?? "";
  });
  const [organizationSetupStatus, setOrganizationSetupStatus] = useState<
    "idle" | "checking" | "unknown" | "healthy" | "degraded" | "unreachable"
  >("idle");
  const [organizationSetupMessage, setOrganizationSetupMessage] = useState(
    "Enter your server URL, then verify the connection.",
  );

  function normalizeBaseUrl(baseUrl: string) {
    return baseUrl.trim().replace(/\/$/, "");
  }

  function buildCleanupUrl(baseUrl: string) {
    const normalized = normalizeBaseUrl(baseUrl);
    return normalized ? `${normalized}/clean` : "";
  }

  function buildHealthUrl(baseUrl: string) {
    const normalized = normalizeBaseUrl(baseUrl);
    return normalized ? `${normalized}/health` : "";
  }

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
    const cleanupUrl =
      selectedMode === "organization"
        ? buildCleanupUrl(organizationBaseUrl)
        : config?.cleanup_url ?? defaultBackendHealth.endpoint;
    const healthUrl =
      selectedMode === "organization"
        ? buildHealthUrl(organizationBaseUrl)
        : config?.health_url ?? defaultBackendHealth.healthUrl;

    try {
      const nextHealth = await invoke<{
        status: BackendHealth["status"];
        endpoint: string;
        health_url: string;
        message: string;
      }>(
        selectedMode === "organization" && cleanupUrl && healthUrl
          ? "check_backend_health_with_urls"
          : "get_backend_health",
        selectedMode === "organization" && cleanupUrl && healthUrl
          ? { cleanupUrl, healthUrl }
          : undefined,
      );

      setBackendHealth({
        status: nextHealth.status,
        endpoint: nextHealth.endpoint,
        healthUrl: nextHealth.health_url,
        message: nextHealth.message,
      });
    } catch (error) {
      setBackendHealth({
        status: "unreachable",
        endpoint: cleanupUrl || defaultBackendHealth.endpoint,
        healthUrl: healthUrl || defaultBackendHealth.healthUrl,
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
    void invoke("set_runtime_mode", {
      mode: selectedMode,
      organizationBaseUrl:
        selectedMode === "organization" ? normalizeBaseUrl(organizationBaseUrl) : null,
    }).catch((error) => {
      console.error("Failed to update runtime mode", error);
    });
  }, [organizationBaseUrl, selectedMode]);

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

    let isActive = true;
    let removeProgressListener: (() => void) | undefined;
    setLocalSetupStepIndex(0);
    setLocalSetupStatus(null);
    setLocalSetupStepItems(localPreflightSteps);
    const timeouts: number[] = [];

    const queueDemoTransition = (delayMs: number) => {
      const timeoutId = window.setTimeout(() => {
        if (isActive) {
          setOnboardingStep("local_demo");
        }
      }, delayMs);

      timeouts.push(timeoutId);
    };

    const moveThroughPreflight = (status: LocalSetupStatus) => {
      localPreflightSteps.forEach((_, index) => {
        const timeoutId = window.setTimeout(() => {
          if (!isActive) {
            return;
          }

          setLocalSetupStepItems(localPreflightSteps);
          setLocalSetupStepIndex(index);
        }, index * 220);

        timeouts.push(timeoutId);
      });

      const finishTimeoutId = window.setTimeout(() => {
        if (!isActive) {
          return;
        }

        setLocalSetupStatus(status);

        if (status.status === "complete") {
          setLocalSetupStepItems([...localPreflightSteps, "Setup already completed"]);
          setLocalSetupStepIndex(localPreflightSteps.length);
          queueDemoTransition(1200);
        }
      }, localPreflightSteps.length * 220 + 60);

      timeouts.push(finishTimeoutId);
    };

    const runSetupFlow = async () => {
      try {
        removeProgressListener = await listen<LocalSetupProgress>(
          LOCAL_SETUP_PROGRESS_EVENT,
          (event) => {
            if (!isActive) {
              return;
            }

            const stepIndex = localInstallSteps.indexOf(
              event.payload.step as (typeof localInstallSteps)[number],
            );

            if (stepIndex >= 0) {
              setLocalSetupStepItems(localInstallSteps);
              setLocalSetupStepIndex(stepIndex);
            }

            setLocalSetupStatus((currentStatus) => ({
              status: currentStatus?.status ?? "partial",
              message: event.payload.message,
              storage_path: currentStatus?.storage_path ?? "",
              stt_model_dir: currentStatus?.stt_model_dir ?? "",
              cleanup_model_dir: currentStatus?.cleanup_model_dir ?? "",
              missing_items: currentStatus?.missing_items ?? [],
              detected_legacy_cleanup: currentStatus?.detected_legacy_cleanup ?? false,
            }));
          },
        );

        const status = await invoke<LocalSetupStatus>("get_local_setup_status");

        if (!isActive) {
          return;
        }

        moveThroughPreflight(status);

        if (status.status === "complete") {
          return;
        }

        const installStartDelay = localPreflightSteps.length * 220 + 120;
        const installTimeoutId = window.setTimeout(async () => {
          try {
            const finalStatus = await invoke<LocalSetupStatus>("run_local_setup");

            if (!isActive) {
              return;
            }

            setLocalSetupStatus(finalStatus);
            setLocalSetupStepItems(localInstallSteps);
            setLocalSetupStepIndex(localInstallSteps.length - 1);
            queueDemoTransition(900);
          } catch (error) {
            if (!isActive) {
              return;
            }

            console.error("Failed to run local setup", error);
            setLocalSetupStatus((currentStatus) => ({
              status: currentStatus?.status ?? status.status,
              message: `Local setup could not be completed. ${String(error)}`,
              storage_path: currentStatus?.storage_path ?? status.storage_path,
              stt_model_dir: currentStatus?.stt_model_dir ?? status.stt_model_dir,
              cleanup_model_dir: currentStatus?.cleanup_model_dir ?? status.cleanup_model_dir,
              missing_items: currentStatus?.missing_items ?? status.missing_items,
              detected_legacy_cleanup:
                currentStatus?.detected_legacy_cleanup ?? status.detected_legacy_cleanup,
            }));
          }
        }, installStartDelay);

        timeouts.push(installTimeoutId);
      } catch (error) {
        if (!isActive) {
          return;
        }

        console.error("Failed to detect local setup", error);
        setLocalSetupStatus({
          status: "missing",
          message: `Local setup check could not be completed. ${String(error)}`,
          storage_path: "",
          stt_model_dir: "",
          cleanup_model_dir: "",
          missing_items: [],
          detected_legacy_cleanup: false,
        });
      }
    };

    void runSetupFlow();

    return () => {
      isActive = false;
      removeProgressListener?.();
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
    window.localStorage.setItem(ORGANIZATION_BASE_URL_KEY, normalizeBaseUrl(organizationBaseUrl));
    window.localStorage.setItem(ORGANIZATION_API_KEY_KEY, organizationApiKey);
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

  async function checkOrganizationConnection() {
    const cleanupUrl = buildCleanupUrl(organizationBaseUrl);
    const healthUrl = buildHealthUrl(organizationBaseUrl);

    if (!cleanupUrl || !healthUrl) {
      setOrganizationSetupStatus("unreachable");
      setOrganizationSetupMessage("Enter a valid server URL first.");
      return;
    }

    setOrganizationSetupStatus("checking");
    setOrganizationSetupMessage("Checking connection to the organization backend.");

    try {
      const nextHealth = await invoke<{
        status: BackendHealth["status"];
        endpoint: string;
        health_url: string;
        message: string;
      }>("check_backend_health_with_urls", {
        cleanupUrl,
        healthUrl,
      });

      setOrganizationSetupStatus(nextHealth.status);
      setOrganizationSetupMessage(nextHealth.message);
      setBackendHealth({
        status: nextHealth.status,
        endpoint: nextHealth.endpoint,
        healthUrl: nextHealth.health_url,
        message: nextHealth.message,
      });
    } catch (error) {
      setOrganizationSetupStatus("unreachable");
      setOrganizationSetupMessage(`Connection check failed. ${String(error)}`);
    }
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
              setSelectedMode("organization");
              setOnboardingStep("organization_setup");
            }
          }}
        />
      );
    }

    if (onboardingStep === "organization_setup") {
      return (
        <OrganizationOnboardingPage
          apiKey={organizationApiKey}
          baseUrl={organizationBaseUrl}
          onApiKeyChange={(value) => setOrganizationApiKey(value)}
          onBack={() => setOnboardingStep("mode")}
          onBaseUrlChange={(value) => {
            setOrganizationBaseUrl(value);
            setOrganizationSetupStatus("idle");
            setOrganizationSetupMessage("Enter your server URL, then verify the connection.");
          }}
          onCheckConnection={checkOrganizationConnection}
          onContinue={completeOrganizationOnboarding}
          status={organizationSetupStatus}
          statusMessage={organizationSetupMessage}
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
        stepItems={[...localSetupStepItems]}
        progressStepLabel={localSetupStepItems[localSetupStepIndex] ?? localSetupStepItems[0]}
        progressValue={((localSetupStepIndex + 1) / localSetupStepItems.length) * 100}
        statusMessage={localSetupStatus?.message}
        detectedStatus={localSetupStatus?.status}
        missingItems={localSetupStatus?.missing_items}
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
            organizationBaseUrl={selectedMode === "organization" ? organizationBaseUrl : undefined}
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
