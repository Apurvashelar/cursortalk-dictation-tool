'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Privacy', href: '#privacy' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export function Nav() {
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 30)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] transition-all duration-300',
        solid && 'bg-bg/85 backdrop-blur-2xl border-b border-border shadow-sm'
      )}
    >
      <div className="max-w-[1120px] mx-auto px-7 flex items-center justify-between py-3.5">
        <a href="#" aria-label="CursorTalk home" className="flex items-center gap-2.5 font-display font-bold text-[19px] text-ink">
          <img src="/icon.png" alt="CursorTalk logo" width={30} height={30} className="w-[30px] h-[30px] rounded-lg flex-shrink-0" />
          CursorTalk
        </a>

        <div className="hidden md:flex gap-7 text-[13.5px] font-medium text-muted">
          {navLinks.map(({ label, href }) => (
            <a key={label} href={href} className="hover:text-ink transition-colors duration-200">
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <a href="#" className="hidden md:inline text-[13.5px] font-medium text-muted">
            Docs
          </a>
          <a
            href="#download"
            className="flex items-center gap-2 bg-ink text-bg px-[22px] py-[10px] rounded-sm font-semibold text-sm hover:shadow-md hover:-translate-y-px transition-all duration-300"
          >
            <Download size={13} />
            Download
          </a>
        </div>
      </div>
    </nav>
  )
}
