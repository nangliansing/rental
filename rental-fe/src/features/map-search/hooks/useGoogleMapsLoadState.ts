import { useCallback, useLayoutEffect, useRef, useState } from "react"

export type GoogleMapsLoadStatus = "loading" | "ready" | "error"

export const GOOGLE_MAPS_LOAD_TIMEOUT_MS = 25_000

declare global {
  interface Window {
    gm_authFailure?: () => void
  }
}

type UseGoogleMapsLoadStateOptions = {
  /**
   * When false, skip timeout/auth hooks and treat the key as already usable
   * (e.g. nested under an existing GoogleMapsApiProvider that finished loading).
   */
  enabled?: boolean
}

export function useGoogleMapsLoadState(
  hasApiKey: boolean,
  { enabled = true }: UseGoogleMapsLoadStateOptions = {},
) {
  const [status, setStatus] = useState<GoogleMapsLoadStatus>(() => {
    if (!hasApiKey) return "error"
    if (!enabled) return "ready"
    return "loading"
  })
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
    if (!hasApiKey || !enabled) return

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
  }, [clearLoadTimeout, enabled, hasApiKey, markFailed])

  return { status, markReady, markFailed }
}
