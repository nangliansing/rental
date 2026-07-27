import { useCallback, useRef, useState, type ReactNode, type RefObject } from "react"
import type React from "react"

import { cn } from "@/lib/utils"

import {
  clampDraggableBottomDrawerOffset,
  DRAGGABLE_BOTTOM_DRAWER_SNAP_HEIGHT_CLASS,
  normalizeDraggableBottomDrawerSnap,
  resolveDraggableBottomDrawerSnap,
  shouldHideDraggableBottomDrawerContent,
  type DraggableBottomDrawerSnap,
} from "./draggable-bottom-drawer.utils"

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
  header: (dragHandle: DraggableBottomDrawerDragHandleProps) => ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  contentRef?: RefObject<HTMLDivElement | null>
  testId?: string
  hideContentWhenPeek?: boolean
  ariaLabel?: string
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

export function DraggableBottomDrawer({
  snap,
  onSnapChange,
  header,
  children,
  className,
  contentClassName,
  contentRef,
  testId,
  hideContentWhenPeek = true,
  ariaLabel = "Draggable panel",
}: DraggableBottomDrawerProps) {
  const normalizedSnap = normalizeDraggableBottomDrawerSnap(snap)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startYRef = useRef<number | null>(null)
  const dragOffsetRef = useRef(0)
  const captureTargetRef = useRef<HTMLDivElement | null>(null)
  const activePointerIdRef = useRef<number | null>(null)

  const resetPointerGesture = useCallback(() => {
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
    dragOffsetRef.current = 0
    setIsDragging(false)
    setDragY(0)
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return

      startYRef.current = event.clientY
      dragOffsetRef.current = 0
      captureTargetRef.current = event.currentTarget
      activePointerIdRef.current = event.pointerId
      setIsDragging(true)
      setDragY(0)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (startYRef.current === null) return

      const distance = event.clientY - startYRef.current
      const nextOffset = clampDraggableBottomDrawerOffset(normalizedSnap, distance)

      dragOffsetRef.current = nextOffset
      setDragY(nextOffset)
    },
    [normalizedSnap],
  )

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return

      const nextSnap = resolveDraggableBottomDrawerSnap(
        normalizedSnap,
        dragOffsetRef.current,
      )

      if (nextSnap !== normalizedSnap) {
        onSnapChange(nextSnap)
      }

      resetPointerGesture()
    },
    [normalizedSnap, onSnapChange, resetPointerGesture],
  )

  const dragHandleProps: DraggableBottomDrawerDragHandleProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerEnd,
    onPointerCancel: handlePointerEnd,
  }

  const shouldHideContent = shouldHideDraggableBottomDrawerContent(
    normalizedSnap,
    hideContentWhenPeek,
  )

  return (
    <aside
      data-testid={testId}
      aria-label={ariaLabel}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 overflow-hidden rounded-t-2xl bg-white text-slate-950 shadow-2xl lg:hidden",
        DRAGGABLE_BOTTOM_DRAWER_SNAP_HEIGHT_CLASS[normalizedSnap],
        !isDragging && "transition-[height,transform] duration-200 ease-out",
        className,
      )}
      style={{ transform: `translateY(${dragY}px)` }}
    >
      {header(dragHandleProps)}

      {!shouldHideContent && (
        <div
          ref={contentRef}
          className={cn("overflow-y-auto", contentClassName)}
        >
          {children}
        </div>
      )}
    </aside>
  )
}
