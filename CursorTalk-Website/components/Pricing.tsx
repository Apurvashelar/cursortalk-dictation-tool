'use client'

import { motion } from 'framer-motion'

function reveal(delay = 0) {
  return {
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 } as const,
    viewport: { once: true, margin: '-30px' } as const,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const, delay },
  }
}

const individualFeatures = [
  'Unlimited local transcription',
  '500 cleanups / month',
  'All apps · all languages',
  'Personal dictionary',
]

const teamFeatures = [
  'Everything in Individual',
  'Unlimited cleanups',
  'Shared team glossary',
  'Admin console & SSO',
  'Priority support',
]

const enterpriseFeatures = [
  'Everything in Team',
  'Self-hosted on your VPC',
  'CloudFormation template',
  'SOC 2 / HIPAA / FedRAMP',
  'Custom fine-tuning',
]

export function Pricing() {
  return (
    <section id="pricing" className="py-[140px] bg-surface border-t border-border">
      <div className="max-w-[1120px] mx-auto px-7">
        <motion.div
          {...reveal()}
          className="text-center mb-[60px] max-w-[520px] mx-auto"
        >
          <p className="font-mono text-[11px] text-teal tracking-[0.12em] font-medium mb-3.5">
            PRICING
          </p>
          <h2 className="font-display font-bold text-[clamp(32px,5vw,48px)] leading-[1.08] tracking-[-0.03em] mb-3.5">
            Free to start. Sensible at scale.
          </h2>
          <p className="text-[16px] text-muted leading-[1.7]">
            No per-word billing. No API pass-through. You pay AWS; we hand you the rest.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-[880px] mx-auto">
          {/* Individual */}
          <motion.div
            {...reveal(0)}
            className="bg-surface border border-border rounded-md p-9 hover:-translate-y-[3px] hover:shadow-md transition-all duration-300"
          >
            <div className="font-display font-bold text-[18px] tracking-[-0.03em] mb-0.5">
              Individual
            </div>
            <p className="font-mono text-[10px] text-dim tracking-[0.08em] mb-6">FOREVER FREE</p>
            <div className="mb-6">
              <span className="font-display font-extrabold text-[48px] leading-none tracking-[-0.04em]">$0</span>
              <span className="text-muted text-[13px] ml-1">/mo</span>
            </div>
            <a
              href="#download"
              className="flex items-center justify-center w-full bg-surface border-[1.5px] border-border-hover text-ink px-[22px] py-[10px] rounded-sm font-semibold text-sm hover:border-ink transition-all mb-6"
            >
              Download free
            </a>
            <div className="flex flex-col gap-2.5 text-[13.5px] text-muted">
              {individualFeatures.map((f) => (
                <span key={f} className="flex items-center gap-2">
                  <span className="text-teal font-bold flex-shrink-0">✓</span> {f}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Team — featured */}
          <motion.div
            {...reveal(0.08)}
            className="relative bg-gradient-to-b from-teal-tint to-surface border border-teal rounded-md p-9 shadow-glow hover:-translate-y-[3px] transition-all duration-300"
          >
            <div
              className="absolute -top-[11px] left-1/2 -translate-x-1/2 bg-ink text-bg font-mono text-[10px] font-semibold px-3.5 py-1 rounded-full tracking-[0.06em] whitespace-nowrap"
            >
              MOST POPULAR
            </div>
            <div className="font-display font-bold text-[18px] tracking-[-0.03em] mb-0.5">
              Team
            </div>
            <p className="font-mono text-[10px] text-dim tracking-[0.08em] mb-6">UP TO 50 SEATS</p>
            <div className="mb-6">
              <span className="font-display font-extrabold text-[48px] leading-none tracking-[-0.04em]">$8</span>
              <span className="text-muted text-[13px] ml-1">/user/mo</span>
            </div>
            <a
              href="#"
              className="flex items-center justify-center w-full bg-teal text-white px-7 py-3 rounded-sm font-semibold text-[15px] hover:bg-teal-dark hover:shadow-glow hover:-translate-y-0.5 transition-all mb-6"
            >
              Start free trial
            </a>
            <div className="flex flex-col gap-2.5 text-[13.5px] text-muted">
              {teamFeatures.map((f) => (
                <span key={f} className="flex items-center gap-2">
                  <span className="text-teal font-bold flex-shrink-0">✓</span> {f}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Enterprise */}
          <motion.div
            {...reveal(0.16)}
            className="bg-dark text-[#E4E3DF] rounded-md p-9 hover:-translate-y-[3px] transition-all duration-300"
          >
            <div className="font-display font-bold text-[18px] tracking-[-0.03em] text-white mb-0.5">
              Enterprise
            </div>
            <p className="font-mono text-[10px] text-[#34D399] tracking-[0.08em] mb-6">
              SELF-HOSTED · UNLIMITED
            </p>
            <div className="mb-6">
              <span className="font-display font-extrabold text-[48px] leading-none tracking-[-0.04em] text-white">
                Custom
              </span>
            </div>
            <a
              href="#"
              className="flex items-center justify-center w-full bg-white text-ink px-7 py-3 rounded-sm font-semibold text-sm hover:opacity-90 transition-all mb-6"
            >
              Talk to sales
            </a>
            <div className="flex flex-col gap-2.5 text-[13.5px] text-[#888]">
              {enterpriseFeatures.map((f) => (
                <span key={f} className="flex items-center gap-2">
                  <span className="text-[#34D399] font-bold flex-shrink-0">✓</span> {f}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
