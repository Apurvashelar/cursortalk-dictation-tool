const productLinks = ['Download', 'Features', 'Privacy', 'Pricing']
const enterpriseLinks = ['Self-hosted', 'Security', 'Compliance', 'Talk to sales']
const resourceLinks = ['Docs', 'Whitepaper', 'Changelog', 'FAQ']

export function Footer() {
  return (
    <footer className="border-t border-border py-14 bg-bg">
      <div className="max-w-[1120px] mx-auto px-7">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FAFAF8" strokeWidth="2.5" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                  <path d="M12 19v3" />
                </svg>
              </div>
              <span className="font-display font-bold text-[17px]">CursorTalk</span>
            </div>
            <p className="text-[13px] text-muted max-w-[260px] leading-[1.7]">
              Private, self-hosted voice dictation. Your voice stays on your device. Your data stays in your cloud.
            </p>
          </div>

          {[
            { title: 'PRODUCT', links: productLinks },
            { title: 'ENTERPRISE', links: enterpriseLinks },
            { title: 'RESOURCES', links: resourceLinks },
          ].map(({ title, links }) => (
            <div key={title}>
              <p className="font-mono text-[10px] text-dim tracking-[0.1em] font-medium mb-3.5">
                {title}
              </p>
              <div className="flex flex-col gap-2.5 text-[13px] text-muted">
                {links.map((l) => (
                  <a key={l} href="#" className="hover:text-ink transition-colors duration-200">
                    {l}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-border flex justify-between items-center flex-wrap gap-3">
          <span className="text-[12px] text-dim">© 2026 CursorTalk. All rights reserved.</span>
          <div className="flex gap-5 text-[12px] text-dim">
            {['Privacy', 'Terms', 'Security'].map((l) => (
              <a key={l} href="#" className="hover:text-ink transition-colors duration-200">
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
