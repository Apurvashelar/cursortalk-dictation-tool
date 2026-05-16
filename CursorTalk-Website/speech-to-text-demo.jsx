import { useState, useEffect, useRef, useCallback } from "react";

/*
 * Typing script: each entry is either a character to type, or "⌫" for backspace.
 * We embed realistic typos that get partially corrected mid-flow.
 *
 * Final left-side output (sent as message):
 * "hey team can we move sprint planing to 3 pm tomorow becausedesign needs more time on the handoff."
 */

// Helper: add a "notice pause" marker before backspace bursts
const PAUSE = "⏸";

const TYPING_SCRIPT = [
  ..."hey team can we move sprint plann".split(""),
  PAUSE,
  "⌫", // fix double n → "plan"
  ..."ing to 3 pm ".split(""),
  ..."tommorr".split(""),
  PAUSE,
  "⌫","⌫","⌫","⌫", // back to "tom"
  ..."orow".split(""),
  PAUSE,
  "⌫","⌫", // back to "tomo"
  ..."row ".split(""),
  ..."becuase".split(""),
  PAUSE,
  "⌫","⌫","⌫","⌫","⌫", // back to "be"
  ..."causedesign needs more time on the handoff.".split(""),
];

const PASTED_TEXT =
  "Hey team, can we move sprint planning to 3 PM tomorrow? Design needs more time on the handoff.";

// Waveform bar
const WaveBar = ({ active, index }) => {
  const h = active ? 6 + Math.sin(Date.now() / 90 + index * 0.8) * 14 : 3;
  return (
    <div
      style={{
        width: "2.5px",
        height: `${Math.max(3, h)}px`,
        backgroundColor: active ? "#818cf8" : "#3f3f46",
        borderRadius: "2px",
        transition: active ? "height 0.07s ease" : "height 0.4s ease",
      }}
    />
  );
};

const Waveform = ({ active }) => {
  const [, setT] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setT((t) => t + 1), 70);
    return () => clearInterval(id);
  }, [active]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "2px", height: "22px" }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <WaveBar key={i} active={active} index={i} />
      ))}
    </div>
  );
};

const Cursor = ({ visible }) => (
  <span
    style={{
      display: "inline-block",
      width: "2px",
      height: "1.1em",
      backgroundColor: "#a78bfa",
      marginLeft: "1px",
      verticalAlign: "text-bottom",
      animation: visible ? "blink 1s step-end infinite" : "none",
      opacity: visible ? 1 : 0,
    }}
  />
);

/* ─── Panel ─── */
const SlackPanel = ({ label, wpm, inputContent, messageContent, showWave, waveActive, accentColor, showCursorInInput }) => {
  const msgRef = useRef(null);
  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [messageContent]);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "rgba(14,14,18,0.85)",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "13px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#e5e7eb" }}>{label}</span>
        <span
          style={{
            fontSize: "11.5px",
            color: accentColor,
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            background: `${accentColor}14`,
            padding: "3px 10px",
            borderRadius: "20px",
            letterSpacing: "0.02em",
          }}
        >
          ~{wpm} WPM
        </span>
      </div>

      {/* Channel bar */}
      <div
        style={{
          padding: "11px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "14px", opacity: 0.35 }}>#</span>
        <span style={{ fontSize: "13px", color: "#9ca3af" }}>Slack — #product</span>
      </div>

      {/* Messages area */}
      <div
        ref={msgRef}
        style={{
          flex: 1,
          padding: "16px 18px",
          minHeight: "140px",
          maxHeight: "180px",
          overflowY: "auto",
          scrollbarWidth: "none",
        }}
      >
        {messageContent && (
          <div style={{ display: "flex", gap: "10px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                background: `linear-gradient(135deg, ${accentColor}35, ${accentColor}15)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "12px",
                fontWeight: 700,
                color: accentColor,
              }}
            >
              Y
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "3px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#e5e7eb" }}>You</span>
                <span style={{ fontSize: "11px", color: "#52525b" }}>just now</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "13.5px",
                  lineHeight: 1.55,
                  color: "#d1d5db",
                  wordBreak: "break-word",
                }}
              >
                {messageContent}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {showWave ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              height: "38px",
              background: "rgba(99,102,241,0.07)",
              borderRadius: "10px",
              padding: "0 14px",
              border: "1px solid rgba(99,102,241,0.18)",
            }}
          >
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                animation: "pulse-dot 1.4s ease infinite",
                flexShrink: 0,
              }}
            />
            <Waveform active={waveActive} />
            <span
              style={{
                fontSize: "11.5px",
                color: "#818cf8",
                marginLeft: "auto",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              Recording...
            </span>
          </div>
        ) : (
          <div
            style={{
              minHeight: "38px",
              background: "rgba(255,255,255,0.035)",
              borderRadius: "10px",
              padding: "8px 14px",
              display: "flex",
              alignItems: "flex-start",
              border: "1px solid rgba(255,255,255,0.06)",
              transition: "min-height 0.15s ease",
            }}
          >
            {inputContent ? (
              <span style={{ fontSize: "13.5px", color: "#d1d5db", lineHeight: 1.5, wordBreak: "break-word" }}>
                {inputContent}
                <Cursor visible={showCursorInInput} />
              </span>
            ) : (
              <span style={{ fontSize: "13px", color: "#3f3f46", lineHeight: 1.5 }}>Type a message…</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Main ─── */
export default function SpeechToTextDemo() {
  const [leftInput, setLeftInput] = useState("");
  const [leftMessage, setLeftMessage] = useState(null);
  const [leftDone, setLeftDone] = useState(false);

  const [rightPhase, setRightPhase] = useState("idle"); // idle | recording | pasted
  const [rightMessage, setRightMessage] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const containerRef = useRef(null);
  const timeoutsRef = useRef([]);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const addTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  const startAnimation = useCallback(() => {
    if (isPlaying) return;
    clearAllTimeouts();
    setIsPlaying(true);
    setLeftInput("");
    setLeftMessage(null);
    setLeftDone(false);
    setRightPhase("idle");
    setRightMessage(null);

    let currentText = "";
    let delay = 500;

    // ── Left panel: type with mistakes ──
    TYPING_SCRIPT.forEach((action) => {
      if (action === PAUSE) {
        delay += 350 + Math.random() * 200; // pause to "notice" mistake
        return;
      }

      const isBackspace = action === "⌫";
      const charDelay = isBackspace ? 50 : 60 + Math.random() * 55;
      delay += charDelay;

      addTimeout(() => {
        if (isBackspace) {
          currentText = currentText.slice(0, -1);
        } else {
          currentText += action;
        }
        setLeftInput(currentText);
      }, delay);

      // small thinking pause after spaces
      if (!isBackspace && action === " ") {
        delay += 60 + Math.random() * 100;
      }
    });

    const totalLeftTime = delay + 300;

    // "Send" the message after typing finishes
    addTimeout(() => {
      setLeftMessage(leftInput || currentText);
      setLeftInput("");
      setLeftDone(true);
    }, totalLeftTime);

    // fix: capture currentText at send time
    let sentText = "";
    addTimeout(() => {
      // We need to read the final currentText — but closures are tricky.
      // Instead, setLeftMessage via a functional update won't work here.
      // We'll use a ref-based approach below.
    }, totalLeftTime);

    // ── Right panel ──
    // Recording starts shortly after animation begins
    addTimeout(() => setRightPhase("recording"), 600);

    // Paste the clean text after ~2.8s of recording
    addTimeout(() => {
      setRightPhase("pasted");
      setRightMessage(PASTED_TEXT);
    }, 3400);

    addTimeout(() => setIsPlaying(false), totalLeftTime + 400);
  }, [isPlaying]);

  // Use a ref to track leftInput for the "send" moment
  const leftInputRef = useRef("");
  useEffect(() => { leftInputRef.current = leftInput; }, [leftInput]);

  // We need to fix the send — use the ref
  const startAnimationFixed = useCallback(() => {
    if (isPlaying) return;
    clearAllTimeouts();
    setIsPlaying(true);
    setLeftInput("");
    setLeftMessage(null);
    setLeftDone(false);
    setRightPhase("idle");
    setRightMessage(null);

    let delay = 500;

    TYPING_SCRIPT.forEach((action) => {
      if (action === PAUSE) {
        delay += 350 + Math.random() * 200;
        return;
      }

      const isBackspace = action === "⌫";
      const charDelay = isBackspace ? 50 : 60 + Math.random() * 55;
      delay += charDelay;

      addTimeout(() => {
        setLeftInput((prev) => {
          const next = isBackspace ? prev.slice(0, -1) : prev + action;
          leftInputRef.current = next;
          return next;
        });
      }, delay);

      if (!isBackspace && action === " ") {
        delay += 60 + Math.random() * 100;
      }
    });

    const totalLeftTime = delay + 300;

    addTimeout(() => {
      const finalText = leftInputRef.current;
      setLeftMessage(finalText);
      setLeftInput("");
      setLeftDone(true);
    }, totalLeftTime);

    addTimeout(() => setRightPhase("recording"), 600);
    addTimeout(() => {
      setRightPhase("pasted");
      setRightMessage(PASTED_TEXT);
    }, 3400);
    addTimeout(() => setIsPlaying(false), totalLeftTime + 400);
  }, [isPlaying]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayed) {
          setHasPlayed(true);
          setTimeout(() => startAnimationFixed(), 500);
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasPlayed, startAnimationFixed]);

  useEffect(() => () => clearAllTimeouts(), []);

  const handleReplay = () => {
    clearAllTimeouts();
    setIsPlaying(false);
    setLeftInput("");
    setLeftMessage(null);
    setLeftDone(false);
    setRightPhase("idle");
    setRightMessage(null);
    setHasPlayed(true);
    setTimeout(() => startAnimationFixed(), 150);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pasteIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }

        .tab-active {
          padding: 9px 18px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          background: rgba(99,102,241,0.12);
          color: #f3f4f6;
          cursor: default;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
        }

        .replay-btn {
          padding: 9px 22px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid rgba(99,102,241,0.25);
          background: rgba(99,102,241,0.08);
          color: #818cf8;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s ease;
          font-family: 'DM Sans', sans-serif;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .replay-btn:hover {
          background: rgba(99,102,241,0.18);
          border-color: rgba(99,102,241,0.45);
          color: #a5b4fc;
        }

        @media (max-width: 700px) {
          .panels-row { flex-direction: column !important; }
        }
      `}</style>

      <div
        ref={containerRef}
        style={{ width: "100%", maxWidth: "920px", animation: "fadeUp 0.7s ease forwards" }}
      >
        {/* Single tab */}
        <div style={{ marginBottom: "18px" }}>
          <button className="tab-active">Speech-to-Text</button>
        </div>

        {/* Side by side */}
        <div className="panels-row" style={{ display: "flex", gap: "14px" }}>
          <SlackPanel
            label="Without OpenWhispr"
            wpm={40}
            inputContent={leftDone ? "" : leftInput}
            messageContent={leftMessage}
            showWave={false}
            waveActive={false}
            accentColor="#f59e0b"
            showCursorInInput={isPlaying && !leftDone}
          />

          <SlackPanel
            label="With OpenWhispr"
            wpm={150}
            inputContent=""
            messageContent={
              rightMessage ? (
                <span style={{ animation: "pasteIn 0.25s ease forwards" }}>
                  {rightMessage}
                </span>
              ) : null
            }
            showWave={rightPhase === "recording"}
            waveActive={rightPhase === "recording"}
            accentColor="#6366f1"
            showCursorInInput={false}
          />
        </div>

        {/* Replay */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "18px" }}>
          <button className="replay-btn" onClick={handleReplay}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Replay
          </button>
        </div>
      </div>
    </div>
  );
}
