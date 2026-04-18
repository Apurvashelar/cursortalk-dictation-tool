import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Activity, AudioLines, House, PlugZap, Settings2, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  AppConfig,
  AudioInputDevice,
  AuthState,
  BackendHealth,
  DictationLogEntry,
  DictationLogSummary,
  LocalSetupProgress,
  LocalSetupStatus,
  PermissionStatusReport,
  SessionState,
  SttStatus,
} from "../api/backend";
import { defaultAuthState, defaultBackendHealth } from "../api/backend";
import { AuthOnboardingPage } from "../pages/AuthOnboardingPage";
import { permissionsNeedAction } from "../components/PermissionPrompt";
import { VoiceFlowMark } from "../components/VoiceFlowMark";
import { HomePage, type RecentActivityItem, type UsageStats } from "../pages/HomePage";
import {
  LocalOnboardingPage,
  type LocalOnboardingStage,
} from "../pages/LocalOnboardingPage";
import { OverlayPage } from "../pages/OverlayPage";
import { OrganizationOnboardingPage } from "../pages/OrganizationOnboardingPage";
import { SettingsPage, type SettingsSection } from "../pages/SettingsPage";
import { WelcomePage } from "../pages/WelcomePage";
import { useAppState } from "../state/appState";

const ONBOARDING_COMPLETE_KEY = "voiceflow-enterprise-app.onboarding-complete";
const SELECTED_MODE_KEY = "voiceflow-enterprise-app.selected-mode";
const ORGANIZATION_BASE_URL_KEY = "voiceflow-enterprise-app.organization-base-url";
const ORGANIZATION_API_KEY_KEY = "voiceflow-enterprise-app.organization-api-key";
const HOTKEY_KEY = "voiceflow-enterprise-app.hotkey";
const LOGGING_ENABLED_KEY = "voiceflow-enterprise-app.logging-enabled";
const PASTE_RAW_ON_FAILURE_KEY = "voiceflow-enterprise-app.paste-raw-on-failure";
const OVERLAY_POSITION_KEY = "voiceflow-enterprise-app.overlay-position";
const LAUNCH_AT_LOGIN_KEY = "voiceflow-enterprise-app.launch-at-login";
const SHOW_IN_DOCK_KEY = "voiceflow-enterprise-app.show-in-dock";
const PREFERRED_AUDIO_INPUT_KEY = "voiceflow-enterprise-app.preferred-audio-input";
const START_SOUND_ENABLED_KEY = "voiceflow-enterprise-app.start-sound-enabled";
const DONE_SOUND_ENABLED_KEY = "voiceflow-enterprise-app.done-sound-enabled";
const LOCAL_SETUP_PROGRESS_EVENT = "local-setup-progress";
const TRAY_NAVIGATE_EVENT = "tray-navigate";
const AUTH_EVENT = "auth-state-changed";
const APP_VERSION = "0.1.0";
const STAGING_AUTH_BASE_URL = "https://staging-api.cursortalk.com";
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

const defaultPermissionStatus: PermissionStatusReport = {
  microphone: {
    status: "unknown",
    label: "Unknown",
    message: "Microphone permission has not been checked yet.",
  },
  accessibility: {
    status: "unknown",
    label: "Unknown",
    message: "Accessibility permission has not been checked yet.",
  },
};

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function authDisplayName(authState: AuthState) {
  const user = authState.user;
  if (!user) {
    return "Guest account";
  }

  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.email;
}

function authInitials(authState: AuthState) {
  const user = authState.user;
  if (!user) {
    return null;
  }

  const initials = [user.first_name, user.last_name]
    .map((value) => value.trim().charAt(0))
    .join("")
    .toUpperCase();

  if (initials) {
    return initials.slice(0, 2);
  }

  return user.email.trim().charAt(0).toUpperCase() || null;
}

function formatCreatedAt(timestampMs: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(timestampMs));
}

function mapLogEntryToRecentActivity(entry: DictationLogEntry): RecentActivityItem {
  return {
    id: `${entry.timestamp_ms}-${entry.final_output.slice(0, 12)}`,
    text: entry.final_output,
    source: entry.status === "fallback" ? "fallback" : "enterprise",
    createdAtLabel: formatCreatedAt(entry.timestamp_ms),
    wordCount: entry.word_count || countWords(entry.final_output),
    latencyMs: entry.total_latency_ms,
    status: entry.status === "error" ? "error" : entry.status === "fallback" ? "fallback" : "success",
  };
}

function usageStatsFromSummary(summary: DictationLogSummary | null, loggingEnabled: boolean): UsageStats {
  return {
    dictations: summary?.dictations ?? 0,
    words: summary?.words ?? 0,
    averageLatencyMs: summary?.average_latency_ms ?? null,
    loggingEnabled,
  };
}

async function browserMicrophonePermissionState(
  promptForAccess: boolean,
): Promise<PermissionStatusReport["microphone"] | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }

  if (!promptForAccess && "permissions" in navigator && navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({
        name: "microphone" as PermissionName,
      });

      if (status.state === "granted") {
        return {
          status: "ready",
          label: "Granted",
          message: "Microphone access is available for recording.",
        };
      }

      if (status.state === "denied") {
        return {
          status: "needs_access",
          label: "Allow access",
          message: "Allow Microphone access so Voice Dictation can capture speech.",
        };
      }
    } catch {
      // Fall through to the native/backend probe if the Permissions API is unavailable.
    }
  }

  if (!promptForAccess) {
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return {
      status: "ready",
      label: "Granted",
      message: "Microphone access is available for recording.",
    };
  } catch (error) {
    const normalized = String(error).toLowerCase();
    const needsAccess =
      normalized.includes("notallowederror") ||
      normalized.includes("permission denied") ||
      normalized.includes("permissiondismissederror") ||
      normalized.includes("security");

    return {
      status: needsAccess ? "needs_access" : "error",
      label: needsAccess ? "Allow access" : "Needs attention",
      message: needsAccess
        ? "Allow Microphone access so Voice Dictation can capture speech."
        : `Microphone access could not be confirmed. ${String(error)}`,
    };
  }
}

function mergePermissionReport(
  nativeReport: PermissionStatusReport,
  browserMicrophone: PermissionStatusReport["microphone"] | null,
): PermissionStatusReport {
  if (!browserMicrophone) {
    return nativeReport;
  }

  return {
    ...nativeReport,
    microphone: browserMicrophone,
  };
}

export function App() {
  const { currentPage, setCurrentPage } = useAppState();
  const windowLabel = getCurrentWebviewWindow().label;
  const isOverlayWindow = windowLabel === "overlay";
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [backendHealth, setBackendHealth] = useState<BackendHealth>(defaultBackendHealth);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>(defaultSessionState);
  const [audioDevices, setAudioDevices] = useState<AudioInputDevice[]>([]);
  const [sttStatus, setSttStatus] = useState<SttStatus>(defaultSttStatus);
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatusReport>(defaultPermissionStatus);
  const [isRecordingActionPending, setIsRecordingActionPending] = useState(false);
  const [isRefreshingPermissions, setIsRefreshingPermissions] = useState(false);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [dictationLogSummary, setDictationLogSummary] = useState<DictationLogSummary | null>(null);
  const [dictationLogEntries, setDictationLogEntries] = useState<DictationLogEntry[]>([]);
  const [hotkey, setHotkey] = useState(() => {
    if (typeof window === "undefined") {
      return defaultSessionState.hotkey;
    }

    return window.localStorage.getItem(HOTKEY_KEY) ?? defaultSessionState.hotkey;
  });
  const [loggingEnabled, setLoggingEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(LOGGING_ENABLED_KEY) !== "false";
  });
  const [pasteRawOnFailure, setPasteRawOnFailure] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(PASTE_RAW_ON_FAILURE_KEY) !== "false";
  });
  const [overlayPosition, setOverlayPosition] = useState(() => {
    if (typeof window === "undefined") {
      return "default";
    }

    return window.localStorage.getItem(OVERLAY_POSITION_KEY) ?? "default";
  });
  const [launchAtLogin, setLaunchAtLogin] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(LAUNCH_AT_LOGIN_KEY) !== "false";
  });
  const [showInDock, setShowInDock] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(SHOW_IN_DOCK_KEY) === "true";
  });
  const [showInDockHydrated, setShowInDockHydrated] = useState(false);
  const [preferredAudioInput, setPreferredAudioInput] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(PREFERRED_AUDIO_INPUT_KEY) ?? "";
  });
  const [startSoundEnabled, setStartSoundEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(START_SOUND_ENABLED_KEY) !== "false";
  });
  const [doneSoundEnabled, setDoneSoundEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(DONE_SOUND_ENABLED_KEY) !== "false";
  });
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const [authEntryPoint, setAuthEntryPoint] = useState<"onboarding" | "settings">("onboarding");
  const [postAuthStep, setPostAuthStep] = useState<"mode" | "organization_setup">("mode");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"local" | "organization">(() => {
    if (typeof window === "undefined") {
      return "organization";
    }

    return window.localStorage.getItem(SELECTED_MODE_KEY) === "local"
      ? "local"
      : "organization";
  });
  const [onboardingStep, setOnboardingStep] = useState<
    | "welcome"
    | "auth"
    | "mode"
    | "local_setup"
    | "local_test"
    | "organization_setup"
    | "organization_test"
    | null
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
  const [localSetupAwaitingPermissions, setLocalSetupAwaitingPermissions] = useState(false);
  const [organizationBaseUrl, setOrganizationBaseUrl] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(ORGANIZATION_BASE_URL_KEY) ?? "";
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
  const [organizationSetupEntryPoint, setOrganizationSetupEntryPoint] = useState<
    "onboarding" | "settings"
  >("onboarding");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("general");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const previousSessionStateRef = useRef<SessionState["state"]>(defaultSessionState.state);
  const onboardingPermissionPromptRef = useRef<string | null>(null);
  const hasOrganizationAccess = Boolean(authState.organization_id);

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

  function resolveAuthBaseUrlForClient() {
    return authState.auth_base_url ?? STAGING_AUTH_BASE_URL;
  }

  async function loadConfig() {
    const nextConfig = await invoke<AppConfig>("get_config");
    setConfig(nextConfig);
  }

  async function loadSessionState() {
    const nextState = await invoke<SessionState>("get_session_state");
    setSessionState(nextState);
  }

  async function loadAuthState() {
    const nextState = await invoke<AuthState>("get_auth_state");
    setAuthState(nextState);
    return nextState;
  }

  async function refreshAuthState() {
    const nextState = await invoke<AuthState>("refresh_auth_state", {
      authBaseUrl: resolveAuthBaseUrlForClient(),
    });
    setAuthState(nextState);
    return nextState;
  }

  async function loadLaunchAtLoginPreference() {
    try {
      const enabled = await invoke<boolean>("get_launch_at_login_enabled");
      setLaunchAtLogin(enabled);
      window.localStorage.setItem(LAUNCH_AT_LOGIN_KEY, String(enabled));
    } catch (error) {
      console.error("Failed to load launch at login preference", error);
    }
  }

  async function loadShowInDockPreference() {
    try {
      const nativeVisible = await invoke<boolean>("get_show_in_dock_enabled");
      setShowInDock(nativeVisible);
      window.localStorage.setItem(SHOW_IN_DOCK_KEY, String(nativeVisible));
    } catch (error) {
      console.error("Failed to load show in dock preference", error);
    } finally {
      setShowInDockHydrated(true);
    }
  }

  async function applyHotkey(nextHotkey: string, persist = true) {
    const snapshot = await invoke<SessionState>("set_hotkey", {
      hotkey: nextHotkey,
    });

    setSessionState(snapshot);
    setHotkey(snapshot.hotkey);
    setConfig((currentConfig) =>
      currentConfig
        ? {
            ...currentConfig,
            hotkey: snapshot.hotkey,
          }
        : null,
    );

    if (persist) {
      window.localStorage.setItem(HOTKEY_KEY, snapshot.hotkey);
    }
  }

  async function applyLaunchAtLogin(enabled: boolean) {
    const confirmed = await invoke<boolean>("set_launch_at_login", {
      enabled,
    });

    setLaunchAtLogin(confirmed);
    window.localStorage.setItem(LAUNCH_AT_LOGIN_KEY, String(confirmed));
  }

  async function loadAudioDevices() {
    const nextDevices = await invoke<AudioInputDevice[]>("list_audio_input_devices");
    setAudioDevices(nextDevices);
  }

  async function loadSttStatus() {
    const nextStatus = await invoke<SttStatus>("get_stt_status");
    setSttStatus(nextStatus);
  }

  async function loadPermissionStatus(promptForMicrophoneAccess = false) {
    const nativeStatus = await invoke<PermissionStatusReport>("get_permission_status_report");
    const browserMicrophone = await browserMicrophonePermissionState(promptForMicrophoneAccess);
    const nextStatus = mergePermissionReport(nativeStatus, browserMicrophone);
    setPermissionStatus(nextStatus);
    return nextStatus;
  }

  async function loadDictationLogSummary() {
    try {
      const nextSummary = await invoke<DictationLogSummary>("get_dictation_log_summary");
      setDictationLogSummary(nextSummary);
      setRecentActivity(nextSummary.recent_entries.map(mapLogEntryToRecentActivity));
    } catch (error) {
      console.error("Failed to load dictation log summary", error);
      setDictationLogSummary(null);
      setRecentActivity([]);
    }
  }

  async function loadRecentDictationEntries(limit = 20) {
    try {
      const nextEntries = await invoke<DictationLogEntry[]>("get_recent_dictation_entries", {
        limit,
      });
      setDictationLogEntries(nextEntries);
    } catch (error) {
      console.error("Failed to load recent dictation entries", error);
      setDictationLogEntries([]);
    }
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
    void loadAuthState().then((nextState) => {
      if (nextState.is_authenticated) {
        void refreshAuthState().catch((error) => {
          console.error("Failed to refresh auth state", error);
        });
      }
    });
    void loadLaunchAtLoginPreference();
    void loadShowInDockPreference();
    void loadAudioDevices();
    void loadSttStatus();
    void loadPermissionStatus();
    void loadDictationLogSummary();
    void loadRecentDictationEntries();
  }, []);

  useEffect(() => {
    const storedHotkey = window.localStorage.getItem(HOTKEY_KEY);
    if (!storedHotkey || storedHotkey === defaultSessionState.hotkey) {
      return;
    }

    void applyHotkey(storedHotkey).catch((error) => {
      console.error("Failed to restore stored hotkey", error);
    });
    // Restore once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refreshBackendHealth();
    // The initial check should run once after the shell mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedMode !== "organization" || hasOrganizationAccess) {
      return;
    }

    setSelectedMode("local");
    window.localStorage.setItem(SELECTED_MODE_KEY, "local");
  }, [hasOrganizationAccess, selectedMode]);

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
    let isMounted = true;

    const setupListener = async () => {
      const unlisten = await listen<AuthState>(AUTH_EVENT, (event) => {
        if (isMounted) {
          setAuthState(event.payload);
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
    if (isOverlayWindow) {
      return;
    }

    let isMounted = true;

    const setupListener = async () => {
      const unlisten = await listen<string>(TRAY_NAVIGATE_EVENT, (event) => {
        if (!isMounted) {
          return;
        }

        if (event.payload === "settings" || event.payload === "diagnostics") {
          setCurrentPage("settings");
          setSettingsSection(event.payload === "diagnostics" ? "diagnostics" : "general");
          return;
        }

        setCurrentPage("home");
      });

      return unlisten;
    };

    const unlistenPromise = setupListener();

    return () => {
      isMounted = false;
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [isOverlayWindow, setCurrentPage]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const previousState = previousSessionStateRef.current;
    previousSessionStateRef.current = sessionState.state;

    const wasBusy =
      previousState === "recording" ||
      previousState === "transcribing" ||
      previousState === "cleaning" ||
      previousState === "pasting";
    const isSettledState =
      sessionState.state === "idle" || sessionState.state === "error";

    if (wasBusy && isSettledState) {
      void loadDictationLogSummary();
      void loadRecentDictationEntries();
    }
  }, [sessionState]);

  useEffect(() => {
    window.localStorage.setItem(LOGGING_ENABLED_KEY, String(loggingEnabled));
  }, [loggingEnabled]);

  useEffect(() => {
    window.localStorage.setItem(PASTE_RAW_ON_FAILURE_KEY, String(pasteRawOnFailure));
    void invoke("set_paste_raw_on_failure", {
      enabled: pasteRawOnFailure,
    }).catch((error) => {
      console.error("Failed to update paste raw on failure preference", error);
    });
  }, [pasteRawOnFailure]);

  useEffect(() => {
    window.localStorage.setItem(OVERLAY_POSITION_KEY, overlayPosition);
    void invoke("set_overlay_position", {
      position: overlayPosition,
    }).catch((error) => {
      console.error("Failed to update overlay position", error);
    });
  }, [overlayPosition]);

  useEffect(() => {
    if (!showInDockHydrated) {
      return;
    }

    window.localStorage.setItem(SHOW_IN_DOCK_KEY, String(showInDock));
    void invoke("set_show_in_dock", {
      visible: showInDock,
    }).catch((error) => {
      console.error("Failed to update dock visibility", error);
    });
  }, [showInDock, showInDockHydrated]);

  useEffect(() => {
    window.localStorage.setItem(PREFERRED_AUDIO_INPUT_KEY, preferredAudioInput);
    window.localStorage.setItem(START_SOUND_ENABLED_KEY, String(startSoundEnabled));
    window.localStorage.setItem(DONE_SOUND_ENABLED_KEY, String(doneSoundEnabled));
    void invoke("set_audio_preferences", {
      preferredAudioInput: preferredAudioInput || null,
      startSoundEnabled,
      doneSoundEnabled,
    }).catch((error) => {
      console.error("Failed to update audio preferences", error);
    });
  }, [doneSoundEnabled, preferredAudioInput, startSoundEnabled]);

  useEffect(() => {
    if (onboardingStep !== "local_setup") {
      return;
    }

    let isActive = true;
    let removeProgressListener: (() => void) | undefined;
    setLocalSetupStepIndex(0);
    setLocalSetupStatus(null);
    setLocalSetupStepItems(localPreflightSteps);
    setLocalSetupAwaitingPermissions(false);
    const timeouts: number[] = [];

    const queuePostSetupTransition = (delayMs: number) => {
      const timeoutId = window.setTimeout(() => {
        if (isActive) {
          void (async () => {
            const nextPermissionStatus = await loadPermissionStatus(true);

            if (!isActive) {
              return;
            }

            if (permissionsNeedAction(nextPermissionStatus)) {
              setLocalSetupAwaitingPermissions(true);
            } else {
              setOnboardingStep("local_test");
            }
          })();
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
          queuePostSetupTransition(1200);
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
            queuePostSetupTransition(900);
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

  useEffect(() => {
    if (
      onboardingStep === "organization_setup" &&
      (organizationSetupStatus === "healthy" || organizationSetupStatus === "degraded") &&
      permissionsNeedAction(permissionStatus)
    ) {
      if (onboardingPermissionPromptRef.current === "organization_setup") {
        return;
      }

      onboardingPermissionPromptRef.current = "organization_setup";
      void refreshPermissionStatus().catch((error) => {
        console.error("Failed to refresh onboarding permissions", error);
      });
      return;
    }

    if (
      onboardingStep === "local_setup" &&
      localSetupAwaitingPermissions &&
      permissionsNeedAction(permissionStatus)
    ) {
      if (onboardingPermissionPromptRef.current === "local_setup") {
        return;
      }

      onboardingPermissionPromptRef.current = "local_setup";
      void refreshPermissionStatus().catch((error) => {
        console.error("Failed to refresh onboarding permissions", error);
      });
      return;
    }

    onboardingPermissionPromptRef.current = null;
  }, [
    localSetupAwaitingPermissions,
    onboardingStep,
    organizationSetupStatus,
    permissionStatus,
  ]);

  async function startRecording() {
    setIsRecordingActionPending(true);

    try {
      const nextState = await invoke<SessionState>("start_recording");
      setSessionState(nextState);
    } catch (error) {
      console.error("Failed to start recording", error);
      await loadSessionState();
    } finally {
      setIsRecordingActionPending(false);
    }
  }

  async function stopRecording(shouldPasteOverride?: boolean) {
    setIsRecordingActionPending(true);

    try {
      const nextState = await invoke<SessionState>("stop_recording", {
        shouldPasteOverride: shouldPasteOverride ?? null,
      });
      setSessionState(nextState);
    } catch (error) {
      console.error("Failed to stop recording", error);
      await loadSessionState();
    } finally {
      setIsRecordingActionPending(false);
    }
  }

  async function refreshPermissionStatus() {
    setIsRefreshingPermissions(true);
    try {
      return await loadPermissionStatus(true);
    } finally {
      setIsRefreshingPermissions(false);
    }
  }

  async function refreshOnboardingPermissions() {
    const nextPermissionStatus = await refreshPermissionStatus();

    if (
      onboardingStep === "local_setup" &&
      localSetupAwaitingPermissions &&
      !permissionsNeedAction(nextPermissionStatus)
    ) {
      setOnboardingStep("local_test");
    }
  }

  async function openPermissionSettings(permission: "microphone" | "accessibility") {
    try {
      await invoke("open_permission_settings", { permission });
    } catch (error) {
      console.error(`Failed to open ${permission} settings`, error);
    }
  }

  const usageStats = usageStatsFromSummary(dictationLogSummary, loggingEnabled);

  async function clearRecentActivity() {
    try {
      await invoke("clear_dictation_logs");
    } catch (error) {
      console.error("Failed to clear dictation logs", error);
    }
    setRecentActivity([]);
    setDictationLogSummary({
      dictations: 0,
      words: 0,
      average_latency_ms: null,
      recent_entries: [],
    });
    setDictationLogEntries([]);
  }

  async function completeOrganizationOnboarding() {
    if (!hasOrganizationAccess) {
      setAuthEntryPoint(organizationSetupEntryPoint);
      setPostAuthStep("organization_setup");
      setAuthError("Sign in with an organization account before finishing organization setup.");
      setOnboardingStep("auth");
      return;
    }

    setSelectedMode("organization");
    await invoke("set_dictation_test_mode", { enabled: false }).catch((error) => {
      console.error("Failed to disable organization test mode", error);
    });
    window.localStorage.setItem(ORGANIZATION_BASE_URL_KEY, normalizeBaseUrl(organizationBaseUrl));
    window.localStorage.setItem(ORGANIZATION_API_KEY_KEY, organizationApiKey);
    window.localStorage.setItem(SELECTED_MODE_KEY, "organization");
    window.localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    setOnboardingStep(null);
    setCurrentPage(organizationSetupEntryPoint === "settings" ? "settings" : "home");
    setSettingsSection("general");
    setOrganizationSetupEntryPoint("onboarding");
  }

  function beginLocalOnboarding() {
    setSelectedMode("local");
    window.localStorage.setItem(SELECTED_MODE_KEY, "local");
    setOnboardingStep("local_setup");
  }

  function applySelectedMode(mode: "local" | "organization") {
    setSelectedMode(mode);
    window.localStorage.setItem(SELECTED_MODE_KEY, mode);
  }

  function openOrganizationSetupFromSettings() {
    setOrganizationSetupEntryPoint("settings");
    setOrganizationSetupStatus("idle");
    setOrganizationSetupMessage("Enter your server URL, then verify the connection.");
    setOnboardingStep("organization_setup");
  }

  function handleModeChange(mode: "local" | "organization") {
    if (mode === "local") {
      applySelectedMode("local");
      return;
    }

    if (!hasOrganizationAccess) {
      setAuthEntryPoint("settings");
      setPostAuthStep("organization_setup");
      setAuthError("Sign in with an organization account before enabling organization mode.");
      setOnboardingStep("auth");
      return;
    }

    const hasUsableOrganizationConfig =
      Boolean(normalizeBaseUrl(organizationBaseUrl)) &&
      (organizationSetupStatus === "healthy" || organizationSetupStatus === "degraded");

    if (hasUsableOrganizationConfig) {
      applySelectedMode("organization");
      return;
    }

    openOrganizationSetupFromSettings();
  }

  function skipAuthentication() {
    setAuthError(null);
    setPostAuthStep("mode");
    if (authEntryPoint === "settings") {
      setOnboardingStep(null);
      return;
    }
    setOnboardingStep("mode");
  }

  function openAuthenticationFromSettings() {
    setAuthEntryPoint("settings");
    setPostAuthStep("mode");
    setAuthError(null);
    setIsAccountMenuOpen(false);
    setOnboardingStep("auth");
  }

  async function handleSignIn(input: { email: string; password: string }) {
    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      const nextState = await invoke<AuthState>("sign_in", {
        email: input.email,
        password: input.password,
        authBaseUrl: resolveAuthBaseUrlForClient(),
      });
      setAuthState(nextState);

      if (postAuthStep === "organization_setup") {
        if (nextState.organization_id) {
          setAuthError(null);
          setOrganizationSetupEntryPoint(authEntryPoint);
          setOnboardingStep("organization_setup");
        } else {
          setAuthError("This account is not attached to an organization. Sign in with an organization account to continue.");
          return;
        }
      } else if (authEntryPoint === "settings") {
        setOnboardingStep(null);
        setCurrentPage("settings");
        setSettingsSection("account");
      } else {
        setOnboardingStep("mode");
      }
      setPostAuthStep("mode");
    } catch (error) {
      setAuthError(String(error));
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function handleSignUp(input: { email: string; password: string }) {
    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      const nextState = await invoke<AuthState>("sign_up", {
        email: input.email,
        password: input.password,
        authBaseUrl: resolveAuthBaseUrlForClient(),
      });
      setAuthState(nextState);

      if (postAuthStep === "organization_setup") {
        if (nextState.organization_id) {
          setAuthError(null);
          setOrganizationSetupEntryPoint(authEntryPoint);
          setOnboardingStep("organization_setup");
        } else {
          setAuthError("This account was created, but it is not attached to an organization yet.");
          return;
        }
      } else if (authEntryPoint === "settings") {
        setOnboardingStep(null);
        setCurrentPage("settings");
        setSettingsSection("account");
      } else {
        setOnboardingStep("mode");
      }
      setPostAuthStep("mode");
    } catch (error) {
      setAuthError(String(error));
    } finally {
      setIsSubmittingAuth(false);
    }
  }

  async function finishLocalOnboarding() {
    setSelectedMode("local");
    await invoke("set_dictation_test_mode", { enabled: false }).catch((error) => {
      console.error("Failed to disable local test mode", error);
    });
    window.localStorage.setItem(SELECTED_MODE_KEY, "local");
    window.localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
    setOnboardingStep(null);
    setCurrentPage("home");
    setSettingsSection("general");
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

  useEffect(() => {
    void invoke("set_dictation_test_mode", {
      enabled: onboardingStep === "local_test" || onboardingStep === "organization_test",
    }).catch((error) => {
      console.error("Failed to update dictation test mode", error);
    });
  }, [onboardingStep]);

  if (isOverlayWindow) {
    return <OverlayPage sessionState={sessionState} />;
  }

  if (onboardingStep) {
    if (onboardingStep === "welcome" || onboardingStep === "mode") {
      return (
        <WelcomePage
          step={onboardingStep}
          onContinue={() => {
            setAuthEntryPoint("onboarding");
            setPostAuthStep("mode");
            setAuthError(null);
            setOnboardingStep("auth");
          }}
          onBack={() => (onboardingStep === "mode" ? setOnboardingStep("auth") : setOnboardingStep("welcome"))}
          onChooseMode={(mode) => {
            if (mode === "local") {
              beginLocalOnboarding();
            } else if (!hasOrganizationAccess) {
              setSelectedMode("organization");
              setAuthEntryPoint("onboarding");
              setPostAuthStep("organization_setup");
              setAuthError("Sign in with an organization account before configuring organization mode.");
              setOnboardingStep("auth");
            } else {
              setOrganizationSetupEntryPoint("onboarding");
              setSelectedMode("organization");
              setOnboardingStep("organization_setup");
            }
          }}
        />
      );
    }

    if (onboardingStep === "auth") {
      return (
        <AuthOnboardingPage
          errorMessage={authError}
          isSubmitting={isSubmittingAuth}
          onBack={() => {
            setAuthError(null);
            if (authEntryPoint === "settings") {
              setOnboardingStep(null);
              setCurrentPage("settings");
              setSettingsSection("account");
              return;
            }

            setOnboardingStep("welcome");
          }}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onSkip={skipAuthentication}
        />
      );
    }

    if (onboardingStep === "organization_setup" || onboardingStep === "organization_test") {
      return (
        <OrganizationOnboardingPage
          stage={onboardingStep === "organization_setup" ? "setup" : "test"}
          hotkey={hotkey}
          apiKey={organizationApiKey}
          baseUrl={organizationBaseUrl}
          onApiKeyChange={(value) => setOrganizationApiKey(value)}
          onBack={() =>
            onboardingStep === "organization_test"
              ? setOnboardingStep("organization_setup")
              : organizationSetupEntryPoint === "settings"
                ? (() => {
                    setOnboardingStep(null);
                    setCurrentPage("settings");
                    setSettingsSection("general");
                    setOrganizationSetupEntryPoint("onboarding");
                  })()
                : setOnboardingStep("mode")
          }
          onBaseUrlChange={(value) => {
            setOrganizationBaseUrl(value);
            setOrganizationSetupStatus("idle");
            setOrganizationSetupMessage("Enter your server URL, then verify the connection.");
          }}
          onCheckConnection={checkOrganizationConnection}
          onContinueToTest={() => setOnboardingStep("organization_test")}
          onComplete={completeOrganizationOnboarding}
          permissionStatus={permissionStatus}
          isRefreshingPermissions={isRefreshingPermissions}
          onRefreshPermissions={refreshPermissionStatus}
          onOpenPermissionSettings={openPermissionSettings}
          sessionState={sessionState}
          isRecordingActionPending={isRecordingActionPending}
          onStartRecording={startRecording}
          onStopRecording={() => stopRecording(false)}
          status={organizationSetupStatus}
          statusMessage={organizationSetupMessage}
        />
      );
    }

    const localOnboardingStage: LocalOnboardingStage =
      onboardingStep === "local_setup" ? "setup" : "test";

    return (
      <LocalOnboardingPage
        stage={localOnboardingStage}
        hotkey={hotkey}
        stepItems={[...localSetupStepItems]}
        progressStepLabel={localSetupStepItems[localSetupStepIndex] ?? localSetupStepItems[0]}
        progressValue={((localSetupStepIndex + 1) / localSetupStepItems.length) * 100}
        statusMessage={localSetupStatus?.message}
        detectedStatus={localSetupStatus?.status}
        missingItems={localSetupStatus?.missing_items}
        showPermissionPrompt={localSetupAwaitingPermissions && permissionsNeedAction(permissionStatus)}
        permissionStatus={permissionStatus}
        isRefreshingPermissions={isRefreshingPermissions}
        onRefreshPermissions={refreshOnboardingPermissions}
        onOpenPermissionSettings={openPermissionSettings}
        onBack={() => setOnboardingStep("mode")}
        onComplete={finishLocalOnboarding}
        sessionState={sessionState}
        isRecordingActionPending={isRecordingActionPending}
        onStartRecording={startRecording}
        onStopRecording={() => stopRecording(false)}
      />
    );
  }

  const settingsItems: Array<{
    section: SettingsSection;
    label: string;
    icon: typeof SlidersHorizontal;
  }> = [
    { section: "general", label: "General", icon: SlidersHorizontal },
    { section: "account", label: "Account", icon: UserRound },
    { section: "audio", label: "Audio", icon: AudioLines },
    { section: "connection", label: "Connection", icon: PlugZap },
    { section: "advanced", label: "Advanced", icon: Settings2 },
    { section: "diagnostics", label: "Diagnostics", icon: Activity },
  ];

  function openHome() {
    setCurrentPage("home");
    setIsAccountMenuOpen(false);
  }

  function openSettingsSection(section: SettingsSection) {
    setCurrentPage("settings");
    setSettingsSection(section);
    setIsAccountMenuOpen(false);
  }

  function resetOnboarding() {
    window.localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
    setIsAccountMenuOpen(false);
    setCurrentPage("home");
    setSettingsSection("general");
    setOnboardingStep("welcome");
  }

  const accountName = authDisplayName(authState);
  const accountInitials = authInitials(authState);

  return (
    <main className="grid min-h-screen grid-cols-[200px_minmax(0,1fr)] bg-transparent">
      <aside className="flex flex-col border-r border-black/8 bg-white/94 px-4 py-5">
        <button
          className="flex items-center gap-3 rounded-2xl px-2 py-2 text-left text-slate-950 transition-colors hover:bg-slate-100/80"
          onClick={openHome}
          type="button"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_28px_rgba(15,23,42,0.14)]">
            <VoiceFlowMark className="h-[18px] w-[18px]" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.03em]">VoiceFlow</span>
        </button>

        <nav className="mt-8 space-y-1.5">
          <button
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium transition-all ${
              currentPage === "home"
                ? "bg-slate-950 text-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]"
                : "text-slate-700 hover:bg-slate-950 hover:text-white hover:shadow-[0_16px_36px_rgba(15,23,42,0.14)]"
            }`}
            onClick={openHome}
            type="button"
          >
            <House className="h-[15px] w-[15px]" />
            <span>Home</span>
          </button>
        </nav>

        <div className="mt-7">
          <p className="px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
            Settings
          </p>
          <nav className="mt-3 space-y-1.5">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === "settings" && settingsSection === item.section;

              return (
                <button
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium transition-all ${
                    isActive
                      ? "bg-slate-950 text-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]"
                      : "text-slate-700 hover:bg-slate-950 hover:text-white hover:shadow-[0_16px_36px_rgba(15,23,42,0.14)]"
                  }`}
                  key={item.section}
                  onClick={() => openSettingsSection(item.section)}
                  type="button"
                >
                  <Icon className="h-[15px] w-[15px]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto px-3 pt-6 text-[12px] text-slate-400">v{APP_VERSION}</div>
      </aside>

      <section className="flex min-h-screen flex-col">
        {currentPage === "home" ? (
          <header className="flex items-center justify-end bg-transparent px-8 py-4 pt-7">
            <div className="relative" ref={accountMenuRef}>
              <button
                aria-label="Open account menu"
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-950 text-white transition-colors hover:bg-slate-800"
                onClick={() => setIsAccountMenuOpen((currentValue) => !currentValue)}
                type="button"
              >
                {accountInitials ? (
                  <span className="text-[11px] font-semibold tracking-[0.08em]">
                    {accountInitials}
                  </span>
                ) : (
                  <UserRound className="h-4 w-4" />
                )}
              </button>

              {isAccountMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+10px)] z-30 w-[248px] rounded-2xl border border-black/10 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
                  <div className="rounded-xl bg-slate-50 px-3 py-3">
                    <p className="m-0 text-[13px] font-medium text-slate-950">{accountName}</p>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500">
                      {authState.is_authenticated
                        ? authState.user?.email || authState.message
                        : "Sign in to enable settings sync and organization detection."}
                    </p>
                  </div>
                  <div className="my-2 h-px bg-black/6" />
                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                    onClick={() => openSettingsSection("account")}
                    type="button"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Account settings</span>
                  </button>
                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                    onClick={() => {
                      if (authState.is_authenticated) {
                        void invoke<AuthState>("sign_out")
                          .then((nextState) => {
                            setAuthState(nextState);
                            setIsAccountMenuOpen(false);
                          })
                          .catch((error) => {
                            console.error("Failed to sign out", error);
                          });
                        return;
                      }

                      openAuthenticationFromSettings();
                    }}
                    type="button"
                  >
                    <UserRound className="h-4 w-4" />
                    <span>{authState.is_authenticated ? "Sign out" : "Sign in"}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </header>
        ) : null}

        <section className={`flex-1 px-8 ${currentPage === "home" ? "py-7" : "py-8"}`}>
          {currentPage === "home" ? (
            <HomePage
              selectedMode={selectedMode}
              backendHealth={backendHealth}
              sessionState={sessionState}
              isRecordingActionPending={isRecordingActionPending}
              onStartRecording={startRecording}
              onStopRecording={() => stopRecording(true)}
              recentActivity={recentActivity}
              usageStats={usageStats}
            />
          ) : (
            <SettingsPage
              selectedMode={selectedMode}
              config={config}
              backendHealth={backendHealth}
              sessionState={sessionState}
              audioDevices={audioDevices}
              permissionStatus={permissionStatus}
              isRefreshingPermissions={isRefreshingPermissions}
              onRefreshPermissions={refreshPermissionStatus}
              onOpenPermissionSettings={openPermissionSettings}
              organizationBaseUrl={selectedMode === "organization" ? organizationBaseUrl : undefined}
              organizationApiKey={organizationApiKey}
              organizationStatus={organizationSetupStatus}
              onOrganizationBaseUrlChange={(value) => {
                setOrganizationBaseUrl(value);
                setOrganizationSetupStatus("idle");
                setOrganizationSetupMessage("Enter your server URL, then verify the connection.");
              }}
              onOrganizationApiKeyChange={setOrganizationApiKey}
              onCheckConnection={checkOrganizationConnection}
              onModeChange={handleModeChange}
              hotkey={hotkey}
              onHotkeyChange={applyHotkey}
              loggingEnabled={loggingEnabled}
              onLoggingEnabledChange={setLoggingEnabled}
              pasteRawOnFailure={pasteRawOnFailure}
              onPasteRawOnFailureChange={setPasteRawOnFailure}
              overlayPosition={overlayPosition}
              onOverlayPositionChange={setOverlayPosition}
              launchAtLogin={launchAtLogin}
              onLaunchAtLoginChange={(value) => {
                void applyLaunchAtLogin(value).catch((error) => {
                  console.error("Failed to update launch at login", error);
                });
              }}
              showInDock={showInDock}
              onShowInDockChange={setShowInDock}
              preferredAudioInput={preferredAudioInput}
              onPreferredAudioInputChange={setPreferredAudioInput}
              startSoundEnabled={startSoundEnabled}
              onStartSoundEnabledChange={setStartSoundEnabled}
              doneSoundEnabled={doneSoundEnabled}
              onDoneSoundEnabledChange={setDoneSoundEnabled}
              sttStatus={sttStatus}
              isCheckingHealth={isCheckingHealth}
              refreshBackendHealth={refreshBackendHealth}
              dictationLogEntries={dictationLogEntries}
              appVersion={APP_VERSION}
              activeSection={settingsSection}
              authState={authState}
              onOpenSignIn={openAuthenticationFromSettings}
              onSaveAccountProfile={async (profile) => {
                const nextState = await invoke<AuthState>("update_account_profile", {
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                  authBaseUrl: normalizeBaseUrl(organizationBaseUrl) || null,
                });
                setAuthState(nextState);
              }}
              onSignOut={async () => {
                const nextState = await invoke<AuthState>("sign_out");
                setAuthState(nextState);
              }}
              onDeleteAccount={async () => {
                const nextState = await invoke<AuthState>("delete_account");
                setAuthState(nextState);
              }}
              onResetOnboarding={resetOnboarding}
              onClearLogs={() => {
                if (window.confirm("Clear all locally stored dictation activity?")) {
                  clearRecentActivity();
                }
              }}
            />
          )}
        </section>
      </section>
    </main>
  );
}
