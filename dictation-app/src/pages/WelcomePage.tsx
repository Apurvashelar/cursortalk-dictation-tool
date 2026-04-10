import { ArrowLeft, Mic } from "lucide-react";
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
  onClick,
}: {
  title: string;
  subtitle: string;
  tag: string;
  attributes: string[];
  storageFootnote?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="group relative grid h-full w-full grid-rows-[auto_auto_auto_1fr_auto_auto] rounded-[28px] border border-black/10 bg-white/78 p-7 text-left shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-black/25 hover:bg-white/92 hover:shadow-[0_32px_120px_rgba(15,23,42,0.14)]"
      onClick={onClick}
      type="button"
    >
      <div className="mb-4 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
        {tag}
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="max-w-sm text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>

      <ul className="mt-6 space-y-2 self-start">
        {attributes.map((attribute) => (
          <li className="flex items-start gap-3 text-[15px] leading-6 text-slate-700" key={attribute}>
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-950" />
            <span>{attribute}</span>
          </li>
        ))}
      </ul>

      {storageFootnote ? (
        <div className="mt-6 rounded-xl border border-black/8 bg-black/[0.03] px-3.5 py-2.5 text-[13px] leading-5 text-slate-600">
          {storageFootnote}
        </div>
      ) : (
        <div className="mt-6" />
      )}

      <div className="mt-7 self-end text-sm font-medium text-slate-950 transition-transform duration-300 group-hover:translate-x-1">
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
      <div
        className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10"
        style={{ fontFamily: '"IBM Plex Sans", "Inter", "Helvetica Neue", sans-serif' }}
      >
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
                <h1 className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
                  Choose mode
                </h1>
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
                  onClick={() => onChooseMode("organization")}
                />
              </div>

              <div className="mt-8 text-center text-sm text-slate-600">
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
      <div
        className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10"
        style={{ fontFamily: '"IBM Plex Sans", "Inter", "Helvetica Neue", sans-serif' }}
      >
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
            <h1 className="text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Voice Dictation
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Hold a hotkey, speak, release, and text is inserted where your cursor is.
            </p>

            <div className="mt-14">
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
