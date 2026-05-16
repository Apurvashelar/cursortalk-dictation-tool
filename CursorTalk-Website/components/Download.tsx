'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const platforms = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 384 512" fill="currentColor">
        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM256.6 81c31.1-36.9 28.2-70.5 27.3-82.5-24.8 1.4-53.5 16.9-69.9 35.9-18.1 20.4-28.7 45.6-26.4 72.5 26.7 2.1 51.1-11.6 69-25.9z" />
      </svg>
    ),
    name: 'macOS',
    sub: 'Universal · Apple Silicon + Intel',
    version: '1.0.0',
    size: '21 MB',
    requires: 'macOS 12+',
    href: '/downloads/CursorTalk.dmg',
  },
]

const badges = [
  '30-second install',
  'Works offline',
  'Code-signed',
  'Auto-updates',
]

function reveal(delay = 0) {
  return {
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 } as const,
    viewport: { once: true, margin: '-30px' } as const,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const, delay },
  }
}

export function Download() {
  return (
    <section id="download" className="py-[140px] relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 40% 40% at 50% 30%, rgba(13,147,115,.1), transparent)',
        }}
      />
      <div className="max-w-[1120px] mx-auto px-7 relative z-[2] text-center">
        <motion.div {...reveal()}>
          <p className="font-mono text-[11px] text-teal tracking-[0.12em] font-medium mb-3.5">
            DOWNLOAD
          </p>
          <h2 className="font-display font-bold text-[clamp(36px,6vw,56px)] leading-[1.08] tracking-[-0.03em] mb-3.5">
            Stop typing. <span className="text-teal">Start talking.</span>
          </h2>
          <p className="text-[17px] text-muted max-w-[460px] mx-auto mb-12 leading-[1.7]">
            Free for individuals. No account required. Works offline after first launch.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 max-w-[340px] mx-auto mb-9">
          {platforms.map((p, i) => (
            <motion.a
              key={p.name}
              {...reveal(0.08 * (i + 1))}
              href={p.href}
              download
              className="bg-surface border border-border rounded-md p-9 text-left block cursor-pointer hover:border-teal hover:shadow-glow hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                {p.icon}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-dim">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div className="font-display font-bold text-[20px] tracking-[-0.03em] mb-0.5">
                {p.name}
              </div>
              <div className="text-[13px] text-muted mb-5">{p.sub}</div>
              <div className="flex flex-col gap-1.5 pt-4 border-t border-border">
                {[['Version', p.version], ['Size', p.size], ['Requires', p.requires]].map(
                  ([label, val]) => (
                    <div
                      key={label}
                      className="flex justify-between font-mono text-[11px]"
                    >
                      <span className="text-dim">{label}</span>
                      <span className="text-ink">{val}</span>
                    </div>
                  )
                )}
              </div>
            </motion.a>
          ))}
        </div>

        <motion.div
          {...reveal(0.24)}
          className="flex flex-wrap gap-5 justify-center text-[13px] text-muted mb-3"
        >
          {badges.map((b) => (
            <span key={b} className="flex items-center gap-1.5">
              <Check size={13} strokeWidth={2.5} className="text-teal" />
              {b}
            </span>
          ))}
        </motion.div>

        <motion.p
          {...reveal(0.32)}
          className="text-[12px] text-dim"
        >
        </motion.p>
      </div>
    </section>
  )
}
