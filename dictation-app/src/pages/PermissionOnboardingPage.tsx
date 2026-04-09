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
                Permissions
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Before your first {mode === "local" ? "local" : "organization"}{" "}
                {mode === "local" ? "demo and test" : "session"}, confirm the app can record and
                paste into other desktop apps.
              </p>
            </div>

            <div className="mx-auto mt-10 max-w-4xl space-y-4">
              <div className="rounded-[28px] border border-black/10 bg-white/82 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="max-w-2xl">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Microphone
                    </p>
                    <p className="mt-3 text-base font-medium text-slate-950">
                      {permissionStatus.microphone.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {permissionStatus.microphone.message}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="status-pill"
                      data-status={permissionStatus.microphone.status}
                    >
                      {permissionStatus.microphone.label}
                    </span>
                    <button
                      className="secondary-button"
                      onClick={() => onOpenPermissionSettings("microphone")}
                      type="button"
                    >
                      Open System Settings
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-black/10 bg-white/82 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="max-w-2xl">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      Accessibility
                    </p>
                    <p className="mt-3 text-base font-medium text-slate-950">
                      {permissionStatus.accessibility.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {permissionStatus.accessibility.message}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="status-pill"
                      data-status={permissionStatus.accessibility.status}
                    >
                      {permissionStatus.accessibility.label}
                    </span>
                    <button
                      className="secondary-button"
                      onClick={() => onOpenPermissionSettings("accessibility")}
                      type="button"
                    >
                      Open System Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Button
                className="rounded-2xl bg-slate-950 px-6 py-6 text-base text-white hover:bg-slate-900"
                onClick={onRefreshPermissions}
                size="lg"
              >
                {isRefreshingPermissions ? "Refreshing..." : "Refresh permissions"}
              </Button>
              <button
                className="rounded-2xl border border-black/10 px-6 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-black/20 hover:text-slate-950"
                onClick={onContinue}
                type="button"
              >
                {continueLabel}
              </button>
            </div>

            <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-6 text-slate-500">
              You can continue now and refresh after granting access, but recording needs
              Microphone access and paste automation needs Accessibility access.
            </p>
          </div>
        </motion.div>
      </div>
    </BackgroundPaths>
  );
}
