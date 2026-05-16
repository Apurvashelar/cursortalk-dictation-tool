'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const PAUSE = '⏸'

const TYPING_SCRIPT = [
  ...'hey team can we move sprint plann'.split(''),
  PAUSE,
  '⌫',
  ...'ing to 3 pm '.split(''),
  ...'tommorr'.split(''),
  PAUSE,
  '⌫', '⌫', '⌫', '⌫',
  ...'orow'.split(''),
  PAUSE,
  '⌫', '⌫',
  ...'row '.split(''),
  ...'becuase'.split(''),
  PAUSE,
  '⌫', '⌫', '⌫', '⌫', '⌫',
  ...'causedesign needs more time on the handoff.'.split(''),
]

const PASTED_TEXT =
  'Hey team, can we move sprint planning to 3 PM tomorrow? Design needs more time on the handoff.'

/* ─── Theme tokens (CursorTalk site) ─── */
const T = {
  card: '#FFFFFF',
  surfaceWarm: '#F5F4F0',
  tealTint: '#EFFCF8',
  border: 'rgba(0,0,0,0.07)',
  borderLight: 'rgba(0,0,0,0.05)',
  textStrong: '#111111',
  textBody: '#333333',
  textMuted: '#777777',
  textPlaceholder: '#AAAAAA',
  teal: '#0D9373',
  tealDark: '#0A7A60',
  tealBg: 'rgba(13,147,115,0.10)',
  tealBorder: 'rgba(13,147,115,0.22)',
  amber: '#EA580C',
  amberBg: 'rgba(234,88,12,0.10)',
  red: '#E14B4B',
  inputBg: '#F5F4F0',
  inputBorder: 'rgba(0,0,0,0.06)',
  waveInactive: '#D1D5DB',
}

const FONT_SANS = "var(--font-dm-sans), system-ui, -apple-system, 'Segoe UI', sans-serif"
const FONT_MONO = "var(--font-jetbrains), 'JetBrains Mono', monospace"

const TOP_WAVE_BARS = [
  { height: 8, delay: '0s' },
  { height: 14, delay: '0.08s' },
  { height: 18, delay: '0.16s' },
  { height: 10, delay: '0.24s' },
  { height: 16, delay: '0.32s' },
]

// Waveform bar (input recording)
const WaveBar = ({ active, index }) => {
  const h = active ? 6 + Math.sin(Date.now() / 90 + index * 0.8) * 14 : 3
  return (
    <div
      style={{
        width: '2.5px',
        height: `${Math.max(3, h)}px`,
        backgroundColor: active ? T.teal : T.waveInactive,
        borderRadius: '2px',
        transition: active ? 'height 0.07s ease' : 'height 0.4s ease',
      }}
    />
  )
}

const Waveform = ({ active }) => {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setTick((t) => t + 1), 70)
    return () => clearInterval(id)
  }, [active])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '22px' }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <WaveBar key={i} active={active} index={i} />
      ))}
    </div>
  )
}

const Cursor = ({ visible }) => (
  <span
    style={{
      display: 'inline-block',
      width: '2px',
      height: '1.1em',
      backgroundColor: T.teal,
      marginLeft: '1px',
      verticalAlign: 'text-bottom',
      animation: visible ? 'sttBlink 1s step-end infinite' : 'none',
      opacity: visible ? 1 : 0,
    }}
  />
)

/* ─── Half-panel (lives inside the outer window chrome) ─── */
const SlackPanel = ({
  label,
  wpm,
  inputContent,
  messageContent,
  showWave,
  waveActive,
  accentColor,
  badgeBg,
  showCursorInInput,
  background,
  className = '',
}) => {
  const msgRef = useRef(null)
  useEffect(() => {
    if (msgRef.current) msgRef.current.scrollTop = msgRef.current.scrollHeight
  }, [messageContent])

  return (
    <div
      className={className}
      style={{
        minWidth: 0,
        background: background || 'transparent',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '13px 18px',
          borderBottom: `1px solid ${T.borderLight}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: T.textStrong, fontFamily: FONT_SANS }}>
          {label}
        </span>
        <span
          style={{
            fontSize: '11.5px',
            color: accentColor,
            fontWeight: 600,
            fontFamily: FONT_MONO,
            background: badgeBg,
            padding: '3px 10px',
            borderRadius: '20px',
            letterSpacing: '0.02em',
          }}
        >
          ~{wpm} WPM
        </span>
      </div>

      {/* Messages area */}
      <div
        ref={msgRef}
        className="stt-no-scrollbar"
        style={{
          flex: 1,
          padding: '16px 18px',
          minHeight: '140px',
          maxHeight: '180px',
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {messageContent && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: badgeBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '12px',
                fontWeight: 700,
                color: accentColor,
                fontFamily: FONT_SANS,
              }}
            >
              Y
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '8px',
                  marginBottom: '3px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: T.textStrong,
                    fontFamily: FONT_SANS,
                  }}
                >
                  You
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: T.textPlaceholder,
                    fontFamily: FONT_SANS,
                  }}
                >
                  just now
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: '13.5px',
                  lineHeight: 1.55,
                  color: T.textBody,
                  wordBreak: 'break-word',
                  fontFamily: FONT_SANS,
                }}
              >
                {messageContent}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${T.borderLight}` }}>
        {showWave ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              height: '38px',
              background: T.tealBg,
              borderRadius: '10px',
              padding: '0 14px',
              border: `1px solid ${T.tealBorder}`,
            }}
          >
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: T.red,
                animation: 'sttPulseDot 1.4s ease infinite',
                flexShrink: 0,
              }}
            />
            <Waveform active={waveActive} />
            <span
              style={{
                fontSize: '11.5px',
                color: T.teal,
                marginLeft: 'auto',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                fontWeight: 500,
                fontFamily: FONT_SANS,
              }}
            >
              Recording...
            </span>
          </div>
        ) : (
          <div
            style={{
              minHeight: '38px',
              background: T.inputBg,
              borderRadius: '10px',
              padding: '5px 5px 5px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: `1px solid ${T.inputBorder}`,
              transition: 'min-height 0.15s ease',
            }}
          >
            <div style={{ flex: 1, minWidth: 0, paddingTop: '3px', paddingBottom: '3px' }}>
              {inputContent ? (
                <span
                  style={{
                    fontSize: '13.5px',
                    color: T.textBody,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    fontFamily: FONT_SANS,
                  }}
                >
                  {inputContent}
                  <Cursor visible={showCursorInInput} />
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '13px',
                    color: T.textPlaceholder,
                    lineHeight: 1.5,
                    fontFamily: FONT_SANS,
                  }}
                >
                  Type a message…
                </span>
              )}
            </div>
            <button
              type="button"
              aria-label="Send"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: T.teal,
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 2L11 13" />
                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main ─── */
export default function SpeechToTextDemo() {
  const [leftInput, setLeftInput] = useState('')
  const [leftMessage, setLeftMessage] = useState(null)
  const [leftDone, setLeftDone] = useState(false)

  const [rightPhase, setRightPhase] = useState('idle')
  const [rightMessage, setRightMessage] = useState(null)

  const [hasStarted, setHasStarted] = useState(false)

  const containerRef = useRef(null)
  const timeoutsRef = useRef([])
  const leftInputRef = useRef('')
  const isPlayingRef = useRef(false)
  const mountedRef = useRef(true)

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach(clearTimeout)
    timeoutsRef.current = []
  }

  const addTimeout = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timeoutsRef.current.push(id)
    return id
  }

  useEffect(() => {
    leftInputRef.current = leftInput
  }, [leftInput])

  const runCycle = useCallback(() => {
    if (!mountedRef.current || isPlayingRef.current) return
    isPlayingRef.current = true
    clearAllTimeouts()
    setLeftInput('')
    setLeftMessage(null)
    setLeftDone(false)
    setRightPhase('idle')
    setRightMessage(null)
    leftInputRef.current = ''

    let delay = 500

    TYPING_SCRIPT.forEach((action) => {
      if (action === PAUSE) {
        delay += 350 + Math.random() * 200
        return
      }

      const isBackspace = action === '⌫'
      const charDelay = isBackspace ? 50 : 60 + Math.random() * 55
      delay += charDelay

      addTimeout(() => {
        setLeftInput((prev) => {
          const next = isBackspace ? prev.slice(0, -1) : prev + action
          leftInputRef.current = next
          return next
        })
      }, delay)

      if (!isBackspace && action === ' ') {
        delay += 60 + Math.random() * 100
      }
    })

    const totalLeftTime = delay + 300

    addTimeout(() => {
      const finalText = leftInputRef.current
      setLeftMessage(finalText)
      setLeftInput('')
      setLeftDone(true)
    }, totalLeftTime)

    addTimeout(() => setRightPhase('recording'), 600)
    addTimeout(() => {
      setRightPhase('pasted')
      setRightMessage(PASTED_TEXT)
    }, 3400)

    // End of cycle — pause, then loop again
    addTimeout(() => {
      isPlayingRef.current = false
      addTimeout(() => runCycle(), 2600)
    }, totalLeftTime + 600)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true)
          setTimeout(() => runCycle(), 500)
        }
      },
      { threshold: 0.35 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasStarted, runCycle])

  useEffect(() => {
    return () => {
      mountedRef.current = false
      clearAllTimeouts()
    }
  }, [])

  return (
    <div
      className="stt-demo-scope"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: FONT_SANS,
        textAlign: 'left',
      }}
    >
      <style>{`
        @keyframes sttBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes sttPulseDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes sttFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sttPasteIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sttTopWave {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1); }
        }

        .stt-no-scrollbar::-webkit-scrollbar { display: none; }

        .stt-demo-scope .stt-left-panel {
          border-right: 1px solid ${T.border};
        }
        @media (max-width: 700px) {
          .stt-demo-scope .stt-panels-row {
            grid-template-columns: 1fr !important;
          }
          .stt-demo-scope .stt-left-panel {
            border-right: none;
            border-bottom: 1px solid ${T.border};
          }
        }
      `}</style>

      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: '920px',
          animation: 'sttFadeUp 0.7s ease forwards',
        }}
      >
        {/* Outer window card (matches Gmail — Compose pattern) */}
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: '16px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Top bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: `1px solid ${T.border}`,
              background: T.surfaceWarm,
            }}
          >
            {/* Traffic lights */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840', display: 'inline-block' }} />
            </div>

            {/* Title */}
            <span style={{ fontFamily: FONT_MONO, fontSize: '11px', color: T.textPlaceholder }}>
              Slack — #product
            </span>

            {/* REC indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2.5px', height: '18px' }}>
                {TOP_WAVE_BARS.map((bar, i) => (
                  <span
                    key={i}
                    style={{
                      width: '2.5px',
                      height: `${bar.height}px`,
                      background: T.teal,
                      borderRadius: '2px',
                      transformOrigin: 'bottom',
                      animation: 'sttTopWave 1.3s ease-in-out infinite',
                      animationDelay: bar.delay,
                      display: 'inline-block',
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: '9px',
                  color: T.teal,
                  fontWeight: 500,
                  letterSpacing: '0.05em',
                }}
              >
                REC
              </span>
            </div>
          </div>

          {/* Two halves */}
          <div
            className="stt-panels-row"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}
          >
            <SlackPanel
              className="stt-left-panel"
              label="Without CursorTalk"
              wpm={40}
              inputContent={leftDone ? '' : leftInput}
              messageContent={leftMessage}
              showWave={false}
              waveActive={false}
              accentColor={T.amber}
              badgeBg={T.amberBg}
              showCursorInInput={hasStarted && !leftDone}
            />

            <SlackPanel
              label="With CursorTalk"
              wpm={150}
              inputContent=""
              messageContent={
                rightMessage ? (
                  <span style={{ animation: 'sttPasteIn 0.25s ease forwards' }}>{rightMessage}</span>
                ) : null
              }
              showWave={rightPhase === 'recording'}
              waveActive={rightPhase === 'recording'}
              accentColor={T.teal}
              badgeBg={T.tealBg}
              showCursorInInput={false}
              background={T.tealTint}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
