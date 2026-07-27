import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export function useNeighbourhoodExploreDialog() {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const shouldRestoreFocusRef = useRef(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen || !shouldRestoreFocusRef.current) {
      return
    }

    shouldRestoreFocusRef.current = false
    triggerRef.current?.focus()
  }, [isOpen])

  const open = useCallback((trigger?: HTMLButtonElement | null) => {
    if (trigger) {
      triggerRef.current = trigger
    }

    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    shouldRestoreFocusRef.current = true
    setIsOpen(false)
  }, [])

  return useMemo(
    () => ({
      isOpen,
      open,
      close,
    }),
    [isOpen, open, close],
  )
}
