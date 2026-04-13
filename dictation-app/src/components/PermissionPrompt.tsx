import type { PermissionStatusReport } from "../api/backend";

type PermissionPromptProps = {
  permissionStatus: PermissionStatusReport;
  isRefreshingPermissions: boolean;
  onRefreshPermissions: () => void;
  onOpenPermissionSettings: (permission: "microphone" | "accessibility") => void;
};

export function permissionsNeedAction(permissionStatus: PermissionStatusReport) {
  return (
    permissionStatus.microphone.status !== "ready" ||
    permissionStatus.accessibility.status !== "ready"
  );
}

export function PermissionPrompt({
  permissionStatus,
  isRefreshingPermissions,
  onRefreshPermissions,
  onOpenPermissionSettings,
}: PermissionPromptProps) {
  const microphoneNeedsAccess = permissionStatus.microphone.status !== "ready";
  const accessibilityNeedsAccess = permissionStatus.accessibility.status !== "ready";

  if (!microphoneNeedsAccess && !accessibilityNeedsAccess) {
    return null;
  }

  return (
    <div className="mx-auto mt-8 max-w-3xl rounded-[22px] border border-black/10 bg-black/[0.025] px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Permissions
          </p>
          <div className="mt-2 space-y-1.5 text-xs text-slate-700">
            {microphoneNeedsAccess ? <p className="m-0">Microphone</p> : null}
            {accessibilityNeedsAccess ? <p className="m-0">Accessibility</p> : null}
          </div>
        </div>
        <button
          className="text-xs font-medium text-slate-600 underline underline-offset-4 transition-colors hover:text-slate-950"
          onClick={onRefreshPermissions}
          type="button"
        >
          {isRefreshingPermissions ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mt-4 space-y-2.5">
        {microphoneNeedsAccess ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/8 bg-white/64 px-4 py-2.5">
            <span className="text-xs font-medium text-slate-800">Microphone</span>
            <button
              className="text-xs font-medium text-slate-600 underline underline-offset-4 transition-colors hover:text-slate-950"
              onClick={() => onOpenPermissionSettings("microphone")}
              type="button"
            >
              Open
            </button>
          </div>
        ) : null}

        {accessibilityNeedsAccess ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/8 bg-white/64 px-4 py-2.5">
            <span className="text-xs font-medium text-slate-800">Accessibility</span>
            <button
              className="text-xs font-medium text-slate-600 underline underline-offset-4 transition-colors hover:text-slate-950"
              onClick={() => onOpenPermissionSettings("accessibility")}
              type="button"
            >
              Open
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
