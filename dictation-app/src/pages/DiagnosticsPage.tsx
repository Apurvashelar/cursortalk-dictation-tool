import { useState } from "react";

import type {
  AppConfig,
  AudioInputDevice,
  BackendHealth,
  DictationLogEntry,
  PermissionStatusReport,
  SessionState,
  SttStatus,
} from "../api/backend";

type DiagnosticsPageProps = {
  selectedMode: "local" | "organization";
  config: AppConfig | null;
  backendHealth: BackendHealth;
  sessionState: SessionState;
  audioDevices: AudioInputDevice[];
  sttStatus: SttStatus;
  permissionStatus: PermissionStatusReport;
  isCheckingHealth: boolean;
  refreshBackendHealth: () => void;
  dictationLogEntries: DictationLogEntry[];
  appVersion: string;
};

function healthTone(status: "healthy" | "warning" | "error") {
  switch (status) {
    case "healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "error":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-black/10 bg-transparent text-slate-600";
  }
}

export function DiagnosticsPage({
  selectedMode,
  backendHealth,
  sessionState,
  sttStatus,
  permissionStatus,
  isCheckingHealth,
  refreshBackendHealth,
  dictationLogEntries,
  appVersion,
}: DiagnosticsPageProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const missingPermissions = [
    permissionStatus.microphone.status !== "ready" ? "Microphone" : null,
    permissionStatus.accessibility.status !== "ready" ? "Accessibility" : null,
  ].filter(Boolean) as string[];

  const healthCards = [
    {
      title: "STT engine",
      status:
        sttStatus.state === "ready"
          ? ("healthy" as const)
          : sttStatus.state === "planned"
            ? ("warning" as const)
            : ("error" as const),
      value:
        sttStatus.state === "ready"
          ? "Healthy"
          : sttStatus.state === "planned"
            ? "Not loaded"
            : "Error",
      subtitle: `${sttStatus.engine} · native runtime`,
    },
    {
      title: "Cleanup server",
      status:
        selectedMode === "local"
          ? ("healthy" as const)
          : backendHealth.status === "healthy"
            ? ("healthy" as const)
            : backendHealth.status === "degraded"
              ? ("warning" as const)
              : ("error" as const),
      value:
        selectedMode === "local"
          ? "Running"
          : backendHealth.status === "healthy"
            ? "Running"
            : backendHealth.status === "degraded"
              ? "Starting..."
              : "Unreachable",
      subtitle:
        selectedMode === "local"
          ? "On-device cleanup runtime"
          : `${backendHealth.healthUrl} · ${backendHealth.message}`,
    },
    {
      title: "Memory",
      status: "warning" as const,
      value: "Unavailable",
      subtitle:
        selectedMode === "local"
          ? "Process memory stats not wired yet"
          : "Remote server memory is not reported yet",
    },
    {
      title: "Permissions",
      status: missingPermissions.length === 0 ? ("healthy" as const) : ("warning" as const),
      value: missingPermissions.length === 0 ? "All granted" : `${missingPermissions.length} missing`,
      subtitle: missingPermissions.length === 0 ? "Microphone and Accessibility ready" : missingPermissions.join(", "),
    },
  ];

  async function copyDebugInfo() {
    const lines = [
      `App version: ${appVersion}`,
      `Mode: ${selectedMode}`,
      `OS: ${navigator.userAgent}`,
      `Hotkey: ${sessionState.hotkey}`,
      `STT engine: ${sttStatus.engine} (${sttStatus.state})`,
      `Cleanup status: ${selectedMode === "local" ? "local runtime" : backendHealth.status}`,
      `Microphone permission: ${permissionStatus.microphone.label}`,
      `Accessibility permission: ${permissionStatus.accessibility.label}`,
      `Backend health: ${backendHealth.message}`,
      `Last output available: ${sessionState.final_output ? "yes" : "no"}`,
      `Recent latencies: unavailable`,
    ];

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyState("copied");
    } catch (error) {
      console.error("Failed to copy debug info", error);
      setCopyState("error");
    } finally {
      window.setTimeout(() => setCopyState("idle"), 1500);
    }
  }

  return (
    <div
      className="space-y-10 pt-3"
      style={{ fontFamily: '"IBM Plex Sans", "Inter", "Helvetica Neue", sans-serif' }}
    >
      <section className="flex flex-wrap justify-end gap-3 pt-2">
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:border-slate-950 hover:bg-slate-950 hover:text-white"
            onClick={copyDebugInfo}
            type="button"
          >
            {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy debug info"}
          </button>
          <button
            className="rounded-xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-900"
            onClick={refreshBackendHealth}
            type="button"
          >
            {isCheckingHealth ? "Checking..." : "Refresh health"}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {healthCards.map((card) => (
          <article
            className={`rounded-[24px] border p-5 ${healthTone(card.status)}`}
            key={card.title}
          >
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{card.title}</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              {card.value}
            </p>
            <p className="mt-2 text-sm text-slate-500">{card.subtitle}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
