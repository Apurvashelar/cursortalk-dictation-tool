'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

const steps = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="9" y="2" width="6" height="12" rx="3" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
      </svg>
    ),
    title: 'Press hotkey & speak',
    tag: 'LOCAL',
    body: 'Hit ⌘⇧Space anywhere. Mic captures audio entirely on your machine.',
    tagColor: 'teal',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Whisper transcribes locally',
    tag: '~0.9s · LOCAL',
    body: 'distil-whisper-large-v3 runs via whisper.cpp. Audio stays in RAM - never written to disk, never uploaded.',
    tagColor: 'teal',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: '~500 bytes sent to your VPC',
    tag: 'TLS 1.3',
    body: 'Only plain text. No audio, no voice biometrics. Sent over HTTPS to your org\'s own AWS endpoint.',
    tagColor: 'amber',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    title: 'Cleaned text pasted at cursor',
    tag: '~285ms · YOUR AWS',
    body: 'Fine-tuned Qwen 2.5 14B removes filler, fixes grammar, adds punctuation. Inserted directly where your cursor is.',
    tagColor: 'teal',
  },
]

function TimelineStep({
  step,
  index,
  onActivate,
}: {
  step: typeof steps[0]
  index: number
  onActivate: (i: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-10% 0px -10% 0px' })

  useEffect(() => {
    if (isInView) onActivate(index)
  }, [isInView, index, onActivate])

  const isAmber = step.tagColor === 'amber'

  return (
    <div
      ref={ref}
      className={cn(
        'flex gap-7 mb-8 relative z-[2] transition-all duration-500',
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0 bg-surface border-2 transition-all duration-500',
          isInView ? 'border-teal' : 'border-border'
        )}
        style={{ color: isAmber ? '#D97706' : isInView ? '#0D9373' : '#AAA' }}
      >
        {step.icon}
      </div>
      <div
        className={cn(
          'flex-1 bg-surface border rounded-[14px] p-6 transition-all duration-500',
          isInView ? 'border-border-hover shadow-md' : 'border-border'
        )}
      >
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
          <h3 className="font-display font-bold text-[18px] tracking-[-0.03em]">
            {step.title}
          </h3>
          <span
            className={cn(
              'font-mono text-[10px] font-medium px-2.5 py-[3px] rounded-[6px] tracking-[0.05em]',
              isAmber
                ? 'bg-[#FFFBEB] text-[#D97706]'
                : 'bg-teal-tint text-teal-dark'
            )}
          >
            {step.tag}
          </span>
        </div>
        <p className="text-[13.5px] text-muted leading-[1.7]">{step.body}</p>
      </div>
    </div>
  )
}

export function HowItWorks() {
  const [activeCount, setActiveCount] = useState(0)
  const activated = useRef<Set<number>>(new Set())

  const onActivate = useCallback((i: number) => {
    if (!activated.current.has(i)) {
      activated.current.add(i)
      setActiveCount(activated.current.size)
    }
  }, [])

  const fillPct = Math.min((activeCount / steps.length) * 100, 100)

  return (
    <section
      id="how-it-works"
      className="py-[140px] bg-surface border-t border-border"
    >
      <div className="max-w-[1120px] mx-auto px-7">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-[72px] max-w-[520px] mx-auto"
        >
          <p className="font-mono text-[11px] text-teal tracking-[0.12em] font-medium mb-3.5">
            HOW IT WORKS
          </p>
          <h2 className="font-display font-bold text-[clamp(32px,5vw,48px)] leading-[1.08] tracking-[-0.03em] mb-3.5">
            Hotkey to polished text in{' '}
            <span className="text-teal">under 2s.</span>
          </h2>
        </motion.div>

        <div className="relative max-w-[700px] mx-auto">
          {/* Static line */}
          <div className="absolute left-6 top-0 w-0.5 h-full bg-border" />
          {/* Animated fill */}
          <motion.div
            className="absolute left-6 top-0 w-0.5 bg-gradient-to-b from-teal to-teal-dark"
            animate={{ height: `${fillPct}%` }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
          {steps.map((step, i) => (
            <TimelineStep key={i} step={step} index={i} onActivate={onActivate} />
          ))}
        </div>
      </div>
    </section>
  )
}
