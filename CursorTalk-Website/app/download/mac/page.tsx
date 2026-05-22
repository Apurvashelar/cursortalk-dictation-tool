'use client'

import { useEffect } from 'react'
import { MAC_DOWNLOAD_RELEASE_URL } from '@/lib/downloads'

export default function MacDownloadRedirectPage() {
  useEffect(() => {
    window.location.replace(MAC_DOWNLOAD_RELEASE_URL)
  }, [])

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-6 py-24 text-[#121212]">
      <div className="mx-auto max-w-2xl rounded-3xl border border-black/10 bg-white px-8 py-10 shadow-sm">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#0d9373]">
          CursorTalk Download
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">
          Your download is starting...
        </h1>
        <p className="mt-4 text-base leading-7 text-black/70">
          If nothing happens, use the direct download link below.
        </p>

        <div className="mt-8 space-y-3 rounded-2xl border border-black/8 bg-black/[0.025] p-5 text-sm text-black/70">
          <p>- Current build: Apple Silicon Mac</p>
          <p>- First launch may show an unverified developer warning</p>
          <p>- Move the app to Applications, then right-click Open if macOS blocks it</p>
        </div>

        <a
          href={MAC_DOWNLOAD_RELEASE_URL}
          className="mt-8 inline-flex items-center rounded-2xl bg-[#121212] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          Download CursorTalk for Mac
        </a>
      </div>
    </main>
  )
}
