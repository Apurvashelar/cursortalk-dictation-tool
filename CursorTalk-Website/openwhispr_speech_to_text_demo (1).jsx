"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Mic, Send, Waves } from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type TypingOp =
  | { type: "type"; text: string; cps?: number }
  | { type: "pause"; ms: number }
  | { type: "backspace"; count: number; cps?: number };

type PlaybackState = {
  value: string;
  isActive: boolean;
};

const HUMAN_SCRIPT: TypingOp[] = [
  { type: "pause", ms: 300 },
  { type: "type", text: "hey team ", cps: 7 },
  { type: "pause", ms: 280 },
  { type: "type", text: "can we move sprint plannng", cps: 7 },
  { type: "pause", ms: 500 },
  { type: "backspace", count: 3, cps: 12 },
  { type: "type", text: "ing", cps: 8 },
  { type: "pause", ms: 350 },
  { type: "type", text: " to 3 pm tomororw", cps: 7 },
  { type: "pause", ms: 420 },
  { type: "backspace", count: 4, cps: 13 },
  { type: "type", text: "row", cps: 8 },
  { type: "pause", ms: 260 },
  { type: "type", text: " because deign needs more time", cps: 7 },
  { type: "pause", ms: 480 },
  { type: "backspace", count: 22, cps: 14 },
  { type: "type", text: "design needs more time on the handoff.", cps: 7 },
  { type: "pause", ms: 900 },
];

const VOICE_PASTE_TEXT =
  "Hey team — can we move sprint planning to 3 PM tomorrow? Design needs a bit more time on the handoff. I’ll send the updated agenda shortly.";

function buildTimeline(script: TypingOp[]) {
  const frames: Array<{ at: number; value: string; isActive: boolean }> = [];
  let t = 0;
  let value = "";

  for (const op of script) {
    if (op.type === "pause") {
      frames.push({ at: t, value, isActive: false });
      t += op.ms;
      continue;
    }

    if (op.type === "type") {
      const cps = op.cps ?? 10;
      const stepMs = 1000 / cps;
      for (const char of op.text) {
        value += char;
        frames.push({ at: t, value, isActive: true });
        t += stepMs;
      }
      continue;
    }

    const cps = op.cps ?? 14;
    const stepMs = 1000 / cps;
    for (let i = 0; i < op.count; i += 1) {
      value = value.slice(0, -1);
      frames.push({ at: t, value, isActive: true });
      t += stepMs;
    }
  }

  return { frames, duration: t + 400 };
}

function useScriptPlayback(script: TypingOp[]): PlaybackState {
  const timeline = useMemo(() => buildTimeline(script), [script]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      setElapsed((now - start) % timeline.duration);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timeline.duration]);

  return useMemo(() => {
    let current: PlaybackState = { value: "", isActive: false };

    for (const frame of timeline.frames) {
      if (elapsed >= frame.at) {
        current = { value: frame.value, isActive: frame.isActive };
      } else {
        break;
      }
    }

    return current;
  }, [elapsed, timeline.frames]);
}

function useLinkedPastePlayback(
  triggerValue: string,
  finalText: string,
  holdMs = 2400,
): PlaybackState {
  const [isVisible, setIsVisible] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    if (!hasTriggered && triggerValue.toLowerCase().includes("sprint")) {
      setHasTriggered(true);
      setIsVisible(true);

      const timeoutId = window.setTimeout(() => {
        setIsVisible(false);
      }, holdMs);

      return () => window.clearTimeout(timeoutId);
    }
  }, [triggerValue, hasTriggered, holdMs]);

  useEffect(() => {
    if (triggerValue.length === 0) {
      setHasTriggered(false);
      setIsVisible(false);
    }
  }, [triggerValue]);

  return useMemo(
    () => ({
      value: isVisible ? finalText : "",
      isActive: false,
    }),
    [isVisible, finalText],
  );
}

function Caret({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-1 rounded-full bg-black/70 align-baseline dark:bg-white/80",
        active ? "animate-pulse" : "opacity-60",
      )}
    />
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/35 [animation-delay:-0.2s] dark:bg-white/45" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/35 [animation-delay:-0.1s] dark:bg-white/45" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/35 dark:bg-white/45" />
    </div>
  );
}

function WindowChrome({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
      </div>
      <div className="text-xs font-medium text-black/55 dark:text-white/55">{title}</div>
      <div className="w-14" />
    </div>
  );
}

function ChatComposer({
  value,
  isActive,
  withVoice,
}: {
  value: string;
  isActive: boolean;
  withVoice?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-black dark:text-white">
        <div className="rounded-lg bg-[#4A154B] px-2 py-1 text-xs font-semibold text-white">Slack</div>
        <span className="text-black/45 dark:text-white/45">—</span>
        <span className="text-black/70 dark:text-white/70">#product</span>
      </div>

      <div className="rounded-2xl border border-black/10 bg-neutral-50 p-3 dark:border-white/10 dark:bg-neutral-950">
        <div className="mb-2 text-xs text-black/40 dark:text-white/40">Type a message…</div>
        <div className="min-h-[92px] text-[15px] leading-7 text-black dark:text-white">
          {value ? (
            <>
              <span>{value}</span>
              {!withVoice && <Caret active={isActive} />}
            </>
          ) : withVoice ? null : (
            <TypingDots />
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-black/45 dark:text-white/45">
          {withVoice ? (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Mic className="h-3.5 w-3.5" />
                Listening
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                <Waves className="h-3.5 w-3.5" />
                AI cleanup
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-white/5">
              Manual typing
            </span>
          )}
        </div>

        <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SpeedCard({
  label,
  wpm,
  tone,
  children,
}: {
  label: string;
  wpm: string;
  tone: "muted" | "accent";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border backdrop-blur",
        tone === "accent"
          ? "border-emerald-200 bg-gradient-to-b from-emerald-50 to-white shadow-[0_20px_80px_-30px_rgba(16,185,129,0.45)] dark:border-emerald-500/20 dark:from-emerald-500/10 dark:to-neutral-950"
          : "border-black/10 bg-white/80 shadow-sm dark:border-white/10 dark:bg-neutral-950/80",
      )}
    >
      <WindowChrome title={label} />
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-black/60 dark:text-white/55">{label}</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-black dark:text-white">{wpm}</div>
          </div>
          {tone === "accent" ? (
            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Faster
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

export default function OpenWhisprSpeechToTextDemo() {
  const withoutPlayback = useScriptPlayback(HUMAN_SCRIPT);
  const withPlayback = useLinkedPastePlayback(withoutPlayback.value, VOICE_PASTE_TEXT);

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-black/10 bg-gradient-to-b from-white to-neutral-50 px-6 py-8 dark:border-white/10 dark:from-neutral-950 dark:to-neutral-900 md:px-8 md:py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.04),_transparent_45%)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_transparent_45%)]" />

      <div className="relative mb-8 max-w-2xl">
        <div className="mb-3 inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-black/60 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/60">
          Speech-to-Text
        </div>
        <h2 className="text-3xl font-semibold tracking-tight text-black dark:text-white md:text-4xl">
          Your voice is faster than your keyboard.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-black/60 dark:text-white/60 md:text-base">
          This version uses a real typing timeline with pauses, typos, backspaces, and corrections on the left, while the right side pastes the cleaned message once the left side reaches sprint.
        </p>
      </div>

      <div className="relative grid gap-5 lg:grid-cols-2">
        <SpeedCard label="Without OpenWhispr" wpm="~40 WPM" tone="muted">
          <ChatComposer value={withoutPlayback.value} isActive={withoutPlayback.isActive} />
        </SpeedCard>

        <SpeedCard label="With OpenWhispr" wpm="~150 WPM" tone="accent">
          <ChatComposer value={withPlayback.value} isActive={false} withVoice />
        </SpeedCard>
      </div>
    </section>
  );
}
