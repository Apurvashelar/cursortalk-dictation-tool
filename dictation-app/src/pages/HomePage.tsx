import { Copy } from "lucide-react";
import { useState } from "react";
import { VoiceFlowMark } from "../components/VoiceFlowMark";
import type { BackendHealth, SessionState } from "../api/backend";

export type RecentActivityItem = {
  id: string;
  text: string;
  source: "enterprise" | "fallback";
  createdAtLabel: string;
  wordCount: number;
  latencyMs: number | null;
  status: "success" | "fallback" | "error";
};

export type UsageStats = {
  dictations: number;
  words: number;
  averageLatencyMs: number | null;
  loggingEnabled: boolean;
};

type HomePageProps = {
  selectedMode: "local" | "organization";
  backendHealth: BackendHealth;
  sessionState: SessionState;
  isRecordingActionPending: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  recentActivity: RecentActivityItem[];
  usageStats: UsageStats;
};

function hotkeyTokens(hotkey: string) {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return hotkey.split("+").map((token) => {
    const value = token.trim();

    switch (value) {
      case "CommandOrControl":
        return isMac ? "⌘" : "Ctrl";
      case "Command":
        return "⌘";
      case "Control":
        return "Ctrl";
      case "Shift":
        return "⇧";
      case "Option":
      case "Alt":
        return isMac ? "⌥" : "Alt";
      case "Space":
        return "Space";
      default:
        return value.toUpperCase();
    }
  });
}

function statusHero(
  sessionState: SessionState,
  selectedMode: "local" | "organization",
  backendHealth: BackendHealth,
) {
  const isOrganizationUnavailable =
    selectedMode === "organization" && backendHealth.status === "unreachable";

  if (sessionState.state === "recording") {
    return {
      title: "Recording...",
      subtitle: "Speak naturally. Release the hotkey to finish.",
    };
  }

  if (
    sessionState.state === "transcribing" ||
    sessionState.state === "cleaning" ||
    sessionState.state === "pasting"
  ) {
    return {
      title: "Processing...",
      subtitle: "Transcribing then cleaning up your dictation.",
    };
  }

  if (sessionState.state === "error") {
    const message = sessionState.message.toLowerCase();

    return {
      title: "Not ready",
      subtitle: message.includes("paste")
        ? "The text was prepared, but pasting into the active app failed."
        : message.includes("cleanup")
          ? "Cleanup failed before the final output could be prepared."
          : sessionState.message,
    };
  }

  if (isOrganizationUnavailable) {
    return {
      title: "Not ready",
      subtitle: "Server unreachable",
    };
  }

  if (sessionState.used_cleanup_fallback) {
    return {
      title: "Ready to dictate",
      subtitle: "Last dictation used the raw transcript fallback.",
    };
  }

  if (sessionState.message.toLowerCase().includes("no speech detected")) {
    return {
      title: "Ready to dictate",
      subtitle: "No speech was detected on the last attempt.",
    };
  }

  return {
    title: "Ready to dictate",
    subtitle: "All systems operational",
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatLatency(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}ms`;
}

function formatSummaryLatency(value: number | null) {
  if (value === null) {
    return "—";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}s`;
  }

  return `${Math.round(value)}ms`;
}

function InlineStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-[132px] flex-col items-center justify-center rounded-[22px] border border-black/8 bg-white/78 px-5 py-4 text-center shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
      <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className="mt-2 font-mono text-[13px] text-slate-700">{value}</span>
    </div>
  );
}

export function HomePage({
  selectedMode,
  backendHealth,
  sessionState,
  isRecordingActionPending,
  onStartRecording,
  onStopRecording,
  recentActivity,
  usageStats,
}: HomePageProps) {
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const isRecording = sessionState.state === "recording";
  const isBusy =
    sessionState.state === "transcribing" ||
    sessionState.state === "cleaning" ||
    sessionState.state === "pasting";
  const recordingActionLabel = isRecording ? "Stop dictation" : "Start dictation";
  const hero = statusHero(sessionState, selectedMode, backendHealth);
  const hotkey = hotkeyTokens(sessionState.hotkey);

  function runRecordingAction() {
    if (isRecordingActionPending || isBusy) {
      return;
    }

    if (isRecording) {
      onStopRecording();
      return;
    }

    onStartRecording();
  }

  async function copyRecentDictation(item: RecentActivityItem) {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedItemId(item.id);
      window.setTimeout(() => {
        setCopiedItemId((currentValue) => (currentValue === item.id ? null : currentValue));
      }, 1200);
    } catch (error) {
      console.error("Failed to copy recent dictation", error);
    }
  }

  return (
    <div
      className="mx-auto max-w-[880px] space-y-5"
      style={{ fontFamily: '"IBM Plex Sans", "Inter", "Helvetica Neue", sans-serif' }}
    >
      <div className="pt-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.04em] text-slate-950">Hello, There!</h1>
      </div>

      <section className="rounded-[28px] border border-emerald-200 bg-emerald-50/90 px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-emerald-200 bg-emerald-100 text-emerald-600">
              <VoiceFlowMark className="h-[22px] w-[22px]" />
            </div>
            <div>
              <h2 className="m-0 text-[16px] font-semibold tracking-[-0.03em] text-emerald-950">
                {hero.title}
              </h2>
              <p className="mt-0.5 text-[12px] text-emerald-700">{hero.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              className="rounded-lg border border-slate-950 bg-slate-950 px-3.5 py-2 text-[13px] font-medium text-white transition-all hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isBusy || isRecordingActionPending}
              onClick={runRecordingAction}
              type="button"
            >
              {recordingActionLabel}
            </button>
            <div className="flex flex-wrap items-center justify-center gap-1.5 self-center text-center text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                {hotkey.map((token, index) => (
                  <span className="inline-flex items-center gap-1.5" key={`${token}-${index}`}>
                    {index > 0 ? <span className="text-[10px] text-slate-400">+</span> : null}
                    <span className="text-[10px] font-semibold text-slate-700">{token}</span>
                  </span>
                ))}
              </span>
              <span>to dictate</span>
            </div>
          </div>
        </div>
      </section>

      <section className="flex justify-center">
        <article className="w-full rounded-[28px] border border-black/10 bg-white/78 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Recent dictations
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {!usageStats.loggingEnabled ? (
              <p className="rounded-2xl border border-black/10 bg-slate-950/[0.03] px-4 py-4 text-sm text-slate-500">
                Logging disabled — enable in settings to see recent dictations.
              </p>
            ) : recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((item) => (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white/82 px-4 py-3"
                  key={item.id}
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      item.status === "success" ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{item.text}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.createdAtLabel}</p>
                  </div>
                  <button
                    aria-label={`Copy recent dictation: ${item.text}`}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 text-slate-500 transition-colors hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                    onClick={() => {
                      void copyRecentDictation(item);
                    }}
                    title="Copy"
                    type="button"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {copiedItemId === item.id ? (
                    <span className="text-[11px] text-slate-400">Copied</span>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-black/10 bg-slate-950/[0.03] px-4 py-4 text-sm text-slate-500">
                Recent dictations will appear here after your first completed session.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="flex flex-wrap items-center justify-center gap-4">
        <InlineStat label="Dictations" value={formatNumber(usageStats.dictations)} />
        <InlineStat label="Words" value={formatNumber(usageStats.words)} />
        <InlineStat label="Avg latency" value={formatSummaryLatency(usageStats.averageLatencyMs)} />
      </section>
    </div>
  );
}
