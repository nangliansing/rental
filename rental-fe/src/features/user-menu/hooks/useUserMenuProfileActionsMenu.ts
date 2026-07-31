import { useCallback, useEffect, useId, useRef, useState } from "react"

export function useUserMenuProfileActionsMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuId = useId()

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((current) => !current)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (!(target instanceof Node)) return
      if (menuRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return

      close()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        close()
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [close, isOpen])

  return {
    isOpen,
    menuId,
    menuRef,
    triggerRef,
    open,
    close,
    toggle,
  }
}
