type FooterLink = { label: string; href: string }

const productLinks: FooterLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Download', href: '#download' },
]

const companyLinks: FooterLink[] = [
  { label: 'Privacy', href: '#privacy' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Talk to sales', href: 'mailto:sales@cursortalk.com' },
]

export function Footer() {
  return (
    <footer className="border-t border-border py-14 bg-bg" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Site footer</h2>
      <div className="max-w-[1120px] mx-auto px-7">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-3.5">
              <div className="w-7 h-7 rounded-lg bg-ink flex items-center justify-center flex-shrink-0" aria-hidden="true">
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
            { title: 'COMPANY', links: companyLinks },
          ].map(({ title, links }) => (
            <nav key={title} aria-label={title.toLowerCase()}>
              <p className="font-mono text-[10px] text-dim tracking-[0.1em] font-medium mb-3.5">
                {title}
              </p>
              <div className="flex flex-col gap-2.5 text-[13px] text-muted">
                {links.map(({ label, href }) => (
                  <a key={label} href={href} className="hover:text-ink transition-colors duration-200">
                    {label}
                  </a>
                ))}
              </div>
            </nav>
          ))}
        </div>

        <div className="pt-6 border-t border-border">
          <span className="text-[12px] text-dim">© 2026 CursorTalk. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}
