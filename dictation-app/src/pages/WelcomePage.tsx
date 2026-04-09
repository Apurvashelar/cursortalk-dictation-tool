import type { ReactNode } from "react";
import { ArrowLeft, Building2, Mic, LaptopMinimal } from "lucide-react";
import { motion } from "framer-motion";

import { BackgroundPaths } from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";

type WelcomePageProps = {
  step: "welcome" | "mode";
  onContinue: () => void;
  onBack: () => void;
  onChooseMode: (mode: "local" | "organization") => void;
};

function ModeCard({
  title,
  subtitle,
  tag,
  attributes,
  storageFootnote,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  tag: string;
  attributes: string[];
  storageFootnote?: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className="group relative w-full rounded-[28px] border border-black/10 bg-white/78 p-7 text-left shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-black/20 hover:bg-white/88"
      onClick={onClick}
      type="button"
    >
      <div className="mb-4 inline-flex rounded-full border border-emerald-900/10 bg-emerald-950/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        {tag}
      </div>

      <div className="mb-5 inline-flex rounded-2xl border border-black/10 bg-black/5 p-3 text-slate-900">
        {icon}
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="max-w-sm text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>

      <ul className="mt-6 space-y-3">
        {attributes.map((attribute) => (
          <li className="flex items-start gap-3 text-sm leading-6 text-slate-700" key={attribute}>
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-950" />
            <span>{attribute}</span>
          </li>
        ))}
      </ul>

      {storageFootnote ? (
        <div className="mt-6 rounded-2xl border border-black/8 bg-black/[0.03] px-4 py-3 text-sm text-slate-600">
          {storageFootnote}
        </div>
      ) : null}

      <div className="mt-7 text-sm font-medium text-slate-950 transition-transform duration-300 group-hover:translate-x-1">
        Choose {title}
      </div>
    </button>
  );
}

export function WelcomePage({
  step,
  onContinue,
  onBack,
  onChooseMode,
}: WelcomePageProps) {
  if (step === "mode") {
    return (
      <BackgroundPaths>
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
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
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
                  Choose mode
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
                  Choose how Voice Dictation should run
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
                  Pick the setup that matches your workflow today. You can change this later in
                  Settings.
                </p>
              </div>

              <div className="mt-10 grid gap-5 md:grid-cols-2">
                <ModeCard
                  title="Personal"
                  subtitle="Runs on this computer"
                  tag="Recommended for individual use"
                  attributes={[
                    "Downloads speech + cleanup models",
                    "No server required",
                    "Better privacy, heavier local setup",
                  ]}
                  storageFootnote="Expect roughly 3.2GB of first-launch downloads: about 1.5GB for speech models and 1.7GB for cleanup."
                  icon={<LaptopMinimal className="h-6 w-6" />}
                  onClick={() => onChooseMode("local")}
                />
                <ModeCard
                  title="Organization"
                  subtitle="Connects to company server"
                  tag="Recommended for managed deployments"
                  attributes={[
                    "Fast setup",
                    "Requires server URL + API key",
                    "Managed by IT/admin",
                  ]}
                  icon={<Building2 className="h-6 w-6" />}
                  onClick={() => onChooseMode("organization")}
                />
              </div>

              <div className="mt-8 rounded-[24px] border border-black/8 bg-black/[0.035] px-5 py-4 text-sm text-slate-600">
                You can change this later in Settings.
              </div>
            </div>
          </motion.div>
        </div>
      </BackgroundPaths>
    );
  }

  return (
    <BackgroundPaths>
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-4xl text-center"
        >
          <div className="mx-auto max-w-3xl rounded-[34px] border border-black/10 bg-white/76 px-8 py-10 shadow-[0_30px_120px_rgba(15,23,42,0.1)] backdrop-blur-2xl md:px-12 md:py-12">
            <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-[22px] border border-black/10 bg-black/5 text-slate-950">
              <Mic className="h-7 w-7" />
            </div>
            <h1 className="text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Voice Dictation
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Hold a hotkey, speak, release, and text is inserted where your cursor is.
            </p>

            <div className="mx-auto mt-8 grid max-w-xl gap-3 text-left">
              <div className="flex items-start gap-3 rounded-2xl border border-black/8 bg-black/[0.03] px-4 py-3 text-sm text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-950" />
                <span>Works in any app</span>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-black/8 bg-black/[0.03] px-4 py-3 text-sm text-slate-700">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-950" />
                <span>Personal or Organization mode</span>
              </div>
            </div>

            <div className="mt-10">
              <Button
                className="rounded-2xl bg-slate-950 px-8 py-6 text-base text-white hover:bg-slate-900"
                onClick={onContinue}
                size="lg"
              >
                Continue
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </BackgroundPaths>
  );
}
