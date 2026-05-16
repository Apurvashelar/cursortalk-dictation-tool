# CursorTalk Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Next.js 14 static marketing website for CursorTalk at `~/Documents/Vibe-Coding/Whisper Flow Ent/cursortalk-website`, pixel-identical to the `sovereign-landing-page.html` reference with "CursorTalk" branding throughout.

**Architecture:** Next.js 14 App Router with `output: 'export'` for fully static HTML. All styling via Tailwind CSS with a custom theme that maps 1:1 to the reference's CSS variables. Framer Motion handles scroll-reveal animations; CSS keyframes handle looping animations (wave, float, marquee, pulse).

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS v3, Framer Motion v11, Lucide React, clsx, tailwind-merge

---

## File Map

```
cursortalk-website/
  app/
    layout.tsx          — root layout: fonts, metadata, body class
    page.tsx            — assembles all section components
    globals.css         — reset, ::selection, scroll-behavior, @keyframes
  components/
    Nav.tsx             — fixed nav with scroll-triggered backdrop
    Hero.tsx            — hero section (badge, headline, CTAs)
    ProductMockup.tsx   — browser mockup with wave bars and stats
    Marquee.tsx         — infinite-scroll app names strip
    Features.tsx        — 12-col bento grid of 6 feature cards
    HowItWorks.tsx      — 4-step timeline with animated fill line
    Privacy.tsx         — dark section with data comparison card
    Download.tsx        — macOS + Windows download cards
    Pricing.tsx         — 3-tier pricing grid
    Faq.tsx             — accordion FAQ
    FinalCta.tsx        — bottom CTA section
    Footer.tsx          — 4-column footer grid
  lib/
    utils.ts            — cn() helper (clsx + tailwind-merge)
  tailwind.config.ts    — custom colors, fonts, shadows, keyframes
  next.config.ts        — output: export, images: unoptimized
  postcss.config.js     — tailwindcss + autoprefixer
  package.json
  tsconfig.json
```

---

## Task 1: Scaffold project — config files

**Files:**
- Create: `~/Documents/Vibe-Coding/Whisper Flow Ent/cursortalk-website/package.json`
- Create: `~/Documents/Vibe-Coding/Whisper Flow Ent/cursortalk-website/tsconfig.json`
- Create: `~/Documents/Vibe-Coding/Whisper Flow Ent/cursortalk-website/next.config.ts`
- Create: `~/Documents/Vibe-Coding/Whisper Flow Ent/cursortalk-website/postcss.config.js`

- [ ] **Step 1: Create project directory and package.json**

```bash
mkdir -p ~/Documents/Vibe-Coding/Whisper\ Flow\ Ent/cursortalk-website
cd ~/Documents/Vibe-Coding/Whisper\ Flow\ Ent/cursortalk-website
```

Create `package.json`:

```json
{
  "name": "cursortalk-website",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.400.0",
    "next": "14.2.3",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
}

export default nextConfig
```

- [ ] **Step 4: Create postcss.config.js**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 5: Install dependencies**

```bash
cd ~/Documents/Vibe-Coding/Whisper\ Flow\ Ent/cursortalk-website
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Init git and commit**

```bash
cd ~/Documents/Vibe-Coding/Whisper\ Flow\ Ent/cursortalk-website
git init
echo "node_modules/\n.next/\nout/" > .gitignore
git add .
git commit -m "chore: scaffold next.js project"
```

---

## Task 2: Tailwind config + globals.css

**Files:**
- Create: `tailwind.config.ts`
- Create: `app/globals.css`

- [ ] **Step 1: Create tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#0D9373',
          dark: '#0A7A60',
          glow: 'rgba(13,147,115,.1)',
          tint: '#EFFCF8',
        },
        ink: '#111111',
        soft: '#333333',
        muted: '#777777',
        dim: '#AAAAAA',
        bg: '#FAFAF8',
        surface: '#FFFFFF',
        'surface-warm': '#F5F4F0',
        border: 'rgba(0,0,0,.07)',
        'border-hover': 'rgba(0,0,0,.13)',
        dark: {
          DEFAULT: '#0B0F0D',
          s: '#141A16',
          b: 'rgba(255,255,255,.06)',
        },
      },
      fontFamily: {
        display: ['var(--font-bricolage)', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,.04)',
        md: '0 4px 20px rgba(0,0,0,.06)',
        lg: '0 12px 48px rgba(0,0,0,.08)',
        glow: '0 0 40px rgba(13,147,115,.12)',
      },
      borderRadius: {
        sm: '10px',
        DEFAULT: '16px',
        md: '16px',
        lg: '16px',
      },
      keyframes: {
        wave: {
          '0%, 100%': { transform: 'scaleY(0.2)' },
          '50%': { transform: 'scaleY(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        wave: 'wave 1.3s ease-in-out infinite',
        float: 'float 14s ease-in-out infinite',
        'float-slow': 'float 18s ease-in-out infinite reverse',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Create app/ directory and globals.css**

```bash
mkdir -p app
```

Create `app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  scroll-padding-top: 80px;
}

body {
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

::selection {
  background: #0D9373;
  color: #fff;
}

a {
  color: inherit;
  text-decoration: none;
}

img {
  display: block;
  max-width: 100%;
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat: add tailwind theme and global styles"
```

---

## Task 3: layout.tsx + lib/utils.ts

**Files:**
- Create: `app/layout.tsx`
- Create: `lib/utils.ts`

- [ ] **Step 1: Create lib/utils.ts**

```bash
mkdir -p lib
```

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: Create app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CursorTalk — Voice dictation that never leaves your perimeter',
  description:
    'Turn speech into polished writing in every app. Local Whisper transcription. Self-hosted cleanup LLM. Zero third-party APIs. Ever.',
  openGraph: {
    title: 'CursorTalk — Voice dictation that never leaves your perimeter',
    description:
      'Turn speech into polished writing in every app. Local Whisper transcription. Self-hosted cleanup LLM. Zero third-party APIs. Ever.',
    siteName: 'CursorTalk',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${bricolage.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-sans bg-bg text-ink`}
      >
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Create minimal app/page.tsx so the project compiles**

```tsx
export default function Page() {
  return <main />
}
```

- [ ] **Step 4: Run dev server to verify fonts and tailwind load**

```bash
npm run dev
```

Open `http://localhost:3000` — expect blank page with no console errors. Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx lib/utils.ts
git commit -m "feat: add root layout with fonts and cn utility"
```

---

## Task 4: Nav component

**Files:**
- Create: `components/Nav.tsx`

- [ ] **Step 1: Create components/ directory and Nav.tsx**

```bash
mkdir -p components
```

```tsx
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
      className={cn(
        'fixed top-0 left-0 right-0 z-[100] transition-all duration-300',
        solid && 'bg-bg/85 backdrop-blur-2xl border-b border-border shadow-sm'
      )}
    >
      <div className="max-w-[1120px] mx-auto px-7 flex items-center justify-between py-3.5">
        <a href="#" className="flex items-center gap-2.5 font-display font-bold text-[19px] text-ink">
          <div className="w-[30px] h-[30px] rounded-lg bg-ink flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FAFAF8" strokeWidth="2.5" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
              <path d="M12 19v3" />
            </svg>
          </div>
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
```

- [ ] **Step 2: Add Nav to page.tsx and verify it renders**

Replace `app/page.tsx`:

```tsx
import { Nav } from '@/components/Nav'

export default function Page() {
  return (
    <>
      <Nav />
      <main className="pt-20 min-h-screen" />
    </>
  )
}
```

Run `npm run dev`, open `http://localhost:3000`, scroll down — nav should gain backdrop blur. Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add components/Nav.tsx app/page.tsx
git commit -m "feat: add Nav component with scroll-triggered backdrop"
```

---

## Task 5: ProductMockup component

**Files:**
- Create: `components/ProductMockup.tsx`

- [ ] **Step 1: Create ProductMockup.tsx**

```tsx
const waveBars = [
  { height: 8, delay: '0s' },
  { height: 14, delay: '0.08s' },
  { height: 18, delay: '0.16s' },
  { height: 10, delay: '0.24s' },
  { height: 16, delay: '0.32s' },
]

const stats = [
  { label: 'LATENCY', value: '~1.3s' },
  { label: 'UPLOADED', value: '500 bytes' },
  { label: '3RD-PARTY APIs', value: 'Zero', accent: true },
  { label: 'DATA REDUCTION', value: '640×' },
]

export function ProductMockup() {
  return (
    <div className="bg-surface border border-border rounded-md shadow-lg overflow-hidden text-left">
      {/* Top bar */}
      <div className="flex items-center justify-between px-[18px] py-3 border-b border-border bg-surface-warm">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
        </div>
        <span className="font-mono text-[11px] text-dim">Gmail — Compose</span>
        <div className="flex items-center gap-[7px]">
          <div className="flex items-end gap-[2.5px] h-[18px]">
            {waveBars.map((bar, i) => (
              <span
                key={i}
                className="w-[2.5px] bg-teal rounded-sm origin-bottom animate-wave"
                style={{ height: bar.height, animationDelay: bar.delay }}
              />
            ))}
          </div>
          <span className="font-mono text-[9px] text-teal font-medium tracking-[0.05em]">REC</span>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-7 md:border-r border-b md:border-b-0 border-border">
          <div className="flex items-center gap-[7px] mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            <span className="font-mono text-[9.5px] text-[#D97706] tracking-[0.08em] font-medium">
              RAW TRANSCRIPT · LOCAL
            </span>
          </div>
          <p className="text-[14.5px] text-muted italic leading-[1.85]">
            "um so hey mike just wanted to uh let you know that the thursday 3 pm meeting um that got moved to friday at 2 so yeah just make sure you got that on your calendar thanks"
          </p>
          <div className="font-mono text-[9.5px] text-dim mt-3.5">
            Whisper · distil-large-v3 · 0.9s · on-device
          </div>
        </div>
        <div className="p-7 bg-teal-tint">
          <div className="flex items-center gap-[7px] mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            <span className="font-mono text-[9.5px] text-teal-dark tracking-[0.08em] font-medium">
              CLEANED · YOUR VPC
            </span>
          </div>
          <p className="text-[14.5px] text-ink leading-[1.85]">
            Hi Mike — quick heads up: our Thursday 3 PM meeting has been moved to Friday at 2 PM.
            Wanted to make sure it's on your calendar.
            <br /><br />Thanks!
          </p>
          <div className="font-mono text-[9.5px] text-dim mt-3.5">
            Llama 3B · fine-tuned · 285ms · your-aws
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`p-5 text-center${i > 0 ? ' border-l border-border' : ''}`}
          >
            <div className="font-mono text-[10px] text-dim tracking-[0.1em] mb-1">{stat.label}</div>
            <div
              className={`font-display text-[26px] font-bold tracking-[-0.02em]${stat.accent ? ' text-teal' : ''}`}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ProductMockup.tsx
git commit -m "feat: add ProductMockup component"
```

---

## Task 6: Hero component

**Files:**
- Create: `components/Hero.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create Hero.tsx**

```tsx
'use client'

import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import { ProductMockup } from './ProductMockup'

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
          Turn speech into polished writing in every app. Local Whisper transcription.
          Self-hosted cleanup LLM. Zero third-party APIs. Ever.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...reveal(0.24)}
          className="flex flex-wrap gap-2.5 justify-center mb-3.5"
        >
          <a
            href="#download"
            className="inline-flex items-center gap-2 bg-ink text-bg px-8 py-4 rounded-[14px] font-semibold text-[16px] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
          >
            <svg width="18" height="18" viewBox="0 0 384 512" fill="currentColor">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zM256.6 81c31.1-36.9 28.2-70.5 27.3-82.5-24.8 1.4-53.5 16.9-69.9 35.9-18.1 20.4-28.7 45.6-26.4 72.5 26.7 2.1 51.1-11.6 69-25.9z" />
            </svg>
            Download for Mac
          </a>
          <a
            href="#download"
            className="inline-flex items-center gap-2 bg-surface border-[1.5px] border-border-hover text-ink px-8 py-4 rounded-[14px] font-semibold text-[16px] hover:border-ink hover:-translate-y-0.5 transition-all duration-300"
          >
            <svg width="16" height="16" viewBox="0 0 448 512" fill="currentColor">
              <path d="M0 93.7l183.6-25.3v177.4H0V93.7zm0 324.6l183.6 25.3V268.4H0v149.9zm203.8 28L448 480V268.4H203.8v177.9zm0-380.6v180.1H448V32L203.8 65.7z" />
            </svg>
            Download for Windows
          </a>
        </motion.div>

        <motion.p
          {...reveal(0.32)}
          className="font-mono text-[11px] text-dim tracking-[0.07em]"
        >
          FREE · NO ACCOUNT · 50 MB · OFFLINE-READY
        </motion.p>

        {/* Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.4 }}
          className="mt-16"
        >
          <ProductMockup />
        </motion.div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add Hero to page.tsx**

```tsx
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Run dev and verify hero section renders correctly**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify: headline text, two CTA buttons, mockup with wave bars animating. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add components/Hero.tsx app/page.tsx
git commit -m "feat: add Hero and ProductMockup sections"
```

---

## Task 7: Marquee component

**Files:**
- Create: `components/Marquee.tsx`

- [ ] **Step 1: Create Marquee.tsx**

```tsx
const items = [
  'Gmail', 'Slack', 'Notion', 'VS Code', 'Teams', 'Figma',
  'Outlook', 'Google Docs', 'Linear', 'Jira', 'Salesforce', 'Zendesk',
]

export function Marquee() {
  const doubled = [...items, ...items]

  return (
    <section className="py-12 border-t border-b border-border bg-surface overflow-hidden">
      <p className="font-mono text-center text-[10px] text-dim tracking-[0.15em] mb-5">
        WORKS IN EVERY APP
      </p>
      <div
        className="overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(90deg, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <div className="flex gap-10 w-max animate-marquee items-center">
          {doubled.map((item, i) => (
            <div key={i} className="flex items-center gap-10">
              <span className="font-display text-[18px] font-medium text-dim whitespace-nowrap tracking-[-0.01em]">
                {item}
              </span>
              <span className="text-border-hover">·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add Marquee to page.tsx**

```tsx
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Marquee } from '@/components/Marquee'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Marquee.tsx app/page.tsx
git commit -m "feat: add Marquee scrolling strip"
```

---

## Task 8: Features bento grid

**Files:**
- Create: `components/Features.tsx`

- [ ] **Step 1: Create Features.tsx**

```tsx
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

export function Features() {
  return (
    <section id="features" className="py-[140px] bg-bg">
      <div className="max-w-[1120px] mx-auto px-7">
        <motion.div {...reveal()} className="mb-14 max-w-[520px]">
          <p className="font-mono text-[11px] text-teal tracking-[0.12em] font-medium mb-3.5">
            FEATURES
          </p>
          <h2 className="font-display font-bold text-[clamp(32px,5vw,48px)] leading-[1.08] tracking-[-0.03em] mb-3.5">
            Everything you need. Nothing you shouldn't trust.
          </h2>
          <p className="text-[16px] text-muted leading-[1.7]">
            Enterprise-grade dictation that keeps privacy as an architecture decision — not a policy checkbox.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-12 gap-[14px]">

          {/* Speed — 7 cols */}
          <motion.div
            {...reveal(0)}
            className="col-span-12 md:col-span-7 bg-surface border border-border rounded-md p-9 flex gap-9 items-center flex-wrap hover:border-border-hover hover:shadow-md hover:-translate-y-[3px] transition-all duration-300"
          >
            <div className="flex-1 min-w-[200px]">
              <p className="font-mono text-[10px] text-teal tracking-[0.1em] font-medium mb-2.5">
                3× FASTER INPUT
              </p>
              <h3 className="font-display font-bold text-[24px] tracking-[-0.03em] mb-2.5">
                Speak at 150 WPM.
              </h3>
              <p className="text-[13.5px] text-muted leading-[1.7]">
                Your mouth is 3× faster than your fingers. CursorTalk bridges the gap with real-time ASR and LLM cleanup.
              </p>
            </div>
            <div className="flex gap-5 items-end flex-shrink-0">
              <div className="text-center">
                <div className="w-12 h-9 rounded-t-lg bg-surface-warm border border-border border-b-0 mb-1.5" />
                <span className="font-mono text-[10px] text-dim">40</span>
              </div>
              <div className="text-center">
                <div className="w-12 rounded-t-lg bg-teal mb-1.5" style={{ height: 130 }} />
                <span className="font-mono text-[10px] text-teal font-semibold">150</span>
              </div>
            </div>
          </motion.div>

          {/* Hotkey — 5 cols */}
          <motion.div
            {...reveal(0.08)}
            className="col-span-12 md:col-span-5 bg-surface border border-border rounded-md p-9 flex flex-col justify-between hover:border-border-hover hover:shadow-md hover:-translate-y-[3px] transition-all duration-300"
          >
            <div>
              <p className="font-mono text-[10px] text-teal tracking-[0.1em] font-medium mb-2.5">
                GLOBAL HOTKEY
              </p>
              <h3 className="font-display font-bold text-[24px] tracking-[-0.03em] mb-2.5">
                One shortcut. Every app.
              </h3>
              <p className="text-[13.5px] text-muted leading-[1.7]">
                Customizable. Works in native apps, browsers, terminals — anywhere text goes.
              </p>
            </div>
            <div className="flex gap-1.5 items-center justify-center mt-6">
              {['⌘', '⇧', 'Space'].map((key) => (
                <span
                  key={key}
                  className="font-mono text-[13px] bg-surface-warm border border-border-hover rounded-lg px-3 py-1.5"
                  style={{ borderBottomWidth: 3 }}
                >
                  {key}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Vocab — 5 cols */}
          <motion.div
            {...reveal(0.16)}
            className="col-span-12 md:col-span-5 bg-surface border border-border rounded-md p-9 hover:border-border-hover hover:shadow-md hover:-translate-y-[3px] transition-all duration-300"
          >
            <p className="font-mono text-[10px] text-teal tracking-[0.1em] font-medium mb-2.5">
              CUSTOM VOCABULARY
            </p>
            <h3 className="font-display font-bold text-[24px] tracking-[-0.03em] mb-2.5">
              Learns your jargon.
            </h3>
            <p className="text-[13.5px] text-muted leading-[1.7] mb-[18px]">
              Names, acronyms, product codes — auto-learned from corrections.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {['kubectl', 'gRPC', 'EBITDA'].map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[11px] bg-surface-warm border border-border rounded-lg px-[11px] py-[5px]"
                >
                  {tag}
                </span>
              ))}
              <span className="font-mono text-[11px] bg-teal-tint border border-teal/20 rounded-lg px-[11px] py-[5px] text-teal-dark">
                + Add
              </span>
            </div>
          </motion.div>

          {/* Languages — 4 cols */}
          <motion.div
            {...reveal(0.24)}
            className="col-span-12 md:col-span-4 bg-surface border border-border rounded-md p-9 hover:border-border-hover hover:shadow-md hover:-translate-y-[3px] transition-all duration-300"
          >
            <p className="font-mono text-[10px] text-teal tracking-[0.1em] font-medium mb-2.5">
              MULTILINGUAL
            </p>
            <h3 className="font-display font-bold text-[24px] tracking-[-0.03em] mb-2.5">
              90+ languages.
            </h3>
            <p className="text-[13.5px] text-muted leading-[1.7] mb-[18px]">
              Auto-detected. Switch mid-sentence.
            </p>
            <div className="flex flex-wrap gap-2 text-[20px]">
              {['🇺🇸', '🇪🇸', '🇫🇷', '🇩🇪', '🇯🇵', '🇨🇳', '🇰🇷', '🇸🇦'].map((flag, i) => (
                <span key={i}>{flag}</span>
              ))}
              <span className="font-mono text-[10px] text-dim flex items-center">+80</span>
            </div>
          </motion.div>

          {/* Offline — 3 cols (teal accent card) */}
          <motion.div
            {...reveal(0.32)}
            className="col-span-12 md:col-span-3 bg-teal-tint border border-teal/20 rounded-md p-9 hover:shadow-glow hover:-translate-y-[3px] transition-all duration-300"
          >
            <p className="font-mono text-[10px] text-teal-dark tracking-[0.1em] font-medium mb-2.5">
              OFFLINE
            </p>
            <h3 className="font-display font-bold text-[24px] tracking-[-0.03em] mb-2.5">
              Works on a plane.
            </h3>
            <p className="text-[13.5px] text-muted leading-[1.7]">
              Whisper runs locally. Cleanup syncs when back online.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add Features to page.tsx**

```tsx
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Marquee } from '@/components/Marquee'
import { Features } from '@/components/Features'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Features.tsx app/page.tsx
git commit -m "feat: add Features bento grid section"
```

---

## Task 9: HowItWorks timeline

**Files:**
- Create: `components/HowItWorks.tsx`

- [ ] **Step 1: Create HowItWorks.tsx**

```tsx
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
    body: 'Hit ⌘⇧Space anywhere. Mic captures PCM 16kHz mono audio entirely on your machine.',
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
    body: 'distil-whisper-large-v3 runs via whisper.cpp. Audio stays in RAM — never written to disk, never uploaded.',
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
    body: 'Fine-tuned Llama 3B removes filler, fixes grammar, adds punctuation. Inserted directly where your cursor is.',
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
```

- [ ] **Step 2: Add HowItWorks to page.tsx**

```tsx
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Marquee } from '@/components/Marquee'
import { Features } from '@/components/Features'
import { HowItWorks } from '@/components/HowItWorks'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <HowItWorks />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/HowItWorks.tsx app/page.tsx
git commit -m "feat: add HowItWorks timeline section"
```

---

## Task 10: Privacy section

**Files:**
- Create: `components/Privacy.tsx`

- [ ] **Step 1: Create Privacy.tsx**

```tsx
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
              <p className="font-mono text-[9.5px] text-[#555] tracking-[0.12em] mb-6">
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
                <p className="font-mono text-[9.5px] text-[#555] mt-1.5">→ OpenAI → Anthropic → Cerebras → Baseten</p>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[13px] text-[#34D399] font-semibold">CursorTalk</span>
                  <span className="font-mono text-[11px] text-[#34D399]">~500 bytes text</span>
                </div>
                <div className="h-2.5 bg-[#1A1F17] rounded-full overflow-hidden">
                  <div className="h-full bg-[#34D399] rounded-full" style={{ width: '0.15%', minWidth: 4 }} />
                </div>
                <p className="font-mono text-[9.5px] text-[#555] mt-1.5">→ Your VPC only</p>
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
```

- [ ] **Step 2: Add Privacy to page.tsx**

```tsx
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Marquee } from '@/components/Marquee'
import { Features } from '@/components/Features'
import { HowItWorks } from '@/components/HowItWorks'
import { Privacy } from '@/components/Privacy'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <HowItWorks />
        <Privacy />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Privacy.tsx app/page.tsx
git commit -m "feat: add Privacy dark section"
```

---

## Task 11: Download section

**Files:**
- Create: `components/Download.tsx`

- [ ] **Step 1: Create Download.tsx**

```tsx
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
    size: '52 MB',
    requires: 'macOS 12+',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 448 512" fill="currentColor">
        <path d="M0 93.7l183.6-25.3v177.4H0V93.7zm0 324.6l183.6 25.3V268.4H0v149.9zm203.8 28L448 480V268.4H203.8v177.9zm0-380.6v180.1H448V32L203.8 65.7z" />
      </svg>
    ),
    name: 'Windows',
    sub: 'x64 · ARM64 · NVIDIA optional',
    version: '1.0.0',
    size: '58 MB',
    requires: 'Windows 10+',
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
            Start dictating in <span className="text-teal">30 seconds.</span>
          </h2>
          <p className="text-[17px] text-muted max-w-[460px] mx-auto mb-12 leading-[1.7]">
            Free for individuals. No account required. Works offline after first launch.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[640px] mx-auto mb-9">
          {platforms.map((p, i) => (
            <motion.a
              key={p.name}
              {...reveal(0.08 * (i + 1))}
              href="#"
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
          Linux in beta ·{' '}
          <a href="#" className="text-teal">Join waitlist</a>
          {' '}· MDM?{' '}
          <a href="#" className="text-teal">Get MSI/PKG</a>
        </motion.p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add Download to page.tsx**

```tsx
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Marquee } from '@/components/Marquee'
import { Features } from '@/components/Features'
import { HowItWorks } from '@/components/HowItWorks'
import { Privacy } from '@/components/Privacy'
import { Download } from '@/components/Download'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <HowItWorks />
        <Privacy />
        <Download />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Download.tsx app/page.tsx
git commit -m "feat: add Download section"
```

---

## Task 12: Pricing section

**Files:**
- Create: `components/Pricing.tsx`

- [ ] **Step 1: Create Pricing.tsx**

```tsx
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
```

- [ ] **Step 2: Add Pricing to page.tsx**

```tsx
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Marquee } from '@/components/Marquee'
import { Features } from '@/components/Features'
import { HowItWorks } from '@/components/HowItWorks'
import { Privacy } from '@/components/Privacy'
import { Download } from '@/components/Download'
import { Pricing } from '@/components/Pricing'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <HowItWorks />
        <Privacy />
        <Download />
        <Pricing />
      </main>
    </>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Pricing.tsx app/page.tsx
git commit -m "feat: add Pricing section"
```

---

## Task 13: Faq + FinalCta components

**Files:**
- Create: `components/Faq.tsx`
- Create: `components/FinalCta.tsx`

- [ ] **Step 1: Create Faq.tsx**

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'Does my audio ever leave my machine?',
    a: 'No. Whisper runs locally via whisper.cpp. Only the plain-text transcript (~500 bytes) is sent over HTTPS — and in the Enterprise plan, that server lives in your own AWS VPC.',
  },
  {
    q: 'How is this different from Wispr Flow?',
    a: 'Wispr sends raw audio to OpenAI, Anthropic, Cerebras, and Baseten. We send zero audio to zero third parties. Whisper runs on-device; the cleanup LLM runs on infrastructure you own.',
  },
  {
    q: 'What hardware do I need?',
    a: 'Mac with Apple Silicon (M1+) or Intel with 8GB+ RAM. Windows 10+ with 8GB+ RAM — NVIDIA GPU optional but gives 3-5× faster transcription.',
  },
  {
    q: "What's the latency?",
    a: '~1.3-2.0s end-to-end after you stop speaking. Cloud tools are faster (~0.7s) because they skip on-device ASR — but they send your audio to 4+ third parties.',
  },
  {
    q: 'Can my IT team deploy this to our AWS?',
    a: 'Yes — the Enterprise plan includes a CloudFormation template, model weights, Docker image, and IaC. Deploy in ~10 minutes. You own it with zero vendor dependency.',
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
```

- [ ] **Step 2: Create FinalCta.tsx**

```tsx
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
          FREE · NO ACCOUNT · macOS + WINDOWS · 50 MB
        </motion.p>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/Faq.tsx components/FinalCta.tsx
git commit -m "feat: add Faq accordion and FinalCta components"
```

---

## Task 14: Footer + assemble page.tsx

**Files:**
- Create: `components/Footer.tsx`
- Modify: `app/page.tsx` (final assembly)

- [ ] **Step 1: Create Footer.tsx**

```tsx
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
```

- [ ] **Step 2: Write final app/page.tsx**

```tsx
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Marquee } from '@/components/Marquee'
import { Features } from '@/components/Features'
import { HowItWorks } from '@/components/HowItWorks'
import { Privacy } from '@/components/Privacy'
import { Download } from '@/components/Download'
import { Pricing } from '@/components/Pricing'
import { Faq } from '@/components/Faq'
import { FinalCta } from '@/components/FinalCta'
import { Footer } from '@/components/Footer'

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Features />
        <HowItWorks />
        <Privacy />
        <Download />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 3: Run dev and do a full visual walkthrough**

```bash
npm run dev
```

Open `http://localhost:3000`. Scroll through all sections and verify:
- Nav blurs on scroll
- Hero glow blobs float
- Wave bars animate in mockup
- Marquee scrolls continuously
- Bento grid is 12-col on desktop, stacks on mobile
- Timeline fill animates as steps scroll into view
- Privacy dark section renders correctly
- Pricing "MOST POPULAR" pill is visible
- FAQ accordion opens/closes
- Footer has 4 columns on desktop

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add components/Footer.tsx app/page.tsx
git commit -m "feat: add Footer and assemble full page"
```

---

## Task 15: Build verification + responsive check

**Files:** No new files.

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: `out/` directory created, no errors. Output ends with `✓ Generating static pages`.

- [ ] **Step 3: Serve the static build and verify**

```bash
npx serve out
```

Open `http://localhost:3000`. Verify page loads from static files, all fonts load, animations work.

- [ ] **Step 4: Check mobile layout**

In browser DevTools, switch to iPhone 14 Pro viewport (390×844). Verify:
- Nav links hidden (hamburger not needed for now — reference also hides links on mobile)
- Hero stacks vertically
- Mockup body stacks vertically
- Bento grid cards full-width
- Privacy grid stacks vertically
- Pricing grid stacks vertically
- Footer 2-column grid

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete cursortalk marketing website"
```

---

## Notes for Executor

- **Emoji regex in Features.tsx** — the `\p{Emoji}` Unicode property is available in modern V8 (Node 16+). If TypeScript complains, add `// @ts-ignore` above the line or hardcode the flag array directly: `['🇺🇸','🇪🇸','🇫🇷','🇩🇪','🇯🇵','🇨🇳','🇰🇷','🇸🇦']`.
- **`bg-bg/85` opacity modifier** — Tailwind v3 supports opacity modifiers on custom colors. If it doesn't apply correctly, replace with the inline style `style={{ backgroundColor: 'rgba(250,250,248,0.85)' }}` on the Nav wrapper.
- **`border-border` class** — Tailwind generates `border-border` from `colors.border`. If you see a lint warning, it's a false positive — the generated CSS is valid.
- **Framer Motion SSR** — All components using Framer Motion must have `'use client'` at the top. Server Components cannot render `motion.*` elements.
