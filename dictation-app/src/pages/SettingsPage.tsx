import { ChevronDown } from "lucide-react";
import type {
  AppConfig,
  AudioInputDevice,
  AuthState,
  BackendHealth,
  DictationLogEntry,
  PermissionStatusReport,
  SessionState,
  SttStatus,
} from "../api/backend";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DiagnosticsPage } from "./DiagnosticsPage";

export type SettingsSection =
  | "general"
  | "account"
  | "audio"
  | "connection"
  | "advanced"
  | "diagnostics";

type OrganizationStatus =
  | "idle"
  | "checking"
  | "unknown"
  | "healthy"
  | "degraded"
  | "unreachable";

type SettingsPageProps = {
  selectedMode: "local" | "organization";
  config: AppConfig | null;
  backendHealth: BackendHealth;
  sessionState: SessionState;
  hotkey: string;
  audioDevices: AudioInputDevice[];
  permissionStatus: PermissionStatusReport;
  isRefreshingPermissions: boolean;
  onRefreshPermissions: () => void;
  onOpenPermissionSettings: (permission: "microphone" | "accessibility") => void;
  organizationBaseUrl?: string;
  organizationApiKey: string;
  organizationStatus: OrganizationStatus;
  onOrganizationBaseUrlChange: (value: string) => void;
  onOrganizationApiKeyChange: (value: string) => void;
  onCheckConnection: () => void;
  onModeChange: (mode: "local" | "organization") => void;
  onHotkeyChange: (value: string) => Promise<void>;
  loggingEnabled: boolean;
  onLoggingEnabledChange: (value: boolean) => void;
  pasteRawOnFailure: boolean;
  onPasteRawOnFailureChange: (value: boolean) => void;
  overlayPosition: string;
  onOverlayPositionChange: (value: string) => void;
  launchAtLogin: boolean;
  onLaunchAtLoginChange: (value: boolean) => Promise<void> | void;
  showInDock: boolean;
  onShowInDockChange: (value: boolean) => void;
  preferredAudioInput: string;
  onPreferredAudioInputChange: (value: string) => void;
  startSoundEnabled: boolean;
  onStartSoundEnabledChange: (value: boolean) => void;
  doneSoundEnabled: boolean;
  onDoneSoundEnabledChange: (value: boolean) => void;
  onClearLogs: () => void;
  onResetOnboarding: () => void;
  sttStatus: SttStatus;
  isCheckingHealth: boolean;
  refreshBackendHealth: () => void;
  dictationLogEntries: DictationLogEntry[];
  appVersion: string;
  activeSection: SettingsSection;
  authState: AuthState;
  onOpenSignIn: () => void;
  onSaveAccountProfile: (profile: {
    firstName: string;
    lastName: string;
    email: string;
  }) => Promise<void>;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
};

function SettingToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/8 py-4 last:border-b-0">
      <div>
        <p className="m-0 text-sm font-medium text-slate-900">{label}</p>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <button
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
          checked ? "bg-slate-950" : "bg-slate-300"
        }`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <div className="relative">
        <select
          className="w-full appearance-none rounded-2xl border border-black/10 bg-white px-4 py-3.5 pr-11 text-sm text-slate-950 outline-none transition-colors focus:border-black/25"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </label>
  );
}

function sectionLabel(activeSection: SettingsSection) {
  switch (activeSection) {
    case "general":
      return "General";
    case "account":
      return "Account";
    case "audio":
      return "Audio";
    case "connection":
      return "Connection";
    case "advanced":
      return "Advanced";
    case "diagnostics":
      return "Diagnostics";
    default:
      return "";
  }
}

function statusText(status: OrganizationStatus) {
  switch (status) {
    case "healthy":
      return "Connected";
    case "checking":
      return "Checking connection";
    case "degraded":
      return "Connected with warnings";
    case "unreachable":
      return "Disconnected";
    default:
      return "Not checked yet";
  }
}

function normalizeHotkeyDisplay(hotkey: string) {
  return hotkey
    .split("CommandOrControl")
    .join("Command or Control")
    .split("Alt")
    .join("Option or Alt");
}

function hotkeyFromKeyboardEvent(event: KeyboardEvent) {
  const key = event.key;
  const code = event.code;
  const modifiers: string[] = [];

  if (event.ctrlKey || event.metaKey) {
    modifiers.push("CommandOrControl");
  }
  if (event.shiftKey) {
    modifiers.push("Shift");
  }
  if (event.altKey) {
    modifiers.push("Alt");
  }

  if (key === "Escape" && modifiers.length === 0) {
    return {
      cancelled: true as const,
      error: null,
      hotkey: null,
    };
  }

  if (["Meta", "Control", "Shift", "Alt"].includes(key)) {
    return {
      cancelled: false as const,
      error: "Press one non-modifier key together with your shortcut modifiers.",
      hotkey: null,
    };
  }

  let primaryKey: string | null = null;
  if (/^Key[A-Z]$/.test(code)) {
    primaryKey = code.slice(3);
  } else if (/^Digit[0-9]$/.test(code)) {
    primaryKey = code.slice(5);
  } else if (/^F([1-9]|1[0-2])$/.test(code)) {
    primaryKey = code;
  } else if (code === "Space" || key === " ") {
    primaryKey = "Space";
  } else if (key.length === 1 && /[a-z0-9]/i.test(key)) {
    primaryKey = key.toUpperCase();
  }

  if (!primaryKey) {
    return {
      cancelled: false as const,
      error: "Use a letter, number, function key, or Space for the shortcut.",
      hotkey: null,
    };
  }

  if (modifiers.length === 0 || (modifiers.length === 1 && modifiers[0] === "Shift")) {
    return {
      cancelled: false as const,
      error: "Use Command or Control, or Alt, with another key.",
      hotkey: null,
    };
  }

  const hotkey = [...modifiers, primaryKey].join("+");
  const reservedShortcuts = new Set([
    "CommandOrControl+C",
    "CommandOrControl+V",
    "CommandOrControl+X",
    "CommandOrControl+Z",
    "CommandOrControl+A",
    "CommandOrControl+Q",
    "CommandOrControl+W",
    "CommandOrControl+Tab",
    "CommandOrControl+Space",
    "Alt+Tab",
  ]);

  if (reservedShortcuts.has(hotkey)) {
    return {
      cancelled: false as const,
      error: "That shortcut is reserved already. Pick another combination.",
      hotkey: null,
    };
  }

  return {
    cancelled: false as const,
    error: null,
    hotkey,
  };
}

export function SettingsPage({
  selectedMode,
  config,
  backendHealth,
  sessionState,
  hotkey,
  audioDevices,
  permissionStatus,
  isRefreshingPermissions,
  onRefreshPermissions,
  onOpenPermissionSettings,
  organizationBaseUrl,
  organizationApiKey,
  organizationStatus,
  onOrganizationBaseUrlChange,
  onOrganizationApiKeyChange,
  onCheckConnection,
  onModeChange,
  onHotkeyChange,
  loggingEnabled,
  onLoggingEnabledChange,
  pasteRawOnFailure,
  onPasteRawOnFailureChange,
  overlayPosition,
  onOverlayPositionChange,
  launchAtLogin,
  onLaunchAtLoginChange,
  showInDock,
  onShowInDockChange,
  preferredAudioInput,
  onPreferredAudioInputChange,
  startSoundEnabled,
  onStartSoundEnabledChange,
  doneSoundEnabled,
  onDoneSoundEnabledChange,
  onClearLogs,
  onResetOnboarding,
  sttStatus,
  isCheckingHealth,
  refreshBackendHealth,
  dictationLogEntries,
  appVersion,
  activeSection,
  authState,
  onOpenSignIn,
  onSaveAccountProfile,
  onSignOut,
  onDeleteAccount,
}: SettingsPageProps) {
  const [micTestState, setMicTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [hotkeyError, setHotkeyError] = useState<string | null>(null);
  const [isSavingHotkey, setIsSavingHotkey] = useState(false);
  const [accountForm, setAccountForm] = useState({
    firstName: authState.user?.first_name ?? "",
    lastName: authState.user?.last_name ?? "",
  });
  const [accountSaveState, setAccountSaveState] = useState<
    "idle" | "saving" | "saved" | "error" | "signing_out" | "deleting"
  >("idle");
  const [accountErrorMessage, setAccountErrorMessage] = useState<string | null>(null);
  const defaultDevice = audioDevices.find((device) => device.is_default);
  const selectedInput = preferredAudioInput || defaultDevice?.name || "";
  const micTestTimeoutRef = useRef<number | null>(null);
  const micTestAnimationRef = useRef<number | null>(null);
  const accountSaveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setAccountForm({
      firstName: authState.user?.first_name ?? "",
      lastName: authState.user?.last_name ?? "",
    });
    setAccountErrorMessage(null);
  }, [authState.user?.first_name, authState.user?.last_name]);

  const isAccountDirty =
    accountForm.firstName !== (authState.user?.first_name ?? "") ||
    accountForm.lastName !== (authState.user?.last_name ?? "");

  useEffect(() => {
    return () => {
      if (micTestTimeoutRef.current !== null) {
        window.clearTimeout(micTestTimeoutRef.current);
      }
      if (micTestAnimationRef.current !== null) {
        window.cancelAnimationFrame(micTestAnimationRef.current);
      }
      if (accountSaveTimeoutRef.current !== null) {
        window.clearTimeout(accountSaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isRecordingHotkey) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const result = hotkeyFromKeyboardEvent(event);
      if (result.cancelled) {
        setIsRecordingHotkey(false);
        setHotkeyError(null);
        return;
      }

      if (result.error || !result.hotkey) {
        setHotkeyError(result.error);
        return;
      }

      setIsSavingHotkey(true);
      void onHotkeyChange(result.hotkey)
        .then(() => {
          setHotkeyError(null);
          setIsRecordingHotkey(false);
        })
        .catch((error) => {
          setHotkeyError(String(error));
        })
        .finally(() => {
          setIsSavingHotkey(false);
        });
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isRecordingHotkey, onHotkeyChange]);

  async function runMicTest() {
    if (micTestState === "testing") {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !navigator.mediaDevices?.enumerateDevices) {
      setMicTestState("error");
      return;
    }

    setMicLevel(0);
    setMicTestState("testing");

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const matchingDevice = devices.find(
        (device) => device.kind === "audioinput" && device.label === selectedInput,
      );

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: matchingDevice?.deviceId
          ? { deviceId: { exact: matchingDevice.deviceId } }
          : true,
      });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let peakLevel = 0;

      const updateMeter = () => {
        analyser.getByteTimeDomainData(data);
        let sumSquares = 0;
        for (const value of data) {
          const normalized = (value - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / data.length);
        const scaledLevel = Math.min(1, rms * 6);
        peakLevel = Math.max(peakLevel, scaledLevel);
        setMicLevel(scaledLevel);
        micTestAnimationRef.current = window.requestAnimationFrame(updateMeter);
      };

      updateMeter();

      micTestTimeoutRef.current = window.setTimeout(async () => {
        if (micTestAnimationRef.current !== null) {
          window.cancelAnimationFrame(micTestAnimationRef.current);
          micTestAnimationRef.current = null;
        }
        stream.getTracks().forEach((track) => track.stop());
        await audioContext.close();
        setMicTestState(peakLevel > 0.03 ? "success" : "error");
        micTestTimeoutRef.current = window.setTimeout(() => {
          setMicTestState("idle");
          setMicLevel(0);
        }, 1200);
      }, 2000);
    } catch (error) {
      console.error("Failed to test microphone", error);
      setMicLevel(0);
      setMicTestState("error");
      micTestTimeoutRef.current = window.setTimeout(() => {
        setMicTestState("idle");
      }, 1500);
    }
  }

  return (
    <div
      className="space-y-10 pt-3"
      style={{ fontFamily: '"IBM Plex Sans", "Inter", "Helvetica Neue", sans-serif' }}
    >
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
        {sectionLabel(activeSection)}
      </p>

      <section className="pt-2">
        {activeSection === "general" ? (
          <div className="space-y-14">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Mode</p>
              <div className="inline-flex rounded-2xl border border-black/10 bg-white p-1">
                <button
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    selectedMode === "local"
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  onClick={() => onModeChange("local")}
                  type="button"
                >
                  Local
                </button>
                <button
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    selectedMode === "organization"
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:text-slate-950"
                  }`}
                  onClick={() => onModeChange("organization")}
                  type="button"
                >
                  Enterprise
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Hotkey
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div>
                  <p className="m-0 text-sm font-medium text-slate-900">Dictation trigger</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {normalizeHotkeyDisplay(hotkey || config?.hotkey || sessionState.hotkey)}
                  </p>
                </div>
                <button
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                    isRecordingHotkey
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-black/10 text-slate-700 hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                  }`}
                  onClick={() => {
                    if (isSavingHotkey) {
                      return;
                    }

                    setHotkeyError(null);
                    setIsRecordingHotkey((currentValue) => !currentValue);
                  }}
                  type="button"
                >
                  {isSavingHotkey
                    ? "Saving..."
                    : isRecordingHotkey
                      ? "Press shortcut..."
                      : "Record new hotkey"}
                </button>
              </div>
              {hotkeyError ? (
                <p className="mt-3 text-sm text-red-500">{hotkeyError}</p>
              ) : null}
            </div>

            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Startup
              </p>
              <SettingToggle
                checked={launchAtLogin}
                label="Launch at login"
                onChange={onLaunchAtLoginChange}
              />
              <SettingToggle
                checked={showInDock}
                label="Show in dock"
                onChange={onShowInDockChange}
              />
            </div>
          </div>
        ) : null}

        {activeSection === "account" ? (
          <div className="space-y-10">
            {authState.is_authenticated ? (
              <>
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        First name
                      </span>
                      <input
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-black/25"
                        onChange={(event) =>
                          setAccountForm((currentValue) => ({
                            ...currentValue,
                            firstName: event.target.value,
                          }))
                        }
                        placeholder="First name"
                        type="text"
                        value={accountForm.firstName}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Last name
                      </span>
                      <input
                        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-black/25"
                        onChange={(event) =>
                          setAccountForm((currentValue) => ({
                            ...currentValue,
                            lastName: event.target.value,
                          }))
                        }
                        placeholder="Last name"
                        type="text"
                        value={accountForm.lastName}
                      />
                    </label>
                  </div>

                  <label className="block border-t border-black/8 pt-4">
                    <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
                    <input
                      autoComplete="email"
                      className="w-full rounded-2xl border border-black/10 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none disabled:cursor-not-allowed"
                      disabled
                      inputMode="email"
                      type="email"
                      value={authState.user?.email ?? ""}
                    />
                  </label>
                </div>

                <div className="relative flex flex-wrap items-center justify-between gap-4 border-t border-black/8 pt-5">
                  {accountSaveState === "saved" ? (
                    <div className="absolute -top-12 right-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-sm">
                      Saved
                    </div>
                  ) : null}
                  {accountSaveState === "error" && accountErrorMessage ? (
                    <div className="absolute -top-12 right-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-sm">
                      {accountErrorMessage}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-slate-950 hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={accountSaveState === "saving" || accountSaveState === "deleting" || accountSaveState === "signing_out"}
                      onClick={async () => {
                        setAccountSaveState("signing_out");
                        setAccountErrorMessage(null);
                        try {
                          await onSignOut();
                        } catch (error) {
                          setAccountSaveState("error");
                          setAccountErrorMessage(String(error));
                        }
                      }}
                      type="button"
                    >
                      {accountSaveState === "signing_out" ? "Signing out..." : "Sign out"}
                    </button>
                    <button
                      className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={accountSaveState === "saving" || accountSaveState === "deleting" || accountSaveState === "signing_out"}
                      onClick={async () => {
                        if (!window.confirm("Delete this account permanently?")) {
                          return;
                        }

                        setAccountSaveState("deleting");
                        setAccountErrorMessage(null);
                        try {
                          await onDeleteAccount();
                        } catch (error) {
                          setAccountSaveState("error");
                          setAccountErrorMessage(String(error));
                        }
                      }}
                      type="button"
                    >
                      {accountSaveState === "deleting" ? "Deleting..." : "Delete account"}
                    </button>
                  </div>

                  <button
                    className="rounded-xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!isAccountDirty || accountSaveState === "saving" || accountSaveState === "deleting" || accountSaveState === "signing_out"}
                    onClick={async () => {
                      setAccountSaveState("saving");
                      setAccountErrorMessage(null);
                      try {
                        await onSaveAccountProfile({
                          firstName: accountForm.firstName,
                          lastName: accountForm.lastName,
                          email: authState.user?.email ?? "",
                        });
                        setAccountSaveState("saved");
                        if (accountSaveTimeoutRef.current !== null) {
                          window.clearTimeout(accountSaveTimeoutRef.current);
                        }
                        accountSaveTimeoutRef.current = window.setTimeout(() => {
                          setAccountSaveState("idle");
                        }, 1600);
                      } catch (error) {
                        setAccountSaveState("error");
                        setAccountErrorMessage(String(error));
                      }
                    }}
                    type="button"
                  >
                    {accountSaveState === "saving" ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-5">
                <div className="max-w-xl space-y-2">
                  <p className="m-0 text-sm font-medium text-slate-900">No account connected</p>
                  <p className="m-0 text-sm text-slate-500">
                    Sign in to sync your profile and attach enterprise access to this desktop client.
                  </p>
                </div>
                <button
                  className="rounded-xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-900"
                  onClick={onOpenSignIn}
                  type="button"
                >
                  Sign in
                </button>
              </div>
            )}
          </div>
        ) : null}

        {activeSection === "audio" ? (
          <div className="space-y-10">
            <div className="space-y-4">
              <SelectField
                label="Microphone"
                onChange={onPreferredAudioInputChange}
                value={selectedInput}
              >
                  {audioDevices.map((device) => (
                    <option key={device.name} value={device.name}>
                      {device.name}
                    </option>
                  ))}
              </SelectField>

              <div className="mt-8 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="m-0 text-sm font-medium text-slate-900">Test mic</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Capture 2 seconds and confirm the selected microphone is active.
                    </p>
                  </div>
                  <button
                    className="rounded-xl border border-black/10 px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-all hover:border-slate-950 hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={micTestState === "testing"}
                    onClick={runMicTest}
                    type="button"
                  >
                    {micTestState === "testing" ? "Testing..." : "Test mic"}
                  </button>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-[width] duration-100 ${
                      micTestState === "error"
                        ? "bg-red-400"
                        : micTestState === "success"
                          ? "bg-emerald-500"
                          : "bg-slate-950"
                    }`}
                    style={{ width: `${Math.max(8, micLevel * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {micTestState === "testing"
                    ? "Listening to the selected microphone..."
                    : micTestState === "success"
                      ? "Microphone activity detected."
                      : micTestState === "error"
                        ? "Microphone test failed."
                        : "Run a quick test before dictating."}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <SettingToggle
                checked={startSoundEnabled}
                label="Start sound"
                onChange={onStartSoundEnabledChange}
              />
              <SettingToggle
                checked={doneSoundEnabled}
                label="Done sound"
                onChange={onDoneSoundEnabledChange}
              />
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="m-0 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                    Permissions
                  </p>
                </div>
                <button
                  className="rounded-xl border border-black/10 px-3.5 py-2 text-[13px] font-medium text-slate-700 transition-all hover:border-slate-950 hover:bg-slate-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isRefreshingPermissions}
                  onClick={onRefreshPermissions}
                  type="button"
                >
                  {isRefreshingPermissions ? "Refreshing..." : "Refresh permissions"}
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="m-0 text-sm font-medium text-slate-900">Microphone</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      className="text-sm font-medium text-slate-600 underline underline-offset-4 transition-colors hover:text-slate-950"
                      onClick={() => onOpenPermissionSettings("microphone")}
                      type="button"
                    >
                      Open
                    </button>
                    <span
                      className={`text-sm ${
                        permissionStatus.microphone.status === "ready"
                          ? "text-emerald-600"
                          : "text-slate-500"
                      }`}
                    >
                      {permissionStatus.microphone.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="m-0 text-sm font-medium text-slate-900">Accessibility</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      className="text-sm font-medium text-slate-600 underline underline-offset-4 transition-colors hover:text-slate-950"
                      onClick={() => onOpenPermissionSettings("accessibility")}
                      type="button"
                    >
                      Open
                    </button>
                    <span
                      className={`text-sm ${
                        permissionStatus.accessibility.status === "ready"
                          ? "text-emerald-600"
                          : "text-slate-500"
                      }`}
                    >
                      {permissionStatus.accessibility.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeSection === "connection" ? (
          <div className="space-y-10">
            <div className="space-y-5">
              <div className="grid gap-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Server URL</span>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-black/25 disabled:bg-slate-100"
                    disabled={selectedMode === "local"}
                    onChange={(event) => onOrganizationBaseUrlChange(event.target.value)}
                    placeholder="https://staging-api.cursortalk.com"
                    type="text"
                    value={organizationBaseUrl ?? ""}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">API key</span>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-black/25 disabled:bg-slate-100"
                    disabled={selectedMode === "local"}
                    onChange={(event) => onOrganizationApiKeyChange(event.target.value)}
                    placeholder="Enter your organization access key if one was provided"
                    type="password"
                    value={organizationApiKey}
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  className="rounded-xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={selectedMode === "local" || organizationStatus === "checking"}
                  onClick={onCheckConnection}
                  type="button"
                >
                  {organizationStatus === "checking" ? "Checking..." : "Test connection"}
                </button>
                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    selectedMode === "local"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : organizationStatus === "healthy"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : organizationStatus === "unreachable"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-black/10 bg-white text-slate-700"
                  }`}
                >
                  {selectedMode === "local" ? "Using local mode" : statusText(organizationStatus)}
                </span>
                {selectedMode === "organization" && organizationStatus === "unreachable" ? (
                  <button
                    className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                    onClick={() => onModeChange("local")}
                    type="button"
                  >
                    Switch to local mode
                  </button>
                ) : null}
              </div>

              <p className="mt-4 text-sm text-slate-500">
                {selectedMode === "local"
                  ? "Currently using local mode. Switch to Enterprise in General settings to use these."
                  : backendHealth.message}
              </p>
            </div>
          </div>
        ) : null}

        {activeSection === "advanced" ? (
          <div className="space-y-10">
            <div className="space-y-4">
              <SelectField
                label="Overlay position"
                onChange={onOverlayPositionChange}
                value={overlayPosition}
              >
                  <option value="default">Default</option>
                  <option value="top-left">Top-left</option>
                  <option value="top-right">Top-right</option>
                  <option value="bottom-left">Bottom-left</option>
                  <option value="bottom-right">Bottom-right</option>
              </SelectField>
            </div>

            <div className="space-y-4">
              <SettingToggle
                checked={pasteRawOnFailure}
                description="If cleanup fails, paste the raw STT transcript instead of nothing."
                label="Paste raw on failure"
                onChange={onPasteRawOnFailureChange}
              />
              <SettingToggle
                checked={loggingEnabled}
                description="Store dictation activity locally for recent history and future model improvement."
                label="Dictation logging"
                onChange={onLoggingEnabledChange}
              />
            </div>

            <div className="space-y-2">
              <p className="m-0 text-sm font-medium text-red-800">Clear all logs</p>
              <p className="mt-1 text-sm text-red-700">
                Deletes locally stored dictation activity used by Home and Diagnostics.
              </p>
              <button
                className="mt-4 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-800 transition-all hover:bg-red-100"
                onClick={onClearLogs}
                type="button"
              >
                Clear all logs
              </button>
            </div>

            <div className="space-y-2">
              <p className="m-0 text-sm font-medium text-red-800">Restart onboarding</p>
              <p className="mt-1 text-sm text-red-700">
                Returns this app to the welcome flow so you can choose mode and setup again.
              </p>
              <button
                className="mt-4 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-800 transition-all hover:bg-red-100"
                onClick={onResetOnboarding}
                type="button"
              >
                Restart onboarding
              </button>
            </div>
          </div>
        ) : null}

        {activeSection === "diagnostics" ? (
          <DiagnosticsPage
            selectedMode={selectedMode}
            config={config}
            backendHealth={backendHealth}
            sessionState={sessionState}
            audioDevices={audioDevices}
            sttStatus={sttStatus}
            permissionStatus={permissionStatus}
            isCheckingHealth={isCheckingHealth}
            refreshBackendHealth={refreshBackendHealth}
            dictationLogEntries={dictationLogEntries}
            appVersion={appVersion}
          />
        ) : null}

      </section>
    </div>
  );
}
