import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import {
  GOOGLE_SIGN_IN_BUTTON_OPTIONS,
  GOOGLE_SIGN_IN_SLOT_HEIGHT_PX,
  GOOGLE_SIGN_IN_STABLE_MS,
  clampGoogleSignInButtonWidth,
} from "../lib/googleSignInButtonLayout"
import {
  initializeGoogleIdentity,
  setGoogleCredentialHandler,
} from "../lib/googleIdentity"

type GoogleSignInButtonProps = {
  disabled?: boolean
  onCredential: (credential: string) => void
  onError: (message: string) => void
}

export function GoogleSignInButton({
  disabled = false,
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onCredentialRef = useRef(onCredential)
  const onErrorRef = useRef(onError)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    onCredentialRef.current = onCredential
    onErrorRef.current = onError
  }, [onCredential, onError])

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ""
    let disposed = false
    let resizeObserver: ResizeObserver | null = null
    let stableTimer: ReturnType<typeof setTimeout> | null = null
    let renderedWidth = 0

    const scheduleReady = () => {
      if (stableTimer) clearTimeout(stableTimer)

      stableTimer = setTimeout(() => {
        if (!disposed) setIsReady(true)
      }, GOOGLE_SIGN_IN_STABLE_MS)
    }

    const setup = async () => {
      try {
        const api = await initializeGoogleIdentity(clientId)
        const container = containerRef.current

        if (disposed || !container) return

        setGoogleCredentialHandler((response) => {
          const credential = response.credential?.trim()

          if (!credential) {
            onErrorRef.current("Google sign-in did not return a credential.")
            return
          }

          onCredentialRef.current(credential)
        })

        const renderButton = (width: number) => {
          if (!containerRef.current) return

          renderedWidth = width
          containerRef.current.replaceChildren()
          api.renderButton(containerRef.current, {
            ...GOOGLE_SIGN_IN_BUTTON_OPTIONS,
            width,
          })
        }

        const syncButtonWidth = (width: number) => {
          const nextWidth = clampGoogleSignInButtonWidth(width)

          if (nextWidth !== renderedWidth) {
            renderButton(nextWidth)
          }

          scheduleReady()
        }

        syncButtonWidth(container.getBoundingClientRect().width)

        resizeObserver = new ResizeObserver(([entry]) => {
          if (!entry) return

          syncButtonWidth(entry.contentRect.width)
        })
        resizeObserver.observe(container)
      } catch {
        if (disposed) return

        setIsReady(true)
        onErrorRef.current(
          "Google sign-in is unavailable right now. Please try again.",
        )
      }
    }

    void setup()

    return () => {
      disposed = true
      if (stableTimer) clearTimeout(stableTimer)
      resizeObserver?.disconnect()
      setGoogleCredentialHandler(null)
    }
  }, [])

  const isBusy = !isReady || disabled

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: GOOGLE_SIGN_IN_SLOT_HEIGHT_PX }}
      aria-busy={isBusy}
    >
      <div
        ref={containerRef}
        className={cn(
          "w-full transition-opacity duration-200 ease-out",
          isReady ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {!isReady && (
        <div
          className="absolute inset-0 border border-slate-200 bg-slate-50 motion-safe:animate-pulse"
          aria-hidden="true"
        />
      )}

      {disabled && (
        <div
          className="absolute inset-0 z-10 cursor-wait bg-white/60"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
