import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react"

/** Max movement before a gesture counts as map pan instead of overlay tap. */
export const MAP_OVERLAY_TAP_SLOP_PX = 10

const MAP_OVERLAY_TAP_SLOP_SQ = MAP_OVERLAY_TAP_SLOP_PX * MAP_OVERLAY_TAP_SLOP_PX

type ActiveGesture = {
  pointerId: number
  startX: number
  startY: number
}

export function useMapOverlayTapSelect(onSelect: () => void) {
  const gestureRef = useRef<ActiveGesture | null>(null)
  const isDragRef = useRef(false)
  const suppressClickRef = useRef(false)
  const onSelectRef = useRef(onSelect)
  const clearWindowListenersRef = useRef<(() => void) | null>(null)

  onSelectRef.current = onSelect

  useEffect(() => {
    return () => {
      clearWindowListenersRef.current?.()
      clearWindowListenersRef.current = null
    }
  }, [])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    clearWindowListenersRef.current?.()
    clearWindowListenersRef.current = null

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    isDragRef.current = false

    const onMove = (moveEvent: PointerEvent) => {
      if (isDragRef.current) {
        return
      }

      const active = gestureRef.current
      if (!active || moveEvent.pointerId !== active.pointerId) {
        return
      }

      const dx = moveEvent.clientX - active.startX
      const dy = moveEvent.clientY - active.startY

      if (dx * dx + dy * dy > MAP_OVERLAY_TAP_SLOP_SQ) {
        isDragRef.current = true
      }
    }

    const onEnd = (endEvent: PointerEvent) => {
      const active = gestureRef.current
      gestureRef.current = null
      clearWindowListenersRef.current?.()
      clearWindowListenersRef.current = null

      if (!active || active.pointerId !== endEvent.pointerId) {
        return
      }

      if (!isDragRef.current) {
        suppressClickRef.current = true
        endEvent.stopPropagation()
        endEvent.preventDefault()
        onSelectRef.current()
      }

      isDragRef.current = false
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("pointerup", onEnd)
    window.addEventListener("pointercancel", onEnd)

    clearWindowListenersRef.current = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onEnd)
      window.removeEventListener("pointercancel", onEnd)
    }
  }, [])

  const onClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!suppressClickRef.current) {
      return
    }

    suppressClickRef.current = false
    event.stopPropagation()
    event.preventDefault()
  }, [])

  return { onPointerDown, onClick }
}
