'use client'

import { motion } from 'framer-motion'
import { Download } from 'lucide-react'

function reveal(delay = 0) {
  return {
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 } as const,
    viewport: { once: true, margin: '-30px' } as const,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const, delay },
  }
}

export function FinalCta() {
  return (
    <section className="py-[140px] text-center relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(13,147,115,.1), transparent)',
        }}
      />
      <div className="max-w-[1120px] mx-auto px-7 relative z-[2]">
        <motion.h2
          {...reveal()}
          className="font-display font-bold text-[clamp(36px,6vw,64px)] leading-[1.08] tracking-[-0.03em] mb-[18px]"
        >
          Stop typing.{' '}
          <span className="text-teal">Start talking.</span>
        </motion.h2>

        <motion.p
          {...reveal(0.08)}
          className="text-[17px] text-muted max-w-[440px] mx-auto mb-9 leading-[1.7]"
        >
          Download the desktop app and dictate your first sentence in under a minute.
        </motion.p>

        <motion.div
          {...reveal(0.16)}
          className="flex flex-wrap gap-2.5 justify-center mb-3.5"
        >
          <a
            href="#download"
            className="inline-flex items-center gap-2 bg-ink text-bg px-8 py-4 rounded-[14px] font-semibold text-[16px] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <Download size={16} />
            Download Free
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-surface border-[1.5px] border-border-hover text-ink px-8 py-4 rounded-[14px] font-semibold text-[16px] hover:border-ink hover:-translate-y-0.5 transition-all duration-300"
          >
            Talk to sales →
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.24 }}
          className="font-mono text-[11px] text-dim tracking-[0.06em]"
        >
          FREE · ONLY macOS · 50 MB
        </motion.p>
      </div>
    </section>
  )
}
