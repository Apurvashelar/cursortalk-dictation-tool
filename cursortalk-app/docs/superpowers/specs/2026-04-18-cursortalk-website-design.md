# CursorTalk Marketing Website — Design Spec

**Date:** 2026-04-18  
**Status:** Approved  
**Location:** `~/Documents/Vive-coding/Whisper Flow Ent/cursortalk-website`

---

## Overview

A standalone Next.js marketing website for **CursorTalk** — a pixel-identical port of the `sovereign-landing-page.html` reference design, with all "Sovereign" branding replaced by "CursorTalk". Content and copy remain identical to the reference. Deployed to Vercel as a static export.

---

## Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | SEO-ready, static export, modern standard |
| Styling | Tailwind CSS (custom theme) | Matches desktop app toolchain; maps 1:1 to Sovereign CSS vars |
| Animations | Framer Motion + CSS keyframes | Scroll reveals via `whileInView`; wave/float/marquee as CSS keyframes |
| Fonts | `next/font` (Google Fonts) | Bricolage Grotesque, DM Sans, JetBrains Mono — same as reference |
| Deployment | Vercel (`output: 'export'`) | Zero-config static deploy, CDN, auto-deploys on push to `main` |
| Language | TypeScript | Consistent with existing codebase |

---

## Project Structure

```
cursortalk-website/
  app/
    layout.tsx          — fonts, <head> metadata, globals import
    page.tsx            — assembles all section components in order
    globals.css         — CSS reset, ::selection, scroll-behavior, keyframe definitions
  components/
    Nav.tsx             — fixed nav, scroll-triggered solid bg + blur
    Hero.tsx            — badge, headline, CTA buttons, ProductMockup
    ProductMockup.tsx   — browser window mockup, wave bars, stats row
    Marquee.tsx         — infinite-scroll app names strip
    Features.tsx        — 12-col bento grid, 6 feature cards
    HowItWorks.tsx      — 4-step timeline with animated fill line
    Privacy.tsx         — dark section, data comparison panel
    Download.tsx        — macOS + Windows download cards
    Pricing.tsx         — 3-tier pricing grid (Individual / Team / Enterprise)
    Faq.tsx             — accordion FAQ (useState, CSS max-height transition)
    FinalCta.tsx        — bottom CTA section
    Footer.tsx          — footer grid (4 columns)
  tailwind.config.ts    — custom colors, fonts, shadows, borderRadius, keyframes
  next.config.ts        — output: export, images: unoptimized
  package.json
  tsconfig.json
```

---

## Tailwind Theme

All values taken directly from the reference HTML's `:root` CSS variables.

### Colors
```ts
teal: {
  DEFAULT: '#0D9373',
  dark:    '#0A7A60',
  glow:    'rgba(13,147,115,.1)',
  tint:    '#EFFCF8',
}
ink:          '#111'
soft:         '#333'
muted:        '#777'
dim:          '#AAA'
bg:           '#FAFAF8'
surface:      '#FFF'
'surface-warm': '#F5F4F0'
border:       'rgba(0,0,0,.07)'
'border-hover': 'rgba(0,0,0,.13)'
dark: {
  DEFAULT: '#0B0F0D',
  s:       '#141A16',
  b:       'rgba(255,255,255,.06)',
}
```

### Typography
```ts
fontFamily: {
  display: ['Bricolage Grotesque', 'sans-serif'],
  sans:    ['DM Sans', 'sans-serif'],
  mono:    ['JetBrains Mono', 'monospace'],
}
```

### Shadows
```ts
'shadow-sm':   '0 1px 2px rgba(0,0,0,.04)'
'shadow-md':   '0 4px 20px rgba(0,0,0,.06)'
'shadow-lg':   '0 12px 48px rgba(0,0,0,.08)'
'shadow-glow': '0 0 40px rgba(13,147,115,.12)'
```

### Border Radius
```ts
sm:      '10px'
DEFAULT: '16px'
```

### Keyframes (defined in globals.css, registered in tailwind.config.ts)
- `wave` — scaleY 0.2 → 1 → 0.2 (wave bars in mockup recording indicator)
- `float` — translateY 0 → -12px → 0 (hero background glow blobs)
- `pulse-soft` — opacity 0.7 → 1 → 0.7 (hero badge dot)
- `marquee` — translateX 0 → -50% (app names scrolling strip)

---

## Component Details

### Nav
- Fixed position, `z-index: 100`
- `useScroll` (Framer Motion) watches `scrollY`; when `> 30` applies `backdrop-blur-xl`, `bg-bg/85`, `border-b`, `shadow-sm`
- Logo: microphone SVG icon + "CursorTalk" in `font-display font-bold`
- Links: Features, How it Works, Privacy, Pricing, FAQ
- Right side: Docs link + Download button

### Hero
- Two absolutely-positioned glow blobs with `animate-float` (staggered durations 14s / 18s)
- Background grid via `background-image: linear-gradient` repeating lines, masked with radial gradient
- Badge with pulsing dot (`animate-pulse-soft`)
- `<h1>` with `text-[clamp(44px,7.5vw,84px)]` and teal accent span
- Two CTA buttons (Mac + Windows), subtext note
- `<ProductMockup />` below

### ProductMockup
- Rounded card with `shadow-lg`
- Top bar: traffic light dots, app label, live recording indicator (wave bars + "REC")
- Two-column body: raw transcript (left) + cleaned output (right, teal tint bg)
- Stats row: 4 cells — Latency, Uploaded, 3rd-Party APIs, Data Reduction
- Wave bars: 5 `<span>` elements, `animate-wave` with staggered `animation-delay`

### Marquee
- Duplicated item list (24 items × 2 = 48 total) in a flex row
- `animate-marquee` translates -50% so the seam is invisible
- Masked with `[mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]`

### Features (Bento Grid)
- `grid grid-cols-12 gap-[14px]`
- Card spans: Speed (col-span-7), Hotkey (col-span-5), Vocab (col-span-5), Languages (col-span-4), Offline (col-span-3)
- Each card: hover `translateY(-3px) + shadow-md`; Offline card gets `shadow-glow` on hover
- All scroll-revealed with staggered `motion.div whileInView`

### HowItWorks
- Max-width 700px centered timeline
- Absolute vertical line (border) + `motion.div` fill line (teal gradient)
- 4 `timeline-step` items observed with `useInView`; each activation increments fill height
- Active step: node border turns teal, card gets `shadow-md`

### Privacy (Dark Section)
- `bg-dark` full-width section, two background glow blobs
- Left: bullet list with check icons; Right: comparison card (cloud vs CursorTalk data sent)
- Bar chart: cloud = 100% red bar; CursorTalk = 0.15% green bar
- Large "640×" stat at bottom of card

### Download
- Radial teal glow background
- Two `<a>` download cards (macOS + Windows) side by side
- Each card: OS icon, name, subtitle, version/size/requirements meta table
- Hover: `border-teal + shadow-glow + translateY(-4px)`

### Pricing
- Three cards: Individual ($0), Team ($8/user/mo — featured), Enterprise (Custom)
- Team card: teal border, `shadow-glow`, gradient bg top, "MOST POPULAR" pill
- Enterprise card: `bg-dark` inverted styling
- Feature lists with teal check marks

### FAQ
- `useState` tracks open question (single open at a time)
- CSS `max-height` transition on answer panel: `0 → 500px` via `overflow-hidden` + transition (CSS cannot animate to `auto`)
- `+` icon rotates 45° when open

### FinalCta
- Radial teal glow
- Large headline, two buttons, disclaimer note
- All scroll-revealed

### Footer
- 4-column grid: brand+description, Product links, Enterprise links, Resources links
- Bottom bar: copyright + Privacy/Terms/Security links

---

## Branding Substitutions

Every instance of "Sovereign" replaced with "CursorTalk":
- Page `<title>` and `<meta name="description">`
- `og:title`, `og:description`, `og:site_name`
- Nav logo text
- Footer brand text
- FAQ answer copy
- Final CTA section
- `© 2026 CursorTalk`

---

## Scroll Reveal System

All major elements use:
```tsx
<motion.div
  initial={{ opacity: 0, y: 32 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-30px' }}
  transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: n * 0.08 }}
>
```
Variants: `up` (y: 32), `up-sm` (y: 16), `left` (x: -40), `right` (x: 40), `scale` (scale: 0.96), `fade` (no transform).

---

## Deployment

1. Push `cursortalk-website/` to a new GitHub repo `cursortalk-website`
2. Connect repo to Vercel → Framework: Next.js → auto-detected
3. `next build` produces `out/` (static HTML/CSS/JS)
4. Vercel serves from CDN; custom domain via Vercel DNS settings
5. Every push to `main` triggers redeploy

---

## What This Spec Does Not Cover

- Contact form / waitlist backend (placeholder `href="#"` links for now)
- Analytics integration
- Blog or changelog pages
- Linux download (placeholder link only, as in the reference)
