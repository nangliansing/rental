import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react"
import type React from "react"

import { cn } from "@/lib/utils"

import {
  applyDraggableBottomDrawerRubberBand,
  areDraggableBottomDrawerMetricsEqual,
  clampDraggableBottomDrawerTranslateY,
  computeDraggableBottomDrawerReleaseVelocity,
  DRAGGABLE_BOTTOM_DRAWER_SETTLE_TRANSITION,
  DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_CLASS,
  formatDraggableBottomDrawerTransform,
  getDraggableBottomDrawerMetrics,
  getViewportHeightForDrawer,
  normalizeDraggableBottomDrawerSnap,
  resolveSettledDraggableBottomDrawerSnap,
  shouldDraggableBottomDrawerHandleContentDrag,
  shouldHideDraggableBottomDrawerContent,
  type DraggableBottomDrawerSnap,
} from "./draggable-bottom-drawer.utils"

function createDrawerMetrics() {
  return getDraggableBottomDrawerMetrics(getViewportHeightForDrawer())
}

export type { DraggableBottomDrawerSnap } from "./draggable-bottom-drawer.utils"

export type DraggableBottomDrawerDragHandleProps = {
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void
}

type DraggableBottomDrawerProps = {
  snap: DraggableBottomDrawerSnap
  onSnapChange: (snap: DraggableBottomDrawerSnap) => void
  onSnapSettled?: () => void
  header: (dragHandle: DraggableBottomDrawerDragHandleProps) => ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  contentRef?: RefObject<HTMLDivElement | null>
  testId?: string
  hideContentWhenPeek?: boolean
  allowContentDrag?: boolean
  ariaLabel?: string
}

type ContentGestureState = {
  pointerId: number
  startY: number
  startScrollTop: number
  mode: "undecided" | "sheet"
}

export function preventDraggableBottomDrawerPropagation(
  event: React.PointerEvent<HTMLElement>,
) {
  event.stopPropagation()
}

type DraggableBottomDrawerDragRegionProps = {
  dragHandle: DraggableBottomDrawerDragHandleProps
  className?: string
  children?: ReactNode
}

export function DraggableBottomDrawerDragRegion({
  dragHandle,
  className,
  children,
}: DraggableBottomDrawerDragRegionProps) {
  return (
    <div
      className={cn(
        "cursor-grab touch-none active:cursor-grabbing",
        className,
      )}
      {...dragHandle}
    >
      <div
        className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300"
        aria-hidden="true"
      />
      {children}
    </div>
  )
}

function applyDrawerTranslateY(
  element: HTMLElement | null,
  translateY: number,
) {
  if (!element) return

  element.style.transform = formatDraggableBottomDrawerTransform(translateY)
}

function assignRef<T>(ref: RefObject<T | null> | undefined, value: T | null) {
  if (ref) {
    ref.current = value
  }
}

function hasActiveTransformTransition(element: HTMLElement) {
  const { transitionDuration, transitionProperty } = getComputedStyle(element)

  return (
    transitionProperty.includes("transform") &&
    transitionDuration !== "0s" &&
    transitionDuration.split(",").every((duration) => duration.trim() !== "0s")
  )
}

export function DraggableBottomDrawer({
  snap,
  onSnapChange,
  onSnapSettled,
  header,
  children,
  className,
  contentClassName,
  contentRef,
  testId,
  hideContentWhenPeek = true,
  allowContentDrag = true,
  ariaLabel = "Draggable panel",
}: DraggableBottomDrawerProps) {
  const normalizedSnap = normalizeDraggableBottomDrawerSnap(snap)
  const isContentHiddenAtPeek = shouldHideDraggableBottomDrawerContent(
    normalizedSnap,
    hideContentWhenPeek,
  )
  const asideRef = useRef<HTMLElement>(null)
  const contentElementRef = useRef<HTMLDivElement | null>(null)
  const [metrics, setMetrics] = useState(createDrawerMetrics)
  const metricsRef = useRef(metrics)
  metricsRef.current = metrics
  const isDraggingRef = useRef(false)
  const translateYRef = useRef(metrics.snapOffsets[normalizedSnap])
  const pendingTranslateYRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const startTranslateYRef = useRef(0)
  const gestureStartTimeRef = useRef(0)
  const captureTargetRef = useRef<HTMLDivElement | null>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const dragFrameRef = useRef<number | null>(null)
  const contentGestureRef = useRef<ContentGestureState | null>(null)
  const onSnapSettledRef = useRef(onSnapSettled)
  onSnapSettledRef.current = onSnapSettled
  const scrollEndSpacerPx = metrics.scrollEndSpacerPx[normalizedSnap]

  const notifySnapSettled = useCallback(() => {
    if (!isDraggingRef.current) {
      onSnapSettledRef.current?.()
    }
  }, [])

  const setContentNode = useCallback(
    (node: HTMLDivElement | null) => {
      contentElementRef.current = node
      assignRef(contentRef, node)
    },
    [contentRef],
  )

  const setDrawerTransitionEnabled = useCallback((enabled: boolean) => {
    const element = asideRef.current
    if (!element) return

    element.style.transition = enabled
      ? DRAGGABLE_BOTTOM_DRAWER_SETTLE_TRANSITION
      : "none"
  }, [])

  const applyTranslateY = useCallback((translateY: number) => {
    translateYRef.current = translateY
    applyDrawerTranslateY(asideRef.current, translateY)
  }, [])

  const flushPendingTranslateY = useCallback(() => {
    if (pendingTranslateYRef.current == null) return

    applyTranslateY(pendingTranslateYRef.current)
    pendingTranslateYRef.current = null
  }, [applyTranslateY])

  const scheduleTranslateY = useCallback(
    (translateY: number) => {
      pendingTranslateYRef.current = translateY

      if (dragFrameRef.current != null) return

      dragFrameRef.current = requestAnimationFrame(() => {
        dragFrameRef.current = null
        flushPendingTranslateY()
      })
    },
    [flushPendingTranslateY],
  )

  const syncToSnap = useCallback(
    (targetSnap: DraggableBottomDrawerSnap) => {
      applyTranslateY(metricsRef.current.snapOffsets[targetSnap])
    },
    [applyTranslateY],
  )

  const normalizedSnapRef = useRef(normalizedSnap)
  normalizedSnapRef.current = normalizedSnap

  const refreshDrawerMetrics = useCallback(() => {
    const nextMetrics = getDraggableBottomDrawerMetrics(getViewportHeightForDrawer())
    metricsRef.current = nextMetrics
    setMetrics((current) =>
      areDraggableBottomDrawerMetricsEqual(current, nextMetrics)
        ? current
        : nextMetrics,
    )

    if (!isDraggingRef.current) {
      syncToSnap(normalizedSnapRef.current)
    }
  }, [syncToSnap])

  useLayoutEffect(() => {
    refreshDrawerMetrics()
  }, [refreshDrawerMetrics])

  useLayoutEffect(() => {
    if (isDraggingRef.current) {
      return
    }

    syncToSnap(normalizedSnap)

    const element = asideRef.current
    if (!element || !onSnapSettledRef.current) {
      return
    }

    if (!hasActiveTransformTransition(element)) {
      notifySnapSettled()
    }
  }, [normalizedSnap, notifySnapSettled, syncToSnap])

  useEffect(() => {
    const element = asideRef.current
    if (!element) {
      return
    }

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== element || event.propertyName !== "transform") {
        return
      }

      notifySnapSettled()
    }

    element.addEventListener("transitionend", handleTransitionEnd)

    return () => {
      element.removeEventListener("transitionend", handleTransitionEnd)
    }
  }, [notifySnapSettled])

  useEffect(() => {
    const visualViewport = window.visualViewport

    visualViewport?.addEventListener("resize", refreshDrawerMetrics)
    window.addEventListener("resize", refreshDrawerMetrics)

    return () => {
      visualViewport?.removeEventListener("resize", refreshDrawerMetrics)
      window.removeEventListener("resize", refreshDrawerMetrics)
    }
  }, [refreshDrawerMetrics])

  useEffect(() => {
    return () => {
      if (dragFrameRef.current != null) {
        cancelAnimationFrame(dragFrameRef.current)
      }
    }
  }, [])

  const releasePointerCapture = useCallback(() => {
    const captureTarget = captureTargetRef.current
    const pointerId = activePointerIdRef.current

    if (
      captureTarget &&
      pointerId != null &&
      captureTarget.hasPointerCapture(pointerId)
    ) {
      captureTarget.releasePointerCapture(pointerId)
    }

    captureTargetRef.current = null
    activePointerIdRef.current = null
    startYRef.current = null
  }, [])

  const settleDrawerAtTranslateY = useCallback(
    (translateY: number, velocityY: number) => {
      const metrics = metricsRef.current
      const settledSnap = resolveSettledDraggableBottomDrawerSnap(
        normalizedSnap,
        translateY,
        velocityY,
        metrics,
      )
      const settledTranslateY = metrics.snapOffsets[settledSnap]

      flushPendingTranslateY()
      setDrawerTransitionEnabled(true)
      applyTranslateY(settledTranslateY)

      if (settledSnap !== normalizedSnap) {
        onSnapChange(settledSnap)
      }
    },
    [
      applyTranslateY,
      flushPendingTranslateY,
      normalizedSnap,
      onSnapChange,
      setDrawerTransitionEnabled,
    ],
  )

  const beginSheetDrag = useCallback(
    (
      event: React.PointerEvent<HTMLDivElement>,
      startY = event.clientY,
    ) => {
      if (dragFrameRef.current != null) {
        cancelAnimationFrame(dragFrameRef.current)
        dragFrameRef.current = null
      }

      pendingTranslateYRef.current = null
      startYRef.current = startY
      startTranslateYRef.current = translateYRef.current
      gestureStartTimeRef.current = performance.now()
      captureTargetRef.current = event.currentTarget
      activePointerIdRef.current = event.pointerId
      isDraggingRef.current = true
      setDrawerTransitionEnabled(false)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [setDrawerTransitionEnabled],
  )

  const updateSheetDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (startYRef.current === null) return

      const distance = event.clientY - startYRef.current
      const rawTranslateY = startTranslateYRef.current + distance
      const nextTranslateY = applyDraggableBottomDrawerRubberBand(
        rawTranslateY,
        metricsRef.current,
      )

      scheduleTranslateY(nextTranslateY)
    },
    [scheduleTranslateY],
  )

  const finishSheetDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return

      const currentTranslateY = clampDraggableBottomDrawerTranslateY(
        translateYRef.current,
        metricsRef.current,
      )

      const releaseVelocity = computeDraggableBottomDrawerReleaseVelocity(
        startYRef.current ?? event.clientY,
        event.clientY,
        performance.now() - gestureStartTimeRef.current,
      )

      isDraggingRef.current = false
      releasePointerCapture()
      settleDrawerAtTranslateY(currentTranslateY, releaseVelocity)
    },
    [releasePointerCapture, settleDrawerAtTranslateY],
  )

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return

      contentGestureRef.current = null
      beginSheetDrag(event)
    },
    [beginSheetDrag],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return

      updateSheetDrag(event)
    },
    [updateSheetDrag],
  )

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      contentGestureRef.current = null

      if (!isDraggingRef.current) return

      finishSheetDrag(event)
    },
    [finishSheetDrag],
  )

  const handleContentPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!allowContentDrag || event.button !== 0 || isContentHiddenAtPeek) {
        return
      }

      contentGestureRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startScrollTop: contentElementRef.current?.scrollTop ?? 0,
        mode: "undecided",
      }
    },
    [allowContentDrag, isContentHiddenAtPeek],
  )

  const handleContentPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const gesture = contentGestureRef.current

      if (!gesture || gesture.pointerId !== event.pointerId) {
        return
      }

      if (gesture.mode === "undecided") {
        const deltaY = event.clientY - gesture.startY
        const scrollTop = contentElementRef.current?.scrollTop ?? gesture.startScrollTop

        if (
          !shouldDraggableBottomDrawerHandleContentDrag(
            normalizedSnap,
            scrollTop,
            deltaY,
          )
        ) {
          contentGestureRef.current = null
          return
        }

        gesture.mode = "sheet"
        beginSheetDrag(event, gesture.startY)
      }

      if (!isDraggingRef.current) return

      updateSheetDrag(event)
      event.preventDefault()
    },
    [beginSheetDrag, normalizedSnap, updateSheetDrag],
  )

  const handleContentPointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const gesture = contentGestureRef.current

      if (!gesture || gesture.pointerId !== event.pointerId) {
        return
      }

      contentGestureRef.current = null

      if (gesture.mode === "sheet" && isDraggingRef.current) {
        finishSheetDrag(event)
      }
    },
    [finishSheetDrag],
  )

  const dragHandleProps: DraggableBottomDrawerDragHandleProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
  }

  return (
    <aside
      ref={asideRef}
      data-testid={testId}
      data-snap={normalizedSnap}
      aria-label={ariaLabel}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 box-border flex flex-col overflow-hidden rounded-t-2xl bg-white text-slate-950 shadow-2xl will-change-transform lg:hidden",
        DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_CLASS,
        className,
      )}
    >
      {header(dragHandleProps)}

      <div
        ref={setContentNode}
        aria-hidden={isContentHiddenAtPeek}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
          isContentHiddenAtPeek && "pointer-events-none invisible",
          contentClassName,
        )}
        onPointerDown={handleContentPointerDown}
        onPointerMove={handleContentPointerMove}
        onPointerUp={handleContentPointerEnd}
        onPointerCancel={handleContentPointerEnd}
      >
        {children}
        <div
          aria-hidden="true"
          data-testid="drawer-scroll-end-spacer"
          className="shrink-0"
          style={{ height: scrollEndSpacerPx }}
        />
      </div>
    </aside>
  )
}
