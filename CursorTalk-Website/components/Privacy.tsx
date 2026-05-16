'use client'

import { motion } from 'framer-motion'

const checks = [
  { title: 'Audio never uploaded', body: 'Whisper runs on-device. Raw waveform never touches a network socket.' },
  { title: 'Zero third-party APIs', body: 'No OpenAI. No Anthropic. No Cerebras. Your VPC only.' },
  { title: 'Zero persistence', body: 'Processed in RAM and discarded. Nothing logged or trained on.' },
]

const checkIcons = [
  <svg key="lock" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  <svg key="shield" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round"><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"/></svg>,
  <svg key="check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>,
]

export function Privacy() {
  return (
    <section id="privacy" className="py-[140px] bg-dark relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none top-[-20%] right-[-10%]"
        style={{ background: 'radial-gradient(circle,rgba(13,147,115,.08),transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none bottom-[-20%] left-[-10%]"
        style={{ background: 'radial-gradient(circle,rgba(13,147,115,.08),transparent 70%)' }}
      />

      <div className="max-w-[1120px] mx-auto px-7 relative z-[2]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p className="font-mono text-[11px] text-teal tracking-[0.12em] font-medium mb-4">
              PRIVACY BY ARCHITECTURE
            </p>
            <h2 className="font-display font-bold text-[clamp(32px,4.5vw,44px)] leading-[1.08] tracking-[-0.03em] text-white mb-4">
              Your voice stays yours. By design.
            </h2>
            <p className="text-[16px] text-[#8A8A85] leading-[1.75] mb-9">
              We engineered the pipeline so raw audio physically cannot leave the device. Not a policy. An architecture constraint.
            </p>

            <div className="flex flex-col gap-5">
              {checks.map((item, i) => (
                <div key={item.title} className="flex gap-3.5">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-[rgba(13,147,115,.12)]">
                    {checkIcons[i]}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-[14px] mb-0.5">{item.title}</div>
                    <div className="text-[13px] text-[#777] leading-[1.6]">{item.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — comparison card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="bg-dark-s border border-dark-b rounded-md p-8">
              <p className="font-mono text-[9.5px] text-[#9A9A95] tracking-[0.12em] mb-6">
                DATA COMPARISON
              </p>

              <div className="mb-7">
                <div className="flex justify-between mb-2">
                  <span className="text-[13px] text-[#888]">Cloud dictation</span>
                  <span className="font-mono text-[11px] text-[#EF4444]">~320 KB audio</span>
                </div>
                <div className="h-2.5 bg-[#1A1F17] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg,#EF4444,#F97316)' }} />
                </div>
                <p className="font-mono text-[9.5px] text-[#9A9A95] mt-1.5">→ OpenAI → Anthropic → Cerebras → Baseten</p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[13px] text-[#34D399] font-semibold">CursorTalk</span>
                  <span className="font-mono text-[11px] text-[#34D399]">~500 bytes text</span>
                </div>
                <div className="h-2.5 bg-[#1A1F17] rounded-full overflow-hidden">
                  <div className="h-full bg-[#34D399] rounded-full" style={{ width: '0.15%', minWidth: 4 }} />
                </div>
                <p className="font-mono text-[9.5px] text-[#9A9A95] mt-1.5">→ Your VPC only</p>
              </div>

              <div className="mt-9 pt-7 border-t border-dark-b text-center">
                <div className="font-display font-extrabold text-[56px] leading-none tracking-[-0.04em] text-[#34D399]">
                  640×
                </div>
                <p className="text-[13px] text-[#777] mt-1">less data on the wire</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
