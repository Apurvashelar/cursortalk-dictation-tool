import { ArrowLeft, LoaderCircle } from "lucide-react";
import { motion } from "framer-motion";

import { BackgroundPaths } from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";

type OrganizationOnboardingPageProps = {
  baseUrl: string;
  apiKey: string;
  status: "idle" | "checking" | "unknown" | "healthy" | "degraded" | "unreachable";
  statusMessage: string;
  onBack: () => void;
  onBaseUrlChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onCheckConnection: () => void;
  onContinue: () => void;
};

export function OrganizationOnboardingPage({
  baseUrl,
  apiKey,
  status,
  statusMessage,
  onBack,
  onBaseUrlChange,
  onApiKeyChange,
  onCheckConnection,
  onContinue,
}: OrganizationOnboardingPageProps) {
  const canContinue = status === "healthy" || status === "degraded";
  const healthUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/health` : "";

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
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-base font-medium uppercase tracking-[0.22em] text-slate-500">
                Organization setup
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Connect this app to your company cleanup server. Once verified, future launches
                will go straight to Home.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
              <div className="rounded-[28px] border border-black/10 bg-white/82 p-7 shadow-[0_20px_80px_rgba(15,23,42,0.06)]">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  Connection
                </p>
                <div className="mt-5 space-y-5">
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
              </div>

              <div className="rounded-[28px] border border-black/10 bg-white/82 p-7 shadow-[0_20px_80px_rgba(15,23,42,0.06)]">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                  Status
                </p>
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-black/8 bg-black/[0.025] px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Health endpoint
                    </p>
                    <p className="mt-2 text-sm text-slate-800">{healthUrl || "Enter a server URL"}</p>
                  </div>

                  <div className="rounded-2xl border border-black/8 bg-black/[0.025] px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                      Backend status
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {status === "healthy"
                        ? "Connected"
                        : status === "checking"
                          ? "Checking connection"
                          : status === "degraded"
                            ? "Reachable, but check response"
                            : status === "unreachable"
                              ? "Connection failed"
                              : "Not checked yet"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{statusMessage}</p>
                  </div>

                  <div className="rounded-2xl border border-black/8 bg-black/[0.025] px-4 py-3 text-sm leading-6 text-slate-600">
                    Use the SSH tunnel URL during development. Later we can swap this to the real
                    enterprise server without changing the dictation flow.
                  </div>
                </div>
              </div>
            </div>

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
                onClick={onContinue}
                type="button"
              >
                Continue
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </BackgroundPaths>
  );
}
