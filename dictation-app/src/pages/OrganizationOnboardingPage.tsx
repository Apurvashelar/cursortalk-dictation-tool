import { ArrowLeft, LoaderCircle, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { PermissionStatusReport, SessionState } from "../api/backend";
import { PermissionPrompt, permissionsNeedAction } from "../components/PermissionPrompt";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";

export type OrganizationOnboardingStage = "setup" | "test";

type OrganizationOnboardingPageProps = {
  stage: OrganizationOnboardingStage;
  hotkey: string;
  baseUrl: string;
  apiKey: string;
  status: "idle" | "checking" | "unknown" | "healthy" | "degraded" | "unreachable";
  statusMessage: string;
  permissionStatus: PermissionStatusReport;
  isRefreshingPermissions: boolean;
  sessionState: SessionState;
  isRecordingActionPending: boolean;
  onBack: () => void;
  onBaseUrlChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onCheckConnection: () => void;
  onRefreshPermissions: () => void;
  onOpenPermissionSettings: (permission: "microphone" | "accessibility") => void;
  onContinueToTest: () => void;
  onComplete: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
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
        return "⌥";
      case "Space":
        return "Space";
      default:
        return value.toUpperCase();
    }
  });
}

export function OrganizationOnboardingPage({
  stage,
  hotkey,
  baseUrl,
  apiKey,
  status,
  statusMessage,
  permissionStatus,
  isRefreshingPermissions,
  sessionState,
  isRecordingActionPending,
  onBack,
  onBaseUrlChange,
  onApiKeyChange,
  onCheckConnection,
  onRefreshPermissions,
  onOpenPermissionSettings,
  onContinueToTest,
  onComplete,
  onStartRecording,
  onStopRecording,
}: OrganizationOnboardingPageProps) {
  const [isDemoVisible, setIsDemoVisible] = useState(false);
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [pendingTestAction, setPendingTestAction] = useState<"starting" | "stopping" | null>(null);
  const [hasStartedTest, setHasStartedTest] = useState(false);
  const canContinue =
    (status === "healthy" || status === "degraded") && !permissionsNeedAction(permissionStatus);
  const isRecording = sessionState.state === "recording";
  const isBusy =
    sessionState.state === "transcribing" ||
    sessionState.state === "cleaning" ||
    sessionState.state === "pasting";
  const isStartingRecording = pendingTestAction === "starting" && isRecordingActionPending;
  const isStoppingRecording = pendingTestAction === "stopping" && isRecordingActionPending;
  const showRecordingControl = isRecording || isStartingRecording || isStoppingRecording;
  const finalOutput = hasStartedTest ? sessionState.final_output : null;
  const noSpeechMessage =
    hasStartedTest &&
    sessionState.state === "idle" &&
    !finalOutput &&
    sessionState.message.toLowerCase().includes("no speech detected")
      ? sessionState.message
      : null;
  const processedMs =
    finalOutput && sessionState.stt_latency_ms !== null
      ? (sessionState.stt_latency_ms ?? 0) + (sessionState.cleanup_latency_ms ?? 0)
      : null;
  const startActionLabel = finalOutput || noSpeechMessage ? "Try again" : "Start test";
  const shouldShowStartAction = !isRecording && !isStoppingRecording && !isBusy;
  const shouldShowStopAction = isRecording || isStoppingRecording;
  const hotkeyLabel = hotkeyTokens(hotkey).join(" + ");

  useEffect(() => {
    if (sessionState.state !== "idle") {
      setHasStartedTest(true);
    }
  }, [sessionState.state]);

  useEffect(() => {
    if (!isRecordingActionPending) {
      setPendingTestAction(null);
    }
  }, [isRecordingActionPending]);

  function runStartTestAction() {
    if (isRecordingActionPending || isBusy || isRecording) {
      return;
    }

    setHasStartedTest(true);
    setPendingTestAction("starting");
    onStartRecording();
  }

  function runStopTestAction() {
    if (isRecordingActionPending || !isRecording) {
      return;
    }

    setPendingTestAction("stopping");
    onStopRecording();
  }

  return (
    <BackgroundPaths>
      <div
        className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10"
        style={{ fontFamily: '"IBM Plex Sans", "Inter", "Helvetica Neue", sans-serif' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-5xl"
        >
          <button
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="rounded-[34px] border border-black/10 bg-white/78 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.1)] backdrop-blur-2xl md:p-10">
            {stage === "setup" ? (
              <>
                <div className="mx-auto max-w-3xl text-center">
                  <h1 className="text-base font-medium uppercase tracking-[0.22em] text-slate-500">
                    Organization setup
                  </h1>
                  <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
                    Connect to your company server. Once verified, future launches will go straight
                    to Home.
                  </p>
                </div>

                <div className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-black/10 bg-white/82 p-7 shadow-[0_20px_80px_rgba(15,23,42,0.06)]">
                  <div className="space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        Server URL
                      </span>
                      <input
                        className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-black/25"
                        onChange={(event) => onBaseUrlChange(event.target.value)}
                        placeholder="http://127.0.0.1:8080"
                        type="text"
                        value={baseUrl}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
                        API key
                      </span>
                      <input
                        className="w-full rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-black/25"
                        onChange={(event) => onApiKeyChange(event.target.value)}
                        placeholder="Optional for current tunnel setup"
                        type="password"
                        value={apiKey}
                      />
                    </label>
                  </div>

                  <p
                    className={`mt-5 text-center text-sm leading-6 ${
                      status === "healthy" || status === "degraded"
                        ? "text-emerald-700"
                        : status === "unreachable"
                          ? "text-red-700"
                          : "text-slate-600"
                    }`}
                  >
                    {status === "healthy"
                      ? "Connected."
                      : status === "checking"
                        ? "Checking connection..."
                        : status === "degraded"
                          ? "Connected, but the server returned a warning."
                          : status === "unreachable"
                            ? "Could not connect. Check your server URL or tunnel."
                            : statusMessage}
                  </p>
                </div>

                <PermissionPrompt
                  permissionStatus={permissionStatus}
                  isRefreshingPermissions={isRefreshingPermissions}
                  onRefreshPermissions={onRefreshPermissions}
                  onOpenPermissionSettings={onOpenPermissionSettings}
                />

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Button
                    className="rounded-2xl bg-slate-950 px-6 py-6 text-base text-white hover:bg-slate-900"
                    disabled={!baseUrl.trim() || status === "checking"}
                    onClick={onCheckConnection}
                    size="lg"
                  >
                    {status === "checking" ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Checking
                      </>
                    ) : (
                      "Check connection"
                    )}
                  </Button>
                  <button
                    className="rounded-2xl border border-black/10 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-black/20 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!canContinue}
                    onClick={onContinueToTest}
                    type="button"
                  >
                    Continue to test
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto max-w-3xl text-center">
                  <h1 className="text-base font-medium uppercase tracking-[0.22em] text-slate-500">
                    Test organization dictation
                  </h1>
                </div>

                <div className="mx-auto mt-9 max-w-3xl rounded-[28px] border border-emerald-950/10 bg-emerald-950/[0.035] p-6 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-900">
                      Final output
                    </p>
                    <span className="text-sm text-emerald-900/70">
                      {showRecordingControl
                        ? "Listening..."
                        : isBusy
                          ? "Processing..."
                          : finalOutput
                            ? "Ready"
                            : noSpeechMessage
                              ? "No speech detected"
                              : "Waiting for test"}
                    </span>
                  </div>
                  <div className="mt-4 min-h-[150px] rounded-[22px] border border-emerald-950/10 bg-white/70 p-5 leading-7">
                    {finalOutput ? (
                      <p className="m-0 text-base text-slate-900">{finalOutput}</p>
                    ) : (
                      <p className="m-0 text-sm font-normal text-slate-400">
                        Hold {hotkeyLabel} and say: “The quarterly report shows strong growth.”
                        Release to finish.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 text-center text-sm text-slate-600">
                  {sessionState.state === "error"
                    ? sessionState.message
                    : noSpeechMessage
                      ? noSpeechMessage
                      : processedMs !== null
                        ? `Processed in ${processedMs}ms`
                        : "Use the shortcut or Start test button below."}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  {shouldShowStartAction ? (
                    <button
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all active:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 ${
                        isStartingRecording
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-black/10 text-slate-700 hover:border-slate-950 hover:bg-slate-950 hover:text-white disabled:hover:border-black/10 disabled:hover:bg-transparent disabled:hover:text-slate-700"
                      }`}
                      disabled={isRecordingActionPending}
                      onClick={runStartTestAction}
                      type="button"
                    >
                      {startActionLabel}
                    </button>
                  ) : null}
                  {shouldShowStopAction ? (
                    <button
                      className="rounded-xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-900 active:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isRecordingActionPending}
                      onClick={runStopTestAction}
                      type="button"
                    >
                      Stop recording
                    </button>
                  ) : null}
                  <button
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-all active:bg-slate-900 ${
                      isDemoVisible
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-black/10 text-slate-700 hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                    }`}
                    onClick={() => setIsDemoVisible((current) => !current)}
                    type="button"
                  >
                    {isDemoVisible ? "Hide demo" : "Quick demo"}
                  </button>
                  <Button
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm text-white hover:bg-slate-900 active:bg-slate-800"
                    onClick={() => setIsCompletionOpen(true)}
                  >
                    Looks perfect
                  </Button>
                </div>

                {isDemoVisible ? (
                  <div className="mt-8 overflow-hidden rounded-[28px] border border-black/10 bg-black shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
                    <video
                      autoPlay
                      className="h-[320px] w-full object-cover"
                      controls
                      loop
                      muted
                      playsInline
                      src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
                    />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </motion.div>
      </div>
      {isCompletionOpen
        ? createPortal(
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/45 px-6 backdrop-blur-md">
              <div className="w-full max-w-sm rounded-[26px] border border-black/10 bg-white p-6 text-center shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
                <h2 className="flex items-center justify-center gap-2 text-xl font-medium tracking-[-0.02em] text-slate-950">
                  You're all set
                  <PartyPopper className="h-5 w-5" />
                </h2>
                <div className="mx-auto mt-5 inline-flex items-center gap-3 rounded-2xl border border-black/10 bg-slate-950/[0.035] px-4 py-3">
                  <span className="inline-flex items-center gap-1.5">
                    {hotkeyTokens(hotkey).map((token, index) => (
                      <span className="inline-flex items-center gap-1.5" key={`${token}-${index}`}>
                        {index > 0 ? <span className="text-sm text-slate-400">+</span> : null}
                        <kbd className="min-w-8 rounded-lg border border-black/10 bg-white px-2 py-1 text-sm font-semibold text-slate-950 shadow-sm">
                          {token}
                        </kbd>
                      </span>
                    ))}
                  </span>
                  <span className="text-sm text-slate-500">Any time to dictate</span>
                </div>
                <p className="mx-auto mt-4 text-sm leading-6 text-slate-600">
                  Dictation is running in your menu bar.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    className="rounded-xl border border-slate-950 bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-900 active:bg-slate-800"
                    onClick={onComplete}
                    type="button"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </BackgroundPaths>
  );
}
