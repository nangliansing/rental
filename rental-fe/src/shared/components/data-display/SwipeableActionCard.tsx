/* eslint-disable react-refresh/only-export-components -- This compound component intentionally exports its page marker and context hook together. */
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"
import { useInView } from "@/shared/hooks/useInView"
import { hasReactNodeContent } from "@/shared/utils/reactNode"

const PAGE_DISPLAY_NAME = "SwipeableActionCard.Page"
const HEADER_GUTTER_CLASS = "px-4"
/** Ignore small pointer jitter so taps still activate after a light touch. */
const TAP_SLOP_PX = 10
const TAP_SLOP_SQ = TAP_SLOP_PX * TAP_SLOP_PX
type SwipeableScrollAxisLock = "both" | "x" | "y"
const SCROLLER_TOUCH_ACTION: Record<SwipeableScrollAxisLock, string> = {
  both: "manipulation",
  x: "pan-x",
  y: "pan-y",
}
/**
 * Horizontal snap track: browser directional lock via touch-manipulation, then
 * commit to pan-x or pan-y after slop so both page scroll and carousel swipe work.
 */
const SCROLLER_CLASS =
  "mt-2 flex touch-manipulation snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"

type SwipeableActionCardContextValue = {
  isInView: boolean
  activePageIndex: number
}

const SwipeableActionCardContext =
  createContext<SwipeableActionCardContextValue | null>(null)

const SwipeableActionCardPageIndexContext = createContext(0)

/**
 * True when this page is the active swipe page and the card is in the viewport.
 * Safe to call outside a card (returns true so callers are not force-paused).
 */
export function useSwipeableActionCardPageActive(): boolean {
  const card = useContext(SwipeableActionCardContext)
  const pageIndex = useContext(SwipeableActionCardPageIndexContext)
  if (card == null) return true
  return card.isInView && pageIndex === card.activePageIndex
}

export type SwipeableActionCardPageProps = {
  title: ReactNode
  /** Optional muted text shown beside the title (e.g. "4.5 (30 reviews)"). */
  meta?: ReactNode
  children?: ReactNode
  className?: string
  /**
   * When true, the page is still swipeable but cannot activate the card
   * (`onClick` / keyboard). Chrome is muted while this page is active.
   */
  disabled?: boolean
}

type CollectedPage = {
  key: string
  title: ReactNode
  meta?: ReactNode
  content: ReactNode
  className?: string
  disabled: boolean
}

export type SwipeableActionCardProps = {
  children?: ReactNode
  className?: string
  /**
   * Called when the card surface is activated (tap / Enter / Space) with the
   * active page index. Nested links/buttons are ignored.
   */
  onClick?: (index: number) => void
  "aria-label"?: string
}

export function clampSwipeableActionCardIndex(index: number, length: number) {
  if (length <= 0) return 0
  if (!Number.isFinite(index)) return 0
  return Math.min(Math.max(Math.trunc(index), 0), length - 1)
}

/** Locks carousel/page scroll to one axis once movement exceeds slop. */
export function resolveSwipeableScrollAxisLock(
  dx: number,
  dy: number,
  slopSq: number = TAP_SLOP_SQ,
): "x" | "y" | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || slopSq < 0) return null

  const distanceSq = dx * dx + dy * dy
  if (distanceSq <= slopSq) return null

  return Math.abs(dx) > Math.abs(dy) ? "x" : "y"
}

function applyScrollerTouchAction(
  scroller: HTMLDivElement | null,
  axis: SwipeableScrollAxisLock,
) {
  if (!scroller) return

  try {
    scroller.style.touchAction = SCROLLER_TOUCH_ACTION[axis]
  } catch {
    // Style writes must never break interaction handling.
  }
}

function isPageElement(
  child: ReactElement,
): child is ReactElement<SwipeableActionCardPageProps> {
  const type = child.type as { displayName?: string }
  return (
    child.type === SwipeableActionCardPage ||
    type.displayName === PAGE_DISPLAY_NAME
  )
}

function isNestedInteractiveTarget(
  target: EventTarget | null,
  currentTarget: EventTarget,
) {
  if (!(target instanceof Element)) return false

  const interactive = target.closest(
    "a[href], button, input, select, textarea, label, summary, [role='button'], [role='link']",
  )

  return Boolean(interactive && interactive !== currentTarget)
}

function collectPages(children: ReactNode): CollectedPage[] {
  const pages: CollectedPage[] = []

  Children.forEach(children, (child, index) => {
    if (!isValidElement(child) || !isPageElement(child)) return

    pages.push({
      key: child.key != null ? String(child.key) : `page-${index}`,
      title: child.props.title,
      meta: child.props.meta,
      content: child.props.children,
      className: child.props.className,
      disabled: child.props.disabled === true,
    })
  })

  return pages
}

export function resolveSwipeableActionCardIndex(
  scrollLeft: number,
  itemWidth: number,
  pageCount: number,
): number | null {
  if (itemWidth <= 0 || pageCount <= 0) return null
  if (!Number.isFinite(scrollLeft)) return null

  const rawIndex = Math.round(scrollLeft / itemWidth)
  if (!Number.isFinite(rawIndex)) return null

  return clampSwipeableActionCardIndex(rawIndex, pageCount)
}

function syncScrollerToIndex(
  scroller: HTMLDivElement | null,
  index: number,
) {
  if (!scroller) return

  const itemWidth = scroller.clientWidth
  if (itemWidth <= 0) return

  const nextLeft = index * itemWidth
  if (Math.abs(scroller.scrollLeft - nextLeft) > 1) {
    scroller.scrollLeft = nextLeft
  }
}

/**
 * Compact swipeable card: fixed title + dots, edge-to-edge snap pages,
 * optional whole-card activate for the active page.
 *
 * Uses a region (not a button) so nested page content and the scroll track
 * stay valid interactive descendants.
 */
function SwipeableActionCardRoot({
  children,
  className,
  onClick,
  "aria-label": ariaLabel,
}: SwipeableActionCardProps) {
  const pages = collectPages(children)
  const pageCount = pages.length
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const scrollerGestureRef = useRef<{ x: number; y: number } | null>(null)
  const scrollerAxisLockRef = useRef<SwipeableScrollAxisLock>("both")
  const suppressClickRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const { ref: inViewRef, isInView } = useInView({ threshold: 0.4 })

  const safeIndex = clampSwipeableActionCardIndex(activeIndex, pageCount)
  const activePage = pages[safeIndex]
  const showDots = pageCount > 1
  const isPageDisabled = activePage?.disabled === true
  const isActivating = typeof onClick === "function" && !isPageDisabled

  useEffect(() => {
    syncScrollerToIndex(scrollerRef.current, safeIndex)
  }, [pageCount, safeIndex])

  useEffect(
    () => () => {
      applyScrollerTouchAction(scrollerRef.current, "both")
    },
    [],
  )

  if (pageCount === 0 || !activePage) return null

  const resetScrollerAxisLock = () => {
    scrollerGestureRef.current = null
    scrollerAxisLockRef.current = "both"
    applyScrollerTouchAction(scrollerRef.current, "both")
  }

  const handleScrollerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!showDots || event.button !== 0) return

    scrollerGestureRef.current = { x: event.clientX, y: event.clientY }
    scrollerAxisLockRef.current = "both"
    applyScrollerTouchAction(scrollerRef.current, "both")
  }

  const handleScrollerPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!showDots || scrollerAxisLockRef.current !== "both") return

    const start = scrollerGestureRef.current
    if (!start) return

    const axis = resolveSwipeableScrollAxisLock(
      event.clientX - start.x,
      event.clientY - start.y,
    )
    if (axis == null) return

    scrollerAxisLockRef.current = axis
    applyScrollerTouchAction(scrollerRef.current, axis)
  }

  const handleScroll = () => {
    suppressClickRef.current = true

    const scroller = scrollerRef.current
    if (!scroller) return

    const nextIndex = resolveSwipeableActionCardIndex(
      scroller.scrollLeft,
      scroller.clientWidth,
      pageCount,
    )
    if (nextIndex == null) return

    setActiveIndex((current) => (current === nextIndex ? current : nextIndex))
  }

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    suppressClickRef.current = false
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
  }

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const start = pointerStartRef.current
    if (!start || suppressClickRef.current) return

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (dx * dx + dy * dy > TAP_SLOP_SQ) {
      suppressClickRef.current = true
    }
  }

  const clearPointer = () => {
    pointerStartRef.current = null
  }

  const handlePointerCancel = () => {
    clearPointer()
    suppressClickRef.current = true
  }

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (isNestedInteractiveTarget(event.target, event.currentTarget)) return

    onClick?.(safeIndex)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return
    if (event.target !== event.currentTarget) return

    event.preventDefault()
    onClick?.(safeIndex)
  }

  return (
    <SwipeableActionCardContext.Provider
      value={{ isInView, activePageIndex: safeIndex }}
    >
      <div
        ref={inViewRef}
        className={cn(
          "rounded-xl bg-slate-100 py-3 text-slate-950",
          isActivating &&
            "cursor-pointer transition-colors hover:bg-slate-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
          isPageDisabled && "cursor-default",
          className,
        )}
        role="region"
        aria-label={ariaLabel}
        aria-disabled={isPageDisabled || undefined}
        tabIndex={isActivating ? 0 : undefined}
        onPointerDown={isActivating ? handlePointerDown : undefined}
        onPointerMove={isActivating ? handlePointerMove : undefined}
        onPointerUp={isActivating ? clearPointer : undefined}
        onPointerCancel={isActivating ? handlePointerCancel : undefined}
        onClick={isActivating ? handleClick : undefined}
        onKeyDown={isActivating ? handleKeyDown : undefined}
      >
        <div
          className={cn(
            "flex items-start justify-between gap-3",
            HEADER_GUTTER_CLASS,
            isPageDisabled && "opacity-60",
          )}
        >
          <div
            className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5"
            aria-live={showDots ? "polite" : undefined}
          >
            <div
              className={cn(
                "text-base font-semibold leading-6",
                isPageDisabled && "text-slate-500",
              )}
            >
              {activePage.title}
            </div>
            {hasReactNodeContent(activePage.meta) && (
              <div
                className={cn(
                  "text-sm font-medium leading-5 text-slate-500",
                  isPageDisabled && "text-slate-400",
                )}
              >
                {activePage.meta}
              </div>
            )}
          </div>

          {showDots && (
            <div
              className="flex shrink-0 items-center gap-1.5 pt-1"
              aria-hidden="true"
              data-testid="swipeable-action-card-dots"
            >
              {pages.map((page, index) => (
                <span
                  key={page.key}
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    index === safeIndex
                      ? isPageDisabled
                        ? "bg-slate-400"
                        : "bg-slate-950"
                      : "bg-slate-300",
                  )}
                />
              ))}
            </div>
          )}
        </div>

        <div
          ref={scrollerRef}
          className={SCROLLER_CLASS}
          data-testid="swipeable-action-card-scroller"
          onScroll={showDots ? handleScroll : undefined}
          onPointerDown={showDots ? handleScrollerPointerDown : undefined}
          onPointerMove={showDots ? handleScrollerPointerMove : undefined}
          onPointerUp={showDots ? resetScrollerAxisLock : undefined}
          onPointerCancel={showDots ? resetScrollerAxisLock : undefined}
          aria-roledescription={showDots ? "carousel" : undefined}
          aria-label={showDots ? "Card pages" : undefined}
        >
          {pages.map((page, index) => (
            <SwipeableActionCardPageIndexContext.Provider
              key={page.key}
              value={index}
            >
              <div
                className={cn(
                  // `w-full` (not `min-w-full`) so wide content truncates
                  // instead of stretching the page past the card.
                  "w-full shrink-0 snap-center snap-always",
                  page.className,
                )}
                aria-hidden={index === safeIndex ? undefined : true}
              >
                {page.content}
              </div>
            </SwipeableActionCardPageIndexContext.Provider>
          ))}
        </div>
      </div>
    </SwipeableActionCardContext.Provider>
  )
}

function SwipeableActionCardPage(_props: SwipeableActionCardPageProps) {
  // Marker child — props are collected by the parent; never mounted.
  void _props
  return null
}

SwipeableActionCardPage.displayName = PAGE_DISPLAY_NAME

export const SwipeableActionCard = Object.assign(SwipeableActionCardRoot, {
  Page: SwipeableActionCardPage,
})
