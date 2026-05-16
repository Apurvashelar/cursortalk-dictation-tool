'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'Does my audio ever leave my machine?',
    a: 'No. Whisper runs locally via whisper.cpp. Only the plain-text transcript (~500 bytes) is sent over HTTPS and in the Enterprise plan, that server lives in your own AWS VPC.',
  },
  {
    q: 'How is this different from Wispr Flow?',
    a: 'Wispr sends raw audio to OpenAI, Anthropic, Cerebras, and Baseten. We send zero audio to zero third parties. Whisper runs on-device; the cleanup LLM runs on infrastructure you own.',
  },
  {
    q: 'What hardware do I need?',
    a: 'Mac with Apple Silicon (M1+) or Intel with 8GB+ RAM. macOS 12 (Monterey) or later.',
  },
  {
    q: "What's the latency?",
    a: '~1.3-2.0s end-to-end after you stop speaking. Cloud tools are faster (~0.7s) because they skip on-device ASR - but they send your audio to 4+ third parties.',
  },
  {
    q: 'Can my IT team deploy this to our AWS?',
    a: 'Yes - the Enterprise plan includes a CloudFormation template, model weights, Docker image, and IaC. Deploy in ~10 minutes. You own it with zero vendor dependency.',
  },
  {
    q: 'Do you train on my data?',
    a: 'Never. Transcripts are processed in RAM and discarded. Nothing logged, stored, or used for training under any plan.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<string>(faqs[0].q)

  return (
    <section id="faq" className="py-[140px]">
      <div className="max-w-[720px] mx-auto px-7">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center mb-14"
        >
          <h2 className="font-display font-bold text-[clamp(28px,4vw,40px)] leading-[1.08] tracking-[-0.03em]">
            Frequently asked questions
          </h2>
        </motion.div>

        <div className="flex flex-col gap-2">
          {faqs.map((item, i) => {
            const isOpen = open === item.q
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: i * 0.04 }}
                className={cn(
                  'border rounded-[14px] overflow-hidden bg-surface transition-colors duration-300',
                  isOpen ? 'border-border-hover' : 'border-border hover:border-border-hover'
                )}
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? '' : item.q)}
                  className="w-full flex justify-between items-center px-7 py-[22px] text-left font-semibold text-[15px] transition-colors duration-200"
                >
                  <span>{item.q}</span>
                  <span
                    className={cn(
                      'text-[20px] text-dim transition-all duration-300 flex-shrink-0 ml-4',
                      isOpen && 'rotate-45 text-teal'
                    )}
                  >
                    +
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{ maxHeight: isOpen ? 500 : 0 }}
                >
                  <p className="px-7 pb-[22px] text-muted text-[14.5px] leading-[1.75]">
                    {item.a}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
