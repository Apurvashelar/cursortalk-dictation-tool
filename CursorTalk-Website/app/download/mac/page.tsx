'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MAC_DOWNLOAD_RELEASE_URL } from '@/lib/downloads'

export default function MacDownloadRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.src = MAC_DOWNLOAD_RELEASE_URL
    document.body.appendChild(iframe)

    const redirectTimer = window.setTimeout(() => {
      router.replace('/')
    }, 250)

    return () => {
      window.clearTimeout(redirectTimer)
      iframe.remove()
    }
  }, [router])

  return null
}
