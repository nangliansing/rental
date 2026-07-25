import { useCallback, useEffect, useRef, useState } from "react"

const DEFAULT_CLOSE_DELAY_MS = 220

export function useFloatingActionPanel(
  closeDelayMs = DEFAULT_CLOSE_DELAY_MS,
) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const closeTimeoutRef = useRef<number | null>(null)

  const openPanel = useCallback(() => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }

    setIsOpen(true)
    window.requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  const closePanel = useCallback(() => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current)
    }

    setIsVisible(false)

    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false)
      closeTimeoutRef.current = null
    }, closeDelayMs)
  }, [closeDelayMs])

  const togglePanel = useCallback(() => {
    if (isVisible) {
      closePanel()
      return
    }

    openPanel()
  }, [closePanel, isVisible, openPanel])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  return {
    isOpen,
    isVisible,
    openPanel,
    closePanel,
    togglePanel,
  }
}
