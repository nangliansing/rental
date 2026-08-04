import { MOBILE_NAV_BAR_HEIGHT_PX } from "./mobileNavLayout"

export type DraggableBottomDrawerSnap = "peek" | "half" | "full"

export const DRAGGABLE_BOTTOM_DRAWER_SNAPS = [
  "peek",
  "half",
  "full",
] as const satisfies readonly DraggableBottomDrawerSnap[]

/** Visible peek strip matches legacy `h-32`. */
export const DRAGGABLE_BOTTOM_DRAWER_PEEK_VISIBLE_PX = 128
export const DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_RATIO = 0.9
export const DRAGGABLE_BOTTOM_DRAWER_HALF_VISIBLE_RATIO = 0.5
export const DRAGGABLE_BOTTOM_DRAWER_DEFAULT_VIEWPORT_HEIGHT = 800

/** px/ms — fast fling threshold (~500 px/s). */
export const DRAG_FLING_VELOCITY_PX_PER_MS = 0.5
/** Ignore fling detection on very short gestures. */
export const DRAG_FLING_MIN_GESTURE_MS = 80
/** Prefer the current snap unless another stop is clearly closer. */
export const DRAG_SNAP_STICKY_BIAS_PX = 48
/** Soft resistance beyond peek/full while dragging. */
export const DRAG_RUBBER_BAND_FACTOR = 0.35
/** Minimum movement before deciding sheet vs content scroll. */
export const DRAG_CONTENT_HANDOFF_THRESHOLD_PX = 4
/** Treat the scroll container as top-aligned within this tolerance. */
export const DRAG_CONTENT_SCROLL_TOP_TOLERANCE_PX = 1

export const DRAGGABLE_BOTTOM_DRAWER_SETTLE_TRANSITION =
  "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)"

export const DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_CLASS = "h-[90dvh]"

/** Matches `AppNavigation` mobile tab bar height (`h-16`). */
export const DRAGGABLE_BOTTOM_DRAWER_MOBILE_NAV_HEIGHT_PX =
  MOBILE_NAV_BAR_HEIGHT_PX

export type DraggableBottomDrawerMetrics = {
  shellHeight: number
  snapOffsets: Record<DraggableBottomDrawerSnap, number>
  scrollEndSpacerPx: Record<DraggableBottomDrawerSnap, number>
}

export function getViewportHeightForDrawer(): number {
  if (typeof window === "undefined") {
    return DRAGGABLE_BOTTOM_DRAWER_DEFAULT_VIEWPORT_HEIGHT
  }

  return (
    window.visualViewport?.height ??
    window.innerHeight ??
    DRAGGABLE_BOTTOM_DRAWER_DEFAULT_VIEWPORT_HEIGHT
  )
}

export function getDraggableBottomDrawerMetrics(
  viewportHeight = getViewportHeightForDrawer(),
): DraggableBottomDrawerMetrics {
  const safeViewportHeight = Math.max(
    viewportHeight,
    DRAGGABLE_BOTTOM_DRAWER_PEEK_VISIBLE_PX,
  )
  const shellHeight = Math.round(
    safeViewportHeight * DRAGGABLE_BOTTOM_DRAWER_SHELL_HEIGHT_RATIO,
  )
  const halfVisible = Math.round(
    safeViewportHeight * DRAGGABLE_BOTTOM_DRAWER_HALF_VISIBLE_RATIO,
  )
  const snapOffsets = {
    full: 0,
    half: Math.max(0, shellHeight - halfVisible),
    peek: Math.max(0, shellHeight - DRAGGABLE_BOTTOM_DRAWER_PEEK_VISIBLE_PX),
  }
  const navClearance = DRAGGABLE_BOTTOM_DRAWER_MOBILE_NAV_HEIGHT_PX

  return {
    shellHeight,
    snapOffsets,
    scrollEndSpacerPx: {
      full: navClearance,
      half: snapOffsets.half + navClearance,
      peek: snapOffsets.peek + navClearance,
    },
  }
}

export function areDraggableBottomDrawerMetricsEqual(
  left: DraggableBottomDrawerMetrics,
  right: DraggableBottomDrawerMetrics,
): boolean {
  return (
    left.shellHeight === right.shellHeight &&
    left.snapOffsets.full === right.snapOffsets.full &&
    left.snapOffsets.half === right.snapOffsets.half &&
    left.snapOffsets.peek === right.snapOffsets.peek
  )
}

/** O(1) lookup — values are precomputed in {@link getDraggableBottomDrawerMetrics}. */
export function getDraggableBottomDrawerScrollEndSpacerPx(
  snap: DraggableBottomDrawerSnap,
  metrics: DraggableBottomDrawerMetrics,
): number {
  return metrics.scrollEndSpacerPx[snap]
}

export function clampDraggableBottomDrawerTranslateY(
  translateY: number,
  metrics: DraggableBottomDrawerMetrics,
): number {
  const minY = metrics.snapOffsets.full
  const maxY = metrics.snapOffsets.peek

  return Math.max(minY, Math.min(translateY, maxY))
}

export function applyDraggableBottomDrawerRubberBand(
  translateY: number,
  metrics: DraggableBottomDrawerMetrics,
  factor = DRAG_RUBBER_BAND_FACTOR,
): number {
  const minY = metrics.snapOffsets.full
  const maxY = metrics.snapOffsets.peek

  if (translateY < minY) {
    return minY - (minY - translateY) * factor
  }

  if (translateY > maxY) {
    return maxY + (translateY - maxY) * factor
  }

  return translateY
}

export function getNextDraggableBottomDrawerSnap(
  snap: DraggableBottomDrawerSnap,
  direction: "up" | "down",
): DraggableBottomDrawerSnap {
  const currentIndex = DRAGGABLE_BOTTOM_DRAWER_SNAPS.indexOf(snap)
  const safeIndex = currentIndex === -1 ? 1 : currentIndex

  if (direction === "up") {
    return DRAGGABLE_BOTTOM_DRAWER_SNAPS[
      Math.min(safeIndex + 1, DRAGGABLE_BOTTOM_DRAWER_SNAPS.length - 1)
    ]
  }

  return DRAGGABLE_BOTTOM_DRAWER_SNAPS[Math.max(safeIndex - 1, 0)]
}

export function resolveClosestDraggableBottomDrawerSnap(
  translateY: number,
  metrics: DraggableBottomDrawerMetrics,
  currentSnap?: DraggableBottomDrawerSnap,
  stickyBiasPx = currentSnap ? DRAG_SNAP_STICKY_BIAS_PX : 0,
): DraggableBottomDrawerSnap {
  let closestSnap: DraggableBottomDrawerSnap = DRAGGABLE_BOTTOM_DRAWER_SNAPS[0]
  let closestDistance = Number.POSITIVE_INFINITY

  for (const snap of DRAGGABLE_BOTTOM_DRAWER_SNAPS) {
    const distance =
      Math.abs(translateY - metrics.snapOffsets[snap]) -
      (snap === currentSnap ? stickyBiasPx : 0)

    if (distance < closestDistance) {
      closestDistance = distance
      closestSnap = snap
    }
  }

  return closestSnap
}

export function resolveSettledDraggableBottomDrawerSnap(
  currentSnap: DraggableBottomDrawerSnap,
  translateY: number,
  velocityY: number,
  metrics: DraggableBottomDrawerMetrics,
): DraggableBottomDrawerSnap {
  const clampedTranslateY = clampDraggableBottomDrawerTranslateY(
    translateY,
    metrics,
  )

  if (Math.abs(velocityY) >= DRAG_FLING_VELOCITY_PX_PER_MS) {
    if (velocityY < 0) {
      return getNextDraggableBottomDrawerSnap(currentSnap, "up")
    }

    return getNextDraggableBottomDrawerSnap(currentSnap, "down")
  }

  return resolveClosestDraggableBottomDrawerSnap(
    clampedTranslateY,
    metrics,
    currentSnap,
  )
}

export function isDraggableBottomDrawerSnap(
  value: string,
): value is DraggableBottomDrawerSnap {
  return DRAGGABLE_BOTTOM_DRAWER_SNAPS.includes(
    value as DraggableBottomDrawerSnap,
  )
}

export function normalizeDraggableBottomDrawerSnap(
  snap: DraggableBottomDrawerSnap,
  fallback: DraggableBottomDrawerSnap = "half",
): DraggableBottomDrawerSnap {
  return isDraggableBottomDrawerSnap(snap) ? snap : fallback
}

export function shouldHideDraggableBottomDrawerContent(
  snap: DraggableBottomDrawerSnap,
  hideContentWhenPeek: boolean,
): boolean {
  return hideContentWhenPeek && snap === "peek"
}

export function computeDraggableBottomDrawerReleaseVelocity(
  startY: number,
  endY: number,
  gestureDurationMs: number,
): number {
  if (gestureDurationMs < DRAG_FLING_MIN_GESTURE_MS) {
    return 0
  }

  return (endY - startY) / gestureDurationMs
}

export function isDraggableBottomDrawerScrollAtTop(
  scrollTop: number,
  tolerancePx = DRAG_CONTENT_SCROLL_TOP_TOLERANCE_PX,
): boolean {
  return scrollTop <= tolerancePx
}

/**
 * Google Maps-style nested scroll handoff:
 * - expand the sheet before scrolling up while not fully open
 * - collapse the sheet on pull-down only when the list is scrolled to top
 * - otherwise let the scroll container consume the gesture
 */
export function shouldDraggableBottomDrawerHandleContentDrag(
  snap: DraggableBottomDrawerSnap,
  scrollTop: number,
  deltaY: number,
  thresholdPx = DRAG_CONTENT_HANDOFF_THRESHOLD_PX,
): boolean {
  if (Math.abs(deltaY) < thresholdPx) {
    return false
  }

  const draggingDown = deltaY > 0
  const draggingUp = deltaY < 0
  const scrollAtTop = isDraggableBottomDrawerScrollAtTop(scrollTop)

  if (snap !== "full") {
    if (draggingUp) {
      return true
    }

    return draggingDown && scrollAtTop
  }

  return draggingDown && scrollAtTop
}

export function formatDraggableBottomDrawerTransform(translateY: number): string {
  return `translate3d(0, ${translateY}px, 0)`
}
