import {
  Children,
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type MutableRefObject,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/useMediaQuery"

import { normalizeRotatingContentDurationMs } from "./RotatingContent.utils"

/** Slide/fade duration in ms — kept in sync with `--rotating-content-ms`. */
export const ROTATING_CONTENT_TRANSITION_MS = 900

const ENTER_ANIMATION_NAME = "rotating-content-enter"

const TRANSITION_STYLE = {
  ["--rotating-content-ms" as string]: `${ROTATING_CONTENT_TRANSITION_MS}ms`,
} satisfies CSSProperties

export type RotatingContentProps = {
  children?: ReactNode
  /**
   * How long each child stays fully visible before the next slides up.
   * Defaults to 4000ms.
   * `0` or negative values disable rotation (first child only).
   */
  durationMs?: number
  /**
   * When false, rotation pauses on the current item and all timers stop.
   * When true again, the dwell timer restarts from that same item.
   * Defaults to true.
   */
  active?: boolean
  className?: string
  "aria-label"?: string
}

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0
  if (!Number.isFinite(index)) return 0
  return Math.min(Math.max(Math.trunc(index), 0), length - 1)
}

function clearTimeoutRef(ref: MutableRefObject<number | null>) {
  if (ref.current == null) return
  window.clearTimeout(ref.current)
  ref.current = null
}

/** Tracks `document.visibilityState` only while `enabled` — no listener otherwise. */
function useDocumentVisible(enabled: boolean) {
  const [isVisible, setIsVisible] = useState(() =>
    typeof document === "undefined"
      ? true
      : document.visibilityState !== "hidden",
  )

  useEffect(() => {
    if (!enabled) return

    const sync = () => {
      setIsVisible(document.visibilityState !== "hidden")
    }

    sync()
    document.addEventListener("visibilitychange", sync)
    return () => {
      document.removeEventListener("visibilitychange", sync)
    }
  }, [enabled])

  return enabled ? isVisible : true
}

function isEnterAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
  if (event.target !== event.currentTarget) return false

  const nativeName = (
    event.nativeEvent as { animationName?: string } | undefined
  )?.animationName
  const animationName = event.animationName || nativeName || ""
  return !animationName || animationName === ENTER_ANIMATION_NAME
}

/**
 * Shows one child at a time. With multiple children, each dwells for `durationMs`,
 * then the next slides up from below while the previous fades away. After one full
 * round it stops on the first child.
 */
export function RotatingContent({
  children,
  durationMs,
  active = true,
  className,
  "aria-label": ariaLabel,
}: RotatingContentProps) {
  const items = Children.toArray(children)
  if (items.length === 0) return null

  return (
    <RotatingContentCycle
      // A changed child count is a new sequence. Remounting resets all cycle
      // state atomically without effect-driven state synchronization.
      key={items.length}
      items={items}
      dwellMs={normalizeRotatingContentDurationMs(durationMs)}
      active={active}
      className={className}
      aria-label={ariaLabel}
    />
  )
}

type RotatingContentCycleProps = {
  items: ReactNode[]
  dwellMs: number
  active: boolean
  className?: string
  "aria-label"?: string
}

function RotatingContentCycle({
  items,
  dwellMs,
  active,
  className,
  "aria-label": ariaLabel,
}: RotatingContentCycleProps) {
  const count = items.length
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const canRotate =
    active && count > 1 && dwellMs > 0 && !prefersReducedMotion

  const [activeIndex, setActiveIndex] = useState(0)
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null)
  const [hasCompletedRound, setHasCompletedRound] = useState(false)
  const [previousCanRotate, setPreviousCanRotate] = useState(canRotate)

  /** At most one timer is ever pending (dwell or transition teardown). */
  const timerRef = useRef<number | null>(null)

  if (previousCanRotate !== canRotate) {
    setPreviousCanRotate(canRotate)
    if (!canRotate && outgoingIndex != null) setOutgoingIndex(null)
  }

  const isDocumentVisible = useDocumentVisible(
    canRotate && !hasCompletedRound,
  )

  useEffect(() => {
    return () => clearTimeoutRef(timerRef)
  }, [])

  useEffect(() => {
    // Hard stop: drop timers and settle any in-flight slide immediately.
    if (!canRotate) {
      clearTimeoutRef(timerRef)
      return () => clearTimeoutRef(timerRef)
    }

    // Finish an in-flight transition (including the final return-to-first slide).
    if (outgoingIndex != null) {
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        setOutgoingIndex(null)
      }, ROTATING_CONTENT_TRANSITION_MS)
      return () => clearTimeoutRef(timerRef)
    }

    // Soft pause: keep the current item, start no new dwell.
    if (hasCompletedRound || !isDocumentVisible) {
      return () => clearTimeoutRef(timerRef)
    }

    const current = clampIndex(activeIndex, count)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null

      const isLast = current >= count - 1
      const next = isLast ? 0 : current + 1

      setOutgoingIndex(current)
      setActiveIndex(next)
      if (isLast) setHasCompletedRound(true)
    }, dwellMs)

    return () => clearTimeoutRef(timerRef)
  }, [
    activeIndex,
    canRotate,
    count,
    dwellMs,
    hasCompletedRound,
    isDocumentVisible,
    outgoingIndex,
  ])

  const safeIndex = clampIndex(activeIndex, count)
  const safeOutgoing =
    outgoingIndex == null ? null : clampIndex(outgoingIndex, count)
  const showTransition = safeOutgoing != null && safeOutgoing !== safeIndex

  const finishTransition = () => {
    clearTimeoutRef(timerRef)
    setOutgoingIndex(null)
  }

  const announceLive = canRotate || hasCompletedRound

  return (
    <div
      className={cn("relative min-w-0 overflow-hidden", className)}
      style={TRANSITION_STYLE}
      aria-label={ariaLabel}
    >
      {showTransition && (
        <div
          className="rotating-content-exit pointer-events-none absolute inset-x-0 top-0 z-0"
          aria-hidden="true"
        >
          {items[safeOutgoing]}
        </div>
      )}

      <div
        key={safeIndex}
        className={cn(
          "relative z-10",
          showTransition && "rotating-content-enter",
        )}
        aria-live={announceLive ? "polite" : undefined}
        aria-atomic={announceLive ? true : undefined}
        onAnimationEnd={
          showTransition
            ? (event) => {
                if (isEnterAnimationEnd(event)) finishTransition()
              }
            : undefined
        }
      >
        {items[safeIndex]}
      </div>
    </div>
  )
}
