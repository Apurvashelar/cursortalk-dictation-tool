import { listen } from "@tauri-apps/api/event";
import { useEffect, useMemo, useState } from "react";

import type { SessionState } from "../api/backend";
import "../styles/pill.css";

type PillState =
  | { state: "recording"; speaking: boolean; elapsed_seconds: number }
  | { state: "processing" }
  | { state: "done" }
  | { state: "error" };

type PillIndicatorProps = {
  sessionState: SessionState;
};

const PILL_UPDATE_EVENT = "pill:update-state";
const PILL_HIDE_EVENT = "pill:hide";
const fadeTimeoutsByState: Record<"done" | "error", number> = {
  done: 1500,
  error: 3000,
};

function formatElapsedSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function DoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 14 14" className="pill-icon">
      <path
        d="M3 7.2 5.6 9.8 11 4.4"
        fill="none"
        stroke="#16A34A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 14 14" className="pill-icon">
      <circle cx="7" cy="7" r="5.5" fill="none" stroke="#E24B4A" strokeWidth="1.6" />
      <path
        d="M5.2 5.2 8.8 8.8M8.8 5.2 5.2 8.8"
        fill="none"
        stroke="#E24B4A"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PillIndicator({ sessionState }: PillIndicatorProps) {
  const [pillState, setPillState] = useState<PillState | null>(null);
  const [isFading, setIsFading] = useState(false);
  useEffect(() => {
    let isMounted = true;

    const setupListeners = async () => {
      const unlistenUpdate = await listen<PillState>(PILL_UPDATE_EVENT, (event) => {
        if (!isMounted) {
          return;
        }

        setIsFading(false);
        setPillState(event.payload);
      });

      const unlistenHide = await listen(PILL_HIDE_EVENT, () => {
        if (!isMounted) {
          return;
        }

        setIsFading(false);
        setPillState(null);
      });

      return () => {
        unlistenUpdate();
        unlistenHide();
      };
    };

    const unlistenPromise = setupListeners();

    return () => {
      isMounted = false;
      void unlistenPromise.then((dispose) => dispose());
    };
  }, []);

  const effectivePillState = useMemo<PillState | null>(() => {
    const sessionDerivedState: PillState | null =
      sessionState.state === "recording"
        ? { state: "recording", speaking: false, elapsed_seconds: 0 }
        : sessionState.state === "transcribing" ||
            sessionState.state === "cleaning" ||
            sessionState.state === "pasting"
          ? { state: "processing" }
          : sessionState.state === "error"
            ? { state: "error" }
            : sessionState.state === "idle" && sessionState.final_output && sessionState.last_paste_message
              ? { state: "done" }
              : null;

    if (sessionDerivedState?.state === "recording") {
      return pillState?.state === "recording" ? pillState : sessionDerivedState;
    }

    if (sessionDerivedState?.state === "processing") {
      return sessionDerivedState;
    }

    if (sessionDerivedState?.state === "done") {
      return pillState?.state === "done" ? pillState : sessionDerivedState;
    }

    if (sessionDerivedState?.state === "error") {
      return pillState?.state === "error" ? pillState : sessionDerivedState;
    }

    return pillState;
  }, [pillState, sessionState]);

  useEffect(() => {
    if (!effectivePillState || (effectivePillState.state !== "done" && effectivePillState.state !== "error")) {
      return;
    }

    setIsFading(false);
    const visibleMs = fadeTimeoutsByState[effectivePillState.state];
    const fadeTimeoutId = window.setTimeout(() => {
      setIsFading(true);
    }, visibleMs);
    const hideTimeoutId = window.setTimeout(() => {
      setPillState(null);
      setIsFading(false);
    }, visibleMs + 300);

    return () => {
      window.clearTimeout(fadeTimeoutId);
      window.clearTimeout(hideTimeoutId);
    };
  }, [effectivePillState]);

  const timerLabel = useMemo(() => {
    if (!effectivePillState || effectivePillState.state !== "recording") {
      return "0:00";
    }

    return formatElapsedSeconds(effectivePillState.elapsed_seconds);
  }, [effectivePillState]);

  if (!effectivePillState) {
    return null;
  }

  return (
    <div
      className={`pill pill--${effectivePillState.state} ${isFading ? "pill--fade-out" : ""}`}
      role="status"
      aria-live="polite"
    >
      {effectivePillState.state === "recording" ? (
        <>
          <span className="pill-dot" />
          <div className="pill-waveform" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <span
                key={`pill-bar-${index}`}
                className={`pill-bar ${effectivePillState.speaking ? "pill-bar--wave" : "pill-bar--flat"}`}
              />
            ))}
          </div>
          <span className="pill-timer">{timerLabel}</span>
        </>
      ) : null}

      {effectivePillState.state === "processing" ? (
        <span className="pill-text pill-text--processing">Processing...</span>
      ) : null}

      {effectivePillState.state === "done" ? (
        <>
          <DoneIcon />
          <span className="pill-text pill-text--done">Done</span>
        </>
      ) : null}

      {effectivePillState.state === "error" ? (
        <>
          <ErrorIcon />
          <span className="pill-text pill-text--error">Error</span>
        </>
      ) : null}
    </div>
  );
}
