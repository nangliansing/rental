export type DraggableBottomDrawerSnap = "peek" | "half" | "full"

export const DRAGGABLE_BOTTOM_DRAWER_SNAPS = [
  "peek",
  "half",
  "full",
] as const satisfies readonly DraggableBottomDrawerSnap[]

export const DRAG_SNAP_THRESHOLD_PX = 60
export const MAX_DRAG_OFFSET_PX = 260

export const DRAGGABLE_BOTTOM_DRAWER_SNAP_HEIGHT_CLASS: Record<
  DraggableBottomDrawerSnap,
  string
> = {
  peek: "h-32",
  half: "h-[50vh]",
  full: "h-[90vh]",
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

export function clampDraggableBottomDrawerOffset(
  snap: DraggableBottomDrawerSnap,
  distance: number,
  maxOffsetPx = MAX_DRAG_OFFSET_PX,
): number {
  if (snap === "peek") {
    return Math.min(0, Math.max(distance, -maxOffsetPx))
  }

  if (snap === "full") {
    return Math.max(0, Math.min(distance, maxOffsetPx))
  }

  return Math.max(-maxOffsetPx, Math.min(distance, maxOffsetPx))
}

export function resolveDraggableBottomDrawerSnap(
  snap: DraggableBottomDrawerSnap,
  dragOffsetPx: number,
  thresholdPx = DRAG_SNAP_THRESHOLD_PX,
): DraggableBottomDrawerSnap {
  if (dragOffsetPx < -thresholdPx) {
    return getNextDraggableBottomDrawerSnap(snap, "up")
  }

  if (dragOffsetPx > thresholdPx) {
    return getNextDraggableBottomDrawerSnap(snap, "down")
  }

  return snap
}

export function shouldHideDraggableBottomDrawerContent(
  snap: DraggableBottomDrawerSnap,
  hideContentWhenPeek: boolean,
): boolean {
  return hideContentWhenPeek && snap === "peek"
}
