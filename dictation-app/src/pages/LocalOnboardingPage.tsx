import { ArrowLeft, PlayCircle, X } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { BackgroundPaths } from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";

export type LocalOnboardingStage = "setup" | "demo" | "test";

type LocalOnboardingPageProps = {
  stage: LocalOnboardingStage;
  progressStepLabel: string;
  progressValue: number;
  onBack: () => void;
  onSkipDemo: () => void;
  onContinueFromDemo: () => void;
  onComplete: () => void;
};

const DEMO_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const setupSteps = [
  "Checking storage",
  "Preparing local folders",
  "Downloading speech model",
  "Downloading cleanup model",
  "Verifying files",
  "Preparing local runtime",
];

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
  progressStepLabel,
  progressValue,
}: {
  progressStepLabel: string;
  progressValue: number;
}) {
  return (
    <div className="rounded-[34px] border border-black/10 bg-white/78 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.1)] backdrop-blur-2xl md:p-10">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
          Local mode
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          Setting up Local mode
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Downloading and preparing local dictation models on this machine.
        </p>
      </div>

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

      <div className="mx-auto mt-10 grid max-w-3xl gap-3 md:grid-cols-2">
        <div className="rounded-[24px] border border-black/8 bg-black/[0.025] px-5 py-4 text-sm text-slate-600">
          About 3.2 GB total download for local speech and cleanup models.
        </div>
        <div className="rounded-[24px] border border-black/8 bg-black/[0.025] px-5 py-4 text-sm text-slate-600">
          Local mode will be ready automatically once model preparation finishes.
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-3 md:grid-cols-2">
        {setupSteps.map((step) => {
          const isActive = step === progressStepLabel;
          const isComplete = setupSteps.indexOf(step) < setupSteps.indexOf(progressStepLabel);

          return (
            <div
              className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white/70 px-4 py-3"
              key={step}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isComplete ? "bg-slate-950" : isActive ? "bg-slate-700" : "bg-slate-300"
                }`}
              />
              <span className={isActive ? "text-slate-900" : "text-slate-600"}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DemoStage({
  onSkipDemo,
  onContinueFromDemo,
}: {
  onSkipDemo: () => void;
  onContinueFromDemo: () => void;
}) {
  return (
    <div className="rounded-[34px] border border-black/10 bg-white/78 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.1)] backdrop-blur-2xl md:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
            Quick demo
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
            See how local dictation feels
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            Watch a short example before your first local test. You can skip this at any time.
          </p>
        </div>
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/80 text-slate-600 transition-colors hover:text-slate-950"
          onClick={onSkipDemo}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-8 overflow-hidden rounded-[28px] border border-black/10 bg-black shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
        <video
          autoPlay
          className="h-[360px] w-full object-cover"
          controls
          loop
          muted
          playsInline
          src={DEMO_VIDEO_URL}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Button
          className="rounded-2xl bg-slate-950 px-6 py-6 text-base text-white hover:bg-slate-900"
          onClick={onContinueFromDemo}
          size="lg"
        >
          Continue to test
        </Button>
        <button
          className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
          onClick={onSkipDemo}
          type="button"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function TestStage({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="rounded-[34px] border border-black/10 bg-white/78 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.1)] backdrop-blur-2xl md:p-10">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
          Local mode ready
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
          Test local mode
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Your local setup is ready. Run a short dictation next, or skip the test and go straight
          to the app.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-black/8 bg-black/[0.025] px-5 py-4 text-left">
          <p className="text-sm font-semibold text-slate-950">Speech model</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Prepared locally on this machine.</p>
        </div>
        <div className="rounded-[24px] border border-black/8 bg-black/[0.025] px-5 py-4 text-left">
          <p className="text-sm font-semibold text-slate-950">Cleanup model</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Prepared locally on this machine.</p>
        </div>
        <div className="rounded-[24px] border border-black/8 bg-black/[0.025] px-5 py-4 text-left">
          <p className="text-sm font-semibold text-slate-950">Next step</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Start a short dictation from the main screen.
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button
          className="rounded-2xl bg-slate-950 px-6 py-6 text-base text-white hover:bg-slate-900"
          onClick={onComplete}
          size="lg"
        >
          <PlayCircle className="mr-2 h-4 w-4" />
          Test dictation
        </Button>
        <button
          className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-950"
          onClick={onComplete}
          type="button"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

export function LocalOnboardingPage({
  stage,
  progressStepLabel,
  progressValue,
  onBack,
  onSkipDemo,
  onContinueFromDemo,
  onComplete,
}: LocalOnboardingPageProps) {
  return (
    <Shell onBack={onBack}>
      {stage === "setup" ? (
        <SetupStage progressStepLabel={progressStepLabel} progressValue={progressValue} />
      ) : stage === "demo" ? (
        <DemoStage onContinueFromDemo={onContinueFromDemo} onSkipDemo={onSkipDemo} />
      ) : (
        <TestStage onComplete={onComplete} />
      )}
    </Shell>
  );
}
