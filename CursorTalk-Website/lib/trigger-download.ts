'use client'

import { MAC_DOWNLOAD_RELEASE_URL } from './downloads'

const DOWNLOAD_FRAME_ID = 'cursortalk-mac-download-frame'

export function triggerMacDownload() {
  if (typeof document === 'undefined') {
    return
  }

  const existingFrame = document.getElementById(DOWNLOAD_FRAME_ID)
  existingFrame?.remove()

  const frame = document.createElement('iframe')
  frame.id = DOWNLOAD_FRAME_ID
  frame.style.display = 'none'
  frame.src = MAC_DOWNLOAD_RELEASE_URL
  document.body.appendChild(frame)

  window.setTimeout(() => {
    frame.remove()
  }, 30000)
}
