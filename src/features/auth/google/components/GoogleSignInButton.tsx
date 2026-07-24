import { useEffect, useRef, useState } from "react"

import {
  initializeGoogleIdentity,
  setGoogleCredentialHandler,
} from "../lib/googleIdentity"

type GoogleSignInButtonProps = {
  disabled?: boolean
  onCredential: (credential: string) => void
  onError: (message: string) => void
}

const GOOGLE_BUTTON_MAX_WIDTH = 400

export function GoogleSignInButton({
  disabled = false,
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onCredentialRef = useRef(onCredential)
  const onErrorRef = useRef(onError)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    onCredentialRef.current = onCredential
    onErrorRef.current = onError
  }, [onCredential, onError])

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ""
    let disposed = false
    let resizeObserver: ResizeObserver | null = null
    let renderedWidth = 0

    const setup = async () => {
      try {
        const api = await initializeGoogleIdentity(clientId)

        if (disposed || !containerRef.current) return

        setGoogleCredentialHandler((response) => {
          const credential = response.credential?.trim()

          if (!credential) {
            onErrorRef.current("Google sign-in did not return a credential.")
            return
          }

          onCredentialRef.current(credential)
        })

        const renderButton = () => {
          const container = containerRef.current

          if (!container) return

          const width = Math.min(
            GOOGLE_BUTTON_MAX_WIDTH,
            Math.max(1, Math.floor(container.getBoundingClientRect().width)),
          )

          if (width === renderedWidth) return

          renderedWidth = width
          container.replaceChildren()
          api.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width,
          })
          setIsLoading(false)
        }

        renderButton()
        resizeObserver = new ResizeObserver(renderButton)
        resizeObserver.observe(containerRef.current)
      } catch {
        if (disposed) return

        setIsLoading(false)
        onErrorRef.current(
          "Google sign-in is unavailable right now. Please try again.",
        )
      }
    }

    void setup()

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      setGoogleCredentialHandler(null)
    }
  }, [])

  return (
    <div
      className="relative min-h-11 w-full"
      aria-busy={isLoading || disabled}
    >
      <div ref={containerRef} className="w-full" />

      {isLoading && (
        <div className="absolute inset-0 h-11 animate-pulse border border-slate-200 bg-slate-50" />
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

