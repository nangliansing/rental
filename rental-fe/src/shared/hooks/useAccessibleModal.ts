import { useCallback, useEffect, useRef } from "react"
import type { MouseEvent as ReactMouseEvent, RefObject } from "react"

import {
  ensureFocusTracking,
  getFocusRestoreTarget,
} from "@/shared/utils/focusHistory"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

const modalStack: symbol[] = []
let bodyScrollLockCount = 0
let previousBodyOverflow = ""
function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
  }

  bodyScrollLockCount += 1
}

function unlockBodyScroll() {
  bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1)

  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow
  }
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => {
    return !element.hidden && element.getAttribute("aria-hidden") !== "true"
  })
}

type UseAccessibleModalOptions = {
  isOpen: boolean
  onClose: () => void
  closeOnEscape?: boolean
  lockScroll?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
}

export function useAccessibleModal<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  closeOnEscape = true,
  lockScroll = true,
  initialFocusRef,
}: UseAccessibleModalOptions) {
  ensureFocusTracking()
  const containerElementRef = useRef<T | null>(null)
  const onCloseRef = useRef(onClose)
  const tokenRef = useRef(Symbol("modal"))
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  const containerRef = useCallback((element: T | null) => {
    if (element && !containerElementRef.current) {
      const restoreTarget = getFocusRestoreTarget(element)

      if (restoreTarget && !element.contains(restoreTarget)) {
        restoreFocusRef.current = restoreTarget
      }
    }

    containerElementRef.current = element
  }, [])

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return undefined

    const token = tokenRef.current
    modalStack.push(token)
    if (lockScroll) lockBodyScroll()

    queueMicrotask(() => {
      if (modalStack.at(-1) !== token) return

      const focusTarget =
        initialFocusRef?.current ??
        (containerElementRef.current
          ? getFocusableElements(containerElementRef.current)[0]
          : null)
      focusTarget?.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== token) return

      if (event.key === "Escape") {
        event.stopImmediatePropagation()
        if (closeOnEscape) onCloseRef.current()
        return
      }

      if (event.key !== "Tab" || !containerElementRef.current) return

      const focusableElements = getFocusableElements(containerElementRef.current)
      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)
      if (!firstElement || !lastElement) {
        event.preventDefault()
        containerElementRef.current.focus()
        return
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      const tokenIndex = modalStack.lastIndexOf(token)
      if (tokenIndex >= 0) modalStack.splice(tokenIndex, 1)
      if (lockScroll) unlockBodyScroll()

      const restoreTarget = restoreFocusRef.current
      if (restoreTarget && document.contains(restoreTarget)) {
        restoreTarget.focus()
      }
    }
  }, [closeOnEscape, initialFocusRef, isOpen, lockScroll])

  const onBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (
        isOpen &&
        event.target === event.currentTarget &&
        modalStack.at(-1) === tokenRef.current
      ) {
        onCloseRef.current()
      }
    },
    [isOpen],
  )

  return { containerRef, onBackdropClick }
}
