import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

import type { PermissionStatusReport } from "../api/backend";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";

type PermissionOnboardingPageProps = {
  mode: "local" | "organization";
  permissionStatus: PermissionStatusReport;
  isRefreshingPermissions: boolean;
  onBack: () => void;
  onContinue: () => void;
  onRefreshPermissions: () => void;
  onOpenPermissionSettings: (permission: "microphone" | "accessibility") => void;
};

export function PermissionOnboardingPage({
  mode,
  permissionStatus,
  isRefreshingPermissions,
  onBack,
  onContinue,
  onRefreshPermissions,
  onOpenPermissionSettings,
}: PermissionOnboardingPageProps) {
  const continueLabel = mode === "local" ? "Continue to demo" : "Continue";
  const microphoneNeedsAccess = permissionStatus.microphone.status !== "ready";
  const accessibilityNeedsAccess = permissionStatus.accessibility.status !== "ready";

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

          <div className="mx-auto max-w-2xl rounded-[34px] border border-black/10 bg-white/78 p-8 shadow-[0_30px_120px_rgba(15,23,42,0.1)] backdrop-blur-2xl md:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-base font-medium uppercase tracking-[0.22em] text-slate-500">
                Permissions
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600">
                Voice Dictation needs access to record and paste into other apps.
              </p>
            </div>

            <div className="mx-auto mt-9 max-w-xl divide-y divide-black/10 border-y border-black/10">
              <div className="flex items-center justify-between gap-5 py-5">
                <div>
                  <p className="text-sm font-medium text-slate-950">Microphone</p>
                  <p className="mt-1 text-sm text-slate-500">Required for recording</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="status-pill" data-status={permissionStatus.microphone.status}>
                    {permissionStatus.microphone.label}
                  </span>
                  {microphoneNeedsAccess ? (
                    <button
                      className="text-sm font-medium text-slate-600 underline underline-offset-4 transition-colors hover:text-slate-950"
                      onClick={() => onOpenPermissionSettings("microphone")}
                      type="button"
                    >
                      Open
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between gap-5 py-5">
                <div>
                  <p className="text-sm font-medium text-slate-950">Accessibility</p>
                  <p className="mt-1 text-sm text-slate-500">Required for paste</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="status-pill"
                    data-status={permissionStatus.accessibility.status}
                  >
                    {permissionStatus.accessibility.label}
                  </span>
                  {accessibilityNeedsAccess ? (
                    <button
                      className="text-sm font-medium text-slate-600 underline underline-offset-4 transition-colors hover:text-slate-950"
                      onClick={() => onOpenPermissionSettings("accessibility")}
                      type="button"
                    >
                      Open
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                className="rounded-2xl border border-black/10 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-black/20 hover:text-slate-950"
                onClick={onRefreshPermissions}
                type="button"
              >
                {isRefreshingPermissions ? "Refreshing..." : "Refresh"}
              </button>
              <Button
                className="rounded-2xl bg-slate-950 px-6 py-6 text-base text-white hover:bg-slate-900"
                onClick={onContinue}
                size="lg"
              >
                {continueLabel}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </BackgroundPaths>
  );
}
