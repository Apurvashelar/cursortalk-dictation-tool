'use client'

import { motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'

function reveal(delay = 0) {
  return {
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 } as const,
    viewport: { once: true, margin: '-30px' } as const,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const, delay },
  }
}

export function Features() {
  return (
    <section id="features" className="py-[140px] bg-bg">
      <div className="max-w-[1120px] mx-auto px-7">
        <motion.div {...reveal()} className="mb-14 max-w-[520px]">
          <p className="font-mono text-[11px] text-teal tracking-[0.12em] font-medium mb-3.5">
            FEATURES
          </p>
          <h2 className="font-display font-bold text-[clamp(32px,5vw,48px)] leading-[1.08] tracking-[-0.03em] mb-3.5">
            Everything you need. Nothing you shouldn't trust.
          </h2>
          <p className="text-[16px] text-muted leading-[1.7]">
            Enterprise-grade dictation that keeps privacy as an architecture decision - not a policy checkbox.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-12 gap-[14px]">

          {/* Speed — 6 cols */}
          <motion.div
            {...reveal(0)}
            className="col-span-12 md:col-span-6 bg-surface border border-border rounded-md p-9 flex gap-9 items-center flex-wrap hover:border-border-hover hover:shadow-md hover:-translate-y-[3px] transition-all duration-300"
          >
            <div className="flex-1 min-w-[200px]">
              <p className="font-mono text-[10px] text-teal tracking-[0.1em] font-medium mb-2.5">
                3× FASTER INPUT
              </p>
              <h3 className="font-display font-bold text-[24px] tracking-[-0.03em] mb-2.5">
                Speak at 150 WPM.
              </h3>
              <p className="text-[13.5px] text-muted leading-[1.7]">
                Your mouth is 3× faster than your fingers. CursorTalk bridges the gap with real-time ASR and LLM cleanup.
              </p>
            </div>
            <div className="flex gap-5 items-end flex-shrink-0">
              <div className="text-center">
                <div className="w-12 h-9 rounded-t-lg bg-surface-warm border border-border border-b-0 mb-1.5" />
                <span className="font-mono text-[10px] text-dim">40</span>
              </div>
              <div className="text-center">
                <div className="w-12 rounded-t-lg bg-teal mb-1.5" style={{ height: 130 }} />
                <span className="font-mono text-[10px] text-teal font-semibold">150</span>
              </div>
            </div>
          </motion.div>

          {/* Hotkey — 3 cols */}
          <motion.div
            {...reveal(0.08)}
            className="col-span-12 md:col-span-3 bg-surface border border-border rounded-md p-9 flex flex-col justify-between hover:border-border-hover hover:shadow-md hover:-translate-y-[3px] transition-all duration-300"
          >
            <div>
              <p className="font-mono text-[10px] text-teal tracking-[0.1em] font-medium mb-2.5">
                GLOBAL HOTKEY
              </p>
              <h3 className="font-display font-bold text-[24px] tracking-[-0.03em] mb-2.5">
                One shortcut. Every app.
              </h3>
              <p className="text-[13.5px] text-muted leading-[1.7]">
                Customizable. Works in native apps, browsers, terminals - anywhere text goes.
              </p>
            </div>
            <div className="flex gap-1.5 items-center justify-center mt-6">
              {['⌘', '⇧', 'Space'].map((key) => (
                <span
                  key={key}
                  className="font-mono text-[13px] bg-teal-tint border border-teal/20 text-teal-dark rounded-lg px-3 py-1.5"
                  style={{ borderBottomWidth: 3 }}
                >
                  {key}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Offline — 3 cols (plain card) */}
          <motion.div
            {...reveal(0.16)}
            className="col-span-12 md:col-span-3 bg-surface border border-border rounded-md p-9 flex flex-col justify-between hover:border-border-hover hover:shadow-md hover:-translate-y-[3px] transition-all duration-300"
          >
            <div>
              <p className="font-mono text-[10px] text-teal tracking-[0.1em] font-medium mb-2.5">
                OFFLINE
              </p>
              <h3 className="font-display font-bold text-[24px] tracking-[-0.03em] mb-2.5">
                Works on a plane.
              </h3>
              <p className="text-[13.5px] text-muted leading-[1.7]">
                Whisper runs locally. Cleanup syncs when back online.
              </p>
            </div>
            <div className="flex justify-center mt-6">
              <div
                className="w-12 h-12 rounded-full bg-teal-tint border border-teal/20 flex items-center justify-center"
                aria-hidden="true"
              >
                <WifiOff className="w-5 h-5 text-teal-dark" strokeWidth={2} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
