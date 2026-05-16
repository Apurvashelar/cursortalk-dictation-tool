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
