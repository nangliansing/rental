import { useEffect, useRef, useState } from "react"

import { copyTextToClipboard } from "@/shared/utils/clipboard"

export function useCopyFeedback(resetMs = 1500) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const resetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  const copy = async (id: string, text: string) => {
    await copyTextToClipboard(text)
    setCopiedId(id)

    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current)
    }

    resetTimerRef.current = window.setTimeout(() => {
      setCopiedId(null)
      resetTimerRef.current = null
    }, resetMs)
  }

  return {
    copiedId,
    copy,
    isCopied: (id: string) => copiedId === id,
  }
}
