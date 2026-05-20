import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
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

const SITE_URL = 'https://cursortalk.com'
const SITE_NAME = 'CursorTalk'
const TITLE = 'CursorTalk — Private, self-hosted voice dictation for Mac'
const DESCRIPTION =
  'Turn speech into polished writing in every Mac app. Local Whisper transcription, self-hosted cleanup LLM for enterprises. Zero third-party APIs. Ever.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s · CursorTalk',
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  generator: 'Next.js',
  keywords: [
    'voice dictation',
    'speech to text Mac',
    'private dictation',
    'self-hosted speech to text',
    'enterprise dictation',
    'Whisper dictation',
    'on-device speech recognition',
    'macOS voice input',
    'Wispr Flow alternative',
    'HIPAA dictation',
    'SOC 2 dictation',
  ],
  authors: [{ name: 'CursorTalk' }],
  creator: 'CursorTalk',
  publisher: 'CursorTalk',
  category: 'productivity',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CursorTalk — Private, self-hosted voice dictation for Mac',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [{ url: '/icon.png' }],
    shortcut: '/icon.png',
  },
  manifest: '/site.webmanifest',
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF8' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1411' },
  ],
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
}

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  sameAs: [] as string[],
}

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'macOS 12+',
  description: DESCRIPTION,
  url: SITE_URL,
  image: `${SITE_URL}/og-image.png`,
  downloadUrl: `${SITE_URL}/downloads/CursorTalk.dmg`,
  softwareVersion: '1.0.0',
  fileSize: '21MB',
  offers: [
    {
      '@type': 'Offer',
      name: 'Individual',
      price: '0',
      priceCurrency: 'USD',
    },
    {
      '@type': 'Offer',
      name: 'Team',
      price: '8',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '8',
        priceCurrency: 'USD',
        referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: 'user/month' },
      },
    },
  ],
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Does my audio ever leave my machine?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'No. Whisper runs locally via whisper.cpp. Only the plain-text transcript (~500 bytes) is sent over HTTPS and in the Enterprise plan, that server lives in your own AWS VPC.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is this different from Wispr Flow?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Wispr sends raw audio to OpenAI, Anthropic, Cerebras, and Baseten. CursorTalk sends zero audio to zero third parties. Whisper runs on-device; the cleanup LLM runs on infrastructure you own.',
      },
    },
    {
      '@type': 'Question',
      name: 'What hardware do I need?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Mac with Apple Silicon (M1+) or Intel with 8GB+ RAM. macOS 12 (Monterey) or later.',
      },
    },
    {
      '@type': 'Question',
      name: "What's the latency?",
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          '~1.3–2.0s end-to-end after you stop speaking. Cloud tools are faster (~0.7s) because they skip on-device ASR — but they send your audio to 4+ third parties.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can my IT team deploy this to our AWS?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Yes — the Enterprise plan includes a CloudFormation template, model weights, Docker image, and IaC. Deploy in ~10 minutes. You own it with zero vendor dependency.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you train on my data?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Never. Transcripts are processed in RAM and discarded. Nothing logged, stored, or used for training under any plan.',
      },
    },
  ],
}

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const CLOUDFLARE_BEACON_TOKEN = process.env.NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </head>
      <body
        className={`${bricolage.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-sans bg-bg text-ink`}
      >
        {children}

        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
              `}
            </Script>
          </>
        )}

        {CLOUDFLARE_BEACON_TOKEN && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${CLOUDFLARE_BEACON_TOKEN}"}`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  )
}
