'use client'

import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import SpeechToTextDemo from './speech-to-text-video-code'

function reveal(delay = 0) {
  return {
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 } as const,
    viewport: { once: true, margin: '-30px' } as const,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const, delay },
  }
}

export function Hero() {
  return (
    <section className="relative pt-[160px] pb-[100px] overflow-hidden">
      {/* Glow blobs */}
      <div
        aria-hidden="true"
        className="absolute w-[700px] h-[700px] rounded-full pointer-events-none top-[-20%] right-[-10%] animate-float"
        style={{
          background: 'radial-gradient(circle, rgba(13,147,115,.25), transparent 70%)',
          filter: 'blur(120px)',
          opacity: 0.35,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute w-[700px] h-[700px] rounded-full pointer-events-none bottom-[-10%] left-[-15%] animate-float-slow"
        style={{
          background: 'radial-gradient(circle, rgba(13,147,115,.12), transparent 70%)',
          filter: 'blur(120px)',
          opacity: 0.35,
        }}
      />
      {/* Background grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.07) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse 55% 45% at 50% 30%, black 20%, transparent 80%)',
        }}
      />

      <div className="max-w-[1120px] mx-auto px-7 relative z-[2] text-center">
        {/* Badge */}
        <motion.div {...reveal()} className="mb-7">
          <span className="inline-flex items-center gap-[7px] px-4 py-[7px] rounded-full bg-surface border border-border text-[12px] font-semibold text-muted shadow-sm font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse-soft" />
            Self-hosted · Private · Enterprise-grade
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...reveal(0.08)}
          className="font-display font-bold text-[clamp(44px,7.5vw,84px)] leading-[1.08] tracking-[-0.03em] max-w-[860px] mx-auto mb-6 text-ink"
        >
          Dictate anywhere.
          <br />
          <span className="text-teal">Never leave your perimeter.</span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          {...reveal(0.16)}
          className="text-[18px] text-muted max-w-[560px] mx-auto mb-10 leading-[1.75]"
        >
          Turn speech into polished writing in every app. Local Mode for individual.
          Self-hosted cleanup LLM for Enterprises.
          <br />
          Zero third-party APIs. Ever.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...reveal(0.24)}
          className="flex flex-wrap gap-2.5 justify-center mb-3.5"
        >
          <a
            href="/downloads/CursorTalk-macOS.zip"
            download
            className="inline-flex items-center gap-2 bg-ink text-bg px-8 py-4 rounded-[14px] font-semibold text-[16px] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <svg width="18" height="18" viewBox="0 0 384 512" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM256.6 81c31.1-36.9 28.2-70.5 27.3-82.5-24.8 1.4-53.5 16.9-69.9 35.9-18.1 20.4-28.7 45.6-26.4 72.5 26.7 2.1 51.1-11.6 69-25.9z" />
            </svg>
            Download for Mac
          </a>
        </motion.div>

        <motion.p
          {...reveal(0.32)}
          className="font-mono text-[11px] text-dim tracking-[0.07em]"
        >
          FREE · NO ACCOUNT · UNIVERSAL MAC ZIP · OFFLINE-READY
        </motion.p>

        {/* Speech-to-Text demo */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.4 }}
          className="mt-14"
        >
          <SpeechToTextDemo />
        </motion.div>
      </div>
    </section>
  )
}
