import { useState, useEffect, useRef, useCallback } from "react";

const PAUSE = "⏸";

const TYPING_SCRIPT = [
  ..."hey team can we move sprint plann".split(""),
  PAUSE,
  "⌫",
  ..."ing to 3 pm ".split(""),
  ..."tommorr".split(""),
  PAUSE,
  "⌫","⌫","⌫","⌫",
  ..."orow".split(""),
  PAUSE,
  "⌫","⌫",
  ..."row ".split(""),
  ..."becuase".split(""),
  PAUSE,
  "⌫","⌫","⌫","⌫","⌫",
  ..."causedesign needs more time on the handoff.".split(""),
];

const PASTED_TEXT =
  "Hey team, can we move sprint planning to 3 PM tomorrow? Design needs more time on the handoff.";

/* ─── Theme tokens (CursorTalk light) ─── */
const T = {
  bg: "#f7f6f3",
  card: "#ffffff",
  border: "rgba(0,0,0,0.08)",
  borderLight: "rgba(0,0,0,0.05)",
  shadow: "0 2px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)",
  textStrong: "#1a1a1a",
  textBody: "#374151",
  textMuted: "#6b7280",
  textPlaceholder: "#9ca3af",
  teal: "#0d9488",
  tealDark: "#0f766e",
  tealBg: "rgba(13,148,136,0.08)",
  tealBorder: "rgba(13,148,136,0.2)",
  amber: "#d97706",
  amberBg: "rgba(217,119,6,0.08)",
  red: "#ef4444",
  inputBg: "#f3f4f6",
  inputBorder: "rgba(0,0,0,0.06)",
  waveInactive: "#d1d5db",
};

// Waveform bar
const WaveBar = ({ active, index }) => {
  const h = active ? 6 + Math.sin(Date.now() / 90 + index * 0.8) * 14 : 3;
  return (
    <div
      style={{
        width: "2.5px",
        height: `${Math.max(3, h)}px`,
        backgroundColor: active ? T.teal : T.waveInactive,
        borderRadius: "2px",
        transition: active ? "height 0.07s ease" : "height 0.4s ease",
      }}
    />
  );
};

const Waveform = ({ active }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 70);
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
      backgroundColor: T.teal,
      marginLeft: "1px",
      verticalAlign: "text-bottom",
      animation: visible ? "blink 1s step-end infinite" : "none",
      opacity: visible ? 1 : 0,
    }}
  />
);

/* ─── Panel ─── */
const SlackPanel = ({ label, wpm, inputContent, messageContent, showWave, waveActive, accentColor, badgeBg, showCursorInInput }) => {
  const msgRef = useRef(null);
  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight;
  }, [messageContent]);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: T.card,
        borderRadius: "14px",
        border: `1px solid ${T.border}`,
        boxShadow: T.shadow,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "13px 18px",
          borderBottom: `1px solid ${T.borderLight}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: T.textStrong }}>{label}</span>
        <span
          style={{
            fontSize: "11.5px",
            color: accentColor,
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            background: badgeBg,
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
          borderBottom: `1px solid ${T.borderLight}`,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span style={{ fontSize: "14px", color: T.textPlaceholder }}>#</span>
        <span style={{ fontSize: "13px", color: T.textMuted }}>Slack — #product</span>
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
                background: badgeBg,
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
                <span style={{ fontSize: "13px", fontWeight: 700, color: T.textStrong }}>You</span>
                <span style={{ fontSize: "11px", color: T.textPlaceholder }}>just now</span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "13.5px",
                  lineHeight: 1.55,
                  color: T.textBody,
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
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.borderLight}` }}>
        {showWave ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              height: "38px",
              background: T.tealBg,
              borderRadius: "10px",
              padding: "0 14px",
              border: `1px solid ${T.tealBorder}`,
            }}
          >
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: T.red,
                animation: "pulse-dot 1.4s ease infinite",
                flexShrink: 0,
              }}
            />
            <Waveform active={waveActive} />
            <span
              style={{
                fontSize: "11.5px",
                color: T.teal,
                marginLeft: "auto",
                whiteSpace: "nowrap",
                flexShrink: 0,
                fontWeight: 500,
              }}
            >
              Recording...
            </span>
          </div>
        ) : (
          <div
            style={{
              minHeight: "38px",
              background: T.inputBg,
              borderRadius: "10px",
              padding: "8px 14px",
              display: "flex",
              alignItems: "flex-start",
              border: `1px solid ${T.inputBorder}`,
              transition: "min-height 0.15s ease",
            }}
          >
            {inputContent ? (
              <span style={{ fontSize: "13.5px", color: T.textBody, lineHeight: 1.5, wordBreak: "break-word" }}>
                {inputContent}
                <Cursor visible={showCursorInInput} />
              </span>
            ) : (
              <span style={{ fontSize: "13px", color: T.textPlaceholder, lineHeight: 1.5 }}>Type a message…</span>
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

  const [rightPhase, setRightPhase] = useState("idle");
  const [rightMessage, setRightMessage] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const containerRef = useRef(null);
  const timeoutsRef = useRef([]);
  const leftInputRef = useRef("");

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  const addTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  };

  useEffect(() => { leftInputRef.current = leftInput; }, [leftInput]);

  const startAnimation = useCallback(() => {
    if (isPlaying) return;
    clearAllTimeouts();
    setIsPlaying(true);
    setLeftInput("");
    setLeftMessage(null);
    setLeftDone(false);
    setRightPhase("idle");
    setRightMessage(null);
    leftInputRef.current = "";

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
          setTimeout(() => startAnimation(), 500);
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasPlayed, startAnimation]);

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
    setTimeout(() => startAnimation(), 150);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');

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
          background: ${T.tealBg};
          color: ${T.tealDark};
          cursor: default;
          border-radius: 10px;
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
          border: 1px solid ${T.tealBorder};
        }

        .replay-btn {
          padding: 9px 22px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid ${T.tealBorder};
          background: ${T.tealBg};
          color: ${T.teal};
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s ease;
          font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .replay-btn:hover {
          background: rgba(13,148,136,0.14);
          border-color: rgba(13,148,136,0.35);
          color: ${T.tealDark};
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
            label="Without CursorTalk"
            wpm={40}
            inputContent={leftDone ? "" : leftInput}
            messageContent={leftMessage}
            showWave={false}
            waveActive={false}
            accentColor={T.amber}
            badgeBg={T.amberBg}
            showCursorInInput={isPlaying && !leftDone}
          />

          <SlackPanel
            label="With CursorTalk"
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
            accentColor={T.teal}
            badgeBg={T.tealBg}
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
