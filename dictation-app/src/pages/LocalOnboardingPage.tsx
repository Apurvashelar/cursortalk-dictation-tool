import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";

import { BackgroundPaths } from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";
import type { PermissionStatusReport, SessionState } from "../api/backend";
import { PermissionPrompt } from "../components/PermissionPrompt";

export type LocalOnboardingStage = "setup" | "test";

type LocalOnboardingPageProps = {
  stage: LocalOnboardingStage;
  stepItems: string[];
  progressStepLabel: string;
  progressValue: number;
  statusMessage?: string;
  detectedStatus?: "complete" | "partial" | "missing";
  missingItems?: string[];
  showPermissionPrompt?: boolean;
  permissionStatus: PermissionStatusReport;
  isRefreshingPermissions: boolean;
  onRefreshPermissions: () => void;
  onOpenPermissionSettings: (permission: "microphone" | "accessibility") => void;
  onBack: () => void;
  onComplete: () => void;
  sessionState: SessionState;
  isRecordingActionPending: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
};

const DEMO_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

function Shell({
  children,
  onBack,
}: {
  children: ReactNode;
  onBack: () => void;
}) {
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

          {children}
        </motion.div>
      </div>
    </BackgroundPaths>
  );
}

function SetupStage({
  stepItems,
  progressStepLabel,
  progressValue,
  statusMessage,
  detectedStatus,
  missingItems,
  showPermissionPrompt,
  permissionStatus,
  isRefreshingPermissions,
  onRefreshPermissions,
  onOpenPermissionSettings,
}: {
  stepItems: string[];
  progressStepLabel: string;
  progressValue: number;
  statusMessage?: string;
  detectedStatus?: "complete" | "partial" | "missing";
  missingItems?: string[];
  showPermissionPrompt?: boolean;
  permissionStatus: PermissionStatusReport;
  isRefreshingPermissions: boolean;
  onRefreshPermissions: () => void;
  onOpenPermissionSettings: (permission: "microphone" | "accessibility") => void;
}) {
  const isPreflightStep = [
    "Checking local setup",
    "Looking for speech model",
    "Looking for cleanup model",
    "Validating local files",
    "Setup already completed",
  ].includes(progressStepLabel);
  const isCompletedSetupNotice = progressStepLabel === "Setup already completed";

  return (
    <div className="rounded-[34px] border border-black/10 bg-white/78 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.1)] backdrop-blur-2xl md:p-10">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-base font-medium uppercase tracking-[0.22em] text-slate-500">
          Setting up Local mode
        </h1>
        {!isCompletedSetupNotice ? (
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
            {detectedStatus === "missing" || detectedStatus === "partial"
              ? "Checking the files already available on this machine."
              : "Checking the files already available on this machine."}
          </p>
        ) : null}
      </div>

      {statusMessage && !isCompletedSetupNotice ? (
        <div className="mx-auto mt-6 max-w-3xl rounded-[22px] border border-black/8 bg-black/[0.03] px-5 py-4 text-sm text-slate-700">
          <p>{statusMessage}</p>
          {missingItems && missingItems.length > 0 ? (
            <p className="mt-2 text-[13px] text-slate-500">
              Missing: {missingItems.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {isCompletedSetupNotice ? (
        <div className="mx-auto mt-7 max-w-fit rounded-2xl border border-black/8 bg-black/[0.03] px-5 py-3 text-sm font-medium text-slate-800 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl">
          Setup is already completed on this machine. Skipping download.
        </div>
      ) : null}

      <div className="mx-auto mt-10 max-w-3xl">
        <div className="overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-3 rounded-full bg-slate-950 transition-all duration-500"
            style={{ width: `${progressValue}%` }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>{progressStepLabel}</span>
          <span>{Math.round(progressValue)}%</span>
        </div>
      </div>

      {!isPreflightStep ? (
        <div className="mx-auto mt-10 grid max-w-3xl gap-3 md:grid-cols-2">
          <div className="rounded-[24px] border border-black/8 bg-black/[0.025] px-5 py-4 text-sm text-slate-600">
            About 3.2 GB total download for local speech and cleanup models.
          </div>
          <div className="rounded-[24px] border border-black/8 bg-black/[0.025] px-5 py-4 text-sm text-slate-600">
            Local mode will be ready automatically once model preparation finishes.
          </div>
        </div>
      ) : null}

      <div className="mx-auto mt-10 flex max-w-2xl justify-center">
        <div className="flex flex-col gap-4">
          {stepItems.map((step, index) => {
            const currentIndex = stepItems.indexOf(progressStepLabel);
            const isActive = step === progressStepLabel;
            const isComplete = index < currentIndex;

            return (
              <div className="flex items-start gap-3" key={step}>
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full ${
                      detectedStatus === "complete"
                        ? "bg-black"
                        : isComplete
                          ? "bg-black"
                          : isActive
                            ? "bg-slate-700"
                            : "bg-slate-300"
                    }`}
                  />
                  {index < stepItems.length - 1 ? (
                    <span
                      className={`mt-2 h-7 w-px ${
                        detectedStatus === "complete"
                          ? "bg-black/70"
                          : isComplete
                            ? "bg-black/70"
                            : "bg-slate-200"
                      }`}
                    />
                  ) : null}
                </div>
                <span
                  className={`min-w-[220px] text-[13px] leading-5 ${
                    isActive
                      ? "font-medium text-slate-900 opacity-100"
                      : isComplete
                        ? "font-medium text-slate-800 opacity-100"
                        : "font-normal text-slate-500 opacity-55"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {showPermissionPrompt ? (
        <PermissionPrompt
          permissionStatus={permissionStatus}
          isRefreshingPermissions={isRefreshingPermissions}
          onRefreshPermissions={onRefreshPermissions}
          onOpenPermissionSettings={onOpenPermissionSettings}
        />
      ) : null}
    </div>
  );
}

function TestStage({
  sessionState,
  isRecordingActionPending,
  onStartRecording,
  onStopRecording,
  onComplete,
}: {
  sessionState: SessionState;
  isRecordingActionPending: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onComplete: () => void;
}) {
  const [isDemoVisible, setIsDemoVisible] = useState(false);
  const isRecording = sessionState.state === "recording";
  const isBusy =
    sessionState.state === "transcribing" ||
    sessionState.state === "cleaning" ||
    sessionState.state === "pasting";
  const finalOutput = sessionState.final_output;
  const processedMs =
    finalOutput && sessionState.stt_latency_ms !== null
      ? (sessionState.stt_latency_ms ?? 0) + (sessionState.cleanup_latency_ms ?? 0)
      : null;
  const testActionLabel = isRecording ? "Stop recording" : finalOutput ? "Try again" : "Start test";

  function runTestAction() {
    if (isRecording) {
      onStopRecording();
      return;
    }

    onStartRecording();
  }

  return (
    <div className="rounded-[34px] border border-black/10 bg-white/78 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.1)] backdrop-blur-2xl md:p-10">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
          Test dictation
        </p>
      </div>

      <div className="mx-auto mt-9 max-w-3xl rounded-[28px] border border-emerald-950/10 bg-emerald-950/[0.035] p-6 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-900">
            Final output
          </p>
          <span className="text-sm text-emerald-900/70">
            {isRecording
              ? "Listening..."
              : isBusy
                ? "Processing..."
                : finalOutput
                  ? "Ready"
                  : "Waiting for test"}
          </span>
        </div>
        <div className="mt-4 min-h-[150px] rounded-[22px] border border-emerald-950/10 bg-white/70 p-5 text-base leading-7 text-slate-900">
          {finalOutput ??
            `Hold ${sessionState.hotkey} and say: “The quarterly report shows strong growth.” Release to finish.`}
        </div>
      </div>

      <div className="mt-5 text-center text-sm text-slate-600">
        {sessionState.state === "error"
          ? sessionState.message
          : processedMs !== null
            ? `Processed in ${processedMs}ms`
            : "Use the shortcut or Start test button below."}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          className="rounded-2xl border border-black/10 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-black/20 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={(isBusy && !isRecording) || isRecordingActionPending}
          onClick={runTestAction}
          type="button"
        >
          {testActionLabel}
        </button>
        <button
          className="rounded-2xl border border-black/10 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-black/20 hover:text-slate-950"
          onClick={() => setIsDemoVisible((current) => !current)}
          type="button"
        >
          {isDemoVisible ? "Hide demo" : "Quick demo"}
        </button>
        <Button
          className="rounded-2xl bg-slate-950 px-6 py-6 text-base text-white hover:bg-slate-900"
          disabled={!finalOutput}
          onClick={onComplete}
          size="lg"
        >
          Looks great
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
            src={DEMO_VIDEO_URL}
          />
        </div>
      ) : null}
    </div>
  );
}

export function LocalOnboardingPage({
  stage,
  stepItems,
  progressStepLabel,
  progressValue,
  statusMessage,
  detectedStatus,
  missingItems,
  showPermissionPrompt,
  permissionStatus,
  isRefreshingPermissions,
  onRefreshPermissions,
  onOpenPermissionSettings,
  onBack,
  onComplete,
  sessionState,
  isRecordingActionPending,
  onStartRecording,
  onStopRecording,
}: LocalOnboardingPageProps) {
  return (
    <Shell onBack={onBack}>
      {stage === "setup" ? (
        <SetupStage
          stepItems={stepItems}
          progressStepLabel={progressStepLabel}
          progressValue={progressValue}
          statusMessage={statusMessage}
          detectedStatus={detectedStatus}
          missingItems={missingItems}
          showPermissionPrompt={showPermissionPrompt}
          permissionStatus={permissionStatus}
          isRefreshingPermissions={isRefreshingPermissions}
          onRefreshPermissions={onRefreshPermissions}
          onOpenPermissionSettings={onOpenPermissionSettings}
        />
      ) : (
        <TestStage
          sessionState={sessionState}
          isRecordingActionPending={isRecordingActionPending}
          onStartRecording={onStartRecording}
          onStopRecording={onStopRecording}
          onComplete={onComplete}
        />
      )}
    </Shell>
  );
}
