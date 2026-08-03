import { useCallback, useLayoutEffect, useRef, useState } from "react"

export type GoogleMapsLoadStatus = "loading" | "ready" | "error"

const GOOGLE_MAPS_LOAD_TIMEOUT_MS = 25_000

declare global {
  interface Window {
    gm_authFailure?: () => void
  }
}

export function useGoogleMapsLoadState(hasApiKey: boolean) {
  const [status, setStatus] = useState<GoogleMapsLoadStatus>(
    hasApiKey ? "loading" : "error",
  )
  const previousAuthFailureRef = useRef<(() => void) | undefined>(undefined)
  const loadTimeoutRef = useRef<number | null>(null)

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current === null) return

    window.clearTimeout(loadTimeoutRef.current)
    loadTimeoutRef.current = null
  }, [])

  const markReady = useCallback(() => {
    clearLoadTimeout()
    setStatus("ready")
  }, [clearLoadTimeout])

  const markFailed = useCallback(() => {
    clearLoadTimeout()
    setStatus("error")
  }, [clearLoadTimeout])

  useLayoutEffect(() => {
    if (!hasApiKey) return

    previousAuthFailureRef.current = window.gm_authFailure

    const handleAuthenticationFailure = () => {
      previousAuthFailureRef.current?.()
      markFailed()
    }

    window.gm_authFailure = handleAuthenticationFailure
    loadTimeoutRef.current = window.setTimeout(
      markFailed,
      GOOGLE_MAPS_LOAD_TIMEOUT_MS,
    )

    return () => {
      clearLoadTimeout()

      if (window.gm_authFailure === handleAuthenticationFailure) {
        window.gm_authFailure = previousAuthFailureRef.current
      }
    }
  }, [clearLoadTimeout, hasApiKey, markFailed])

  return { status, markReady, markFailed }
}
