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
    'Turn speech into polished writing in every app. Local Mode for individual. Self-hosted cleanup LLM for Enterprises. Zero third-party APIs. Ever.',
  openGraph: {
    title: 'CursorTalk — Voice dictation that never leaves your perimeter',
    description:
      'Turn speech into polished writing in every app. Local Mode for individual. Self-hosted cleanup LLM for Enterprises. Zero third-party APIs. Ever.',
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
