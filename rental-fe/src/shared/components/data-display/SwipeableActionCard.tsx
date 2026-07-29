/* eslint-disable react-refresh/only-export-components -- This compound component intentionally exports its page marker and context hook together. */

import {
  Children,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

const TAP_SLOP_PX = 10
const TAP_SLOP_SQ = TAP_SLOP_PX * TAP_SLOP_PX

type SwipeableActionCardContextValue = {
  isInView: boolean
  activePageIndex: number
}

const SwipeableActionCardContext =
  createContext<SwipeableActionCardContextValue | null>(null)

const SwipeableActionCardPageIndexContext = createContext(0)

export function useSwipeableActionCardPageActive(): boolean {
  const card = useContext(SwipeableActionCardContext)
  const pageIndex = useContext(SwipeableActionCardPageIndexContext)

  if (card == null) return true

  return card.isInView && pageIndex === card.activePageIndex
}

export type SwipeableActionCardPageProps = {
  title: ReactNode
  meta?: ReactNode
  children?: ReactNode
  className?: string

  /**
   * Keeps the page swipeable while disabling whole-card activation.
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
   * Called when the active page is activated.
   * Nested interactive elements are ignored.
   */
  onClick?: (index: number) => void

  "aria-label"?: string
}

type PointerStart = {
  pointerId: number
  x: number
  y: number
}

export function clampSwipeableActionCardIndex(
  index: number,
  length: number,
): number {
  if (length <= 0) return 0
  if (!Number.isFinite(index)) return 0

  return Math.min(Math.max(Math.trunc(index), 0), length - 1)
}

function isPageElement(
  child: ReactElement,
): child is ReactElement<SwipeableActionCardPageProps> {
  const type = child.type as {
    displayName?: string
  }

  return (
    child.type === SwipeableActionCardPage ||
    type.displayName === PAGE_DISPLAY_NAME
  )
}

function isNestedInteractiveTarget(
  target: EventTarget | null,
  currentTarget: EventTarget,
): boolean {
  if (!(target instanceof Element)) return false

  const interactiveElement = target.closest(
    [
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      "label",
      "summary",
      "[contenteditable='true']",
      "[role='button']",
      "[role='link']",
      "[role='checkbox']",
      "[role='menuitem']",
      "[role='option']",
      "[role='radio']",
      "[role='switch']",
      "[role='tab']",
    ].join(", "),
  )

  return Boolean(
    interactiveElement && interactiveElement !== currentTarget,
  )
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
): void {
  if (!scroller) return

  const pageWidth = scroller.clientWidth

  if (pageWidth <= 0) return

  const nextScrollLeft = index * pageWidth

  if (Math.abs(scroller.scrollLeft - nextScrollLeft) <= 1) return

  scroller.scrollLeft = nextScrollLeft
}

function SwipeableActionCardRoot({
  children,
  className,
  onClick,
  "aria-label": ariaLabel,
}: SwipeableActionCardProps) {
  const pages = useMemo(() => collectPages(children), [children])
  const pageCount = pages.length

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const pointerStartRef = useRef<PointerStart | null>(null)
  const suppressClickRef = useRef(false)
  const scrollFrameRef = useRef<number | null>(null)

  const [activeIndex, setActiveIndex] = useState(0)

  const { ref: inViewRef, isInView } = useInView({
    threshold: 0.4,
  })

  const safeIndex = clampSwipeableActionCardIndex(
    activeIndex,
    pageCount,
  )

  const activePage = pages[safeIndex]
  const showDots = pageCount > 1
  const isPageDisabled = activePage?.disabled === true
  const isActivating =
    typeof onClick === "function" && !isPageDisabled

  useEffect(() => {
    setActiveIndex((currentIndex) =>
      clampSwipeableActionCardIndex(currentIndex, pageCount),
    )
  }, [pageCount])

  useEffect(() => {
    syncScrollerToIndex(scrollerRef.current, safeIndex)
  }, [pageCount, safeIndex])

  useEffect(() => {
    return () => {
      if (scrollFrameRef.current != null) {
        cancelAnimationFrame(scrollFrameRef.current)
      }
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (pointerStartRef.current != null) {
      suppressClickRef.current = true
    }

    if (scrollFrameRef.current != null) return

    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null

      const scroller = scrollerRef.current
      if (!scroller) return

      const nextIndex = resolveSwipeableActionCardIndex(
        scroller.scrollLeft,
        scroller.clientWidth,
        pageCount,
      )

      if (nextIndex == null) return

      setActiveIndex((currentIndex) =>
        currentIndex === nextIndex ? currentIndex : nextIndex,
      )
    })
  }, [pageCount])

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return
      }

      if (!event.isPrimary) return

      suppressClickRef.current = false

      pointerStartRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      }
    },
    [],
  )

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const start = pointerStartRef.current

      if (!start || start.pointerId !== event.pointerId) return
      if (suppressClickRef.current) return

      const deltaX = event.clientX - start.x
      const deltaY = event.clientY - start.y
      const movementSquared =
        deltaX * deltaX + deltaY * deltaY

      if (movementSquared > TAP_SLOP_SQ) {
        suppressClickRef.current = true
      }
    },
    [],
  )

  const clearPointer = useCallback(
    (event?: PointerEvent<HTMLElement>) => {
      if (
        event &&
        pointerStartRef.current?.pointerId !== event.pointerId
      ) {
        return
      }

      pointerStartRef.current = null
    },
    [],
  )

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      clearPointer(event)
      suppressClickRef.current = true
    },
    [clearPointer],
  )

  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false
        return
      }

      if (
        isNestedInteractiveTarget(
          event.target,
          event.currentTarget,
        )
      ) {
        return
      }

      onClick?.(safeIndex)
    },
    [onClick, safeIndex],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return
      if (event.target !== event.currentTarget) return

      event.preventDefault()
      onClick?.(safeIndex)
    },
    [onClick, safeIndex],
  )

  if (pageCount === 0 || !activePage) return null

  return (
    <SwipeableActionCardContext.Provider
      value={{
        isInView,
        activePageIndex: safeIndex,
      }}
    >
      <div
        ref={inViewRef}
        className={cn(
          "rounded-xl bg-slate-100 py-3 text-slate-950",
          isActivating && [
            "cursor-pointer transition-colors",
            "hover:bg-slate-200/80",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-slate-400",
          ],
          isPageDisabled && "cursor-default",
          className,
        )}
        role="region"
        aria-label={ariaLabel}
        aria-disabled={isPageDisabled || undefined}
        tabIndex={isActivating ? 0 : undefined}
        onPointerDown={
          isActivating ? handlePointerDown : undefined
        }
        onPointerMove={
          isActivating ? handlePointerMove : undefined
        }
        onPointerUp={
          isActivating ? clearPointer : undefined
        }
        onPointerCancel={
          isActivating ? handlePointerCancel : undefined
        }
        onClick={isActivating ? handleClick : undefined}
        onKeyDown={
          isActivating ? handleKeyDown : undefined
        }
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
            aria-atomic={showDots ? true : undefined}
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
          className={cn(
            "mt-2 flex overflow-x-auto",
            "touch-auto",
            "snap-x snap-mandatory",
            "overscroll-x-contain",
            "[scrollbar-width:none]",
            "[&::-webkit-scrollbar]:hidden",
          )}
          onScroll={showDots ? handleScroll : undefined}
          aria-roledescription={
            showDots ? "carousel" : undefined
          }
          aria-label={showDots ? "Card pages" : undefined}
        >
          {pages.map((page, index) => {
            const isActive = index === safeIndex

            return (
              <SwipeableActionCardPageIndexContext.Provider
                key={page.key}
                value={index}
              >
                <div
                  className={cn(
                    "w-full shrink-0 snap-center snap-always",
                    page.className,
                  )}
                  aria-hidden={isActive ? undefined : true}
                >
                  {page.content}
                </div>
              </SwipeableActionCardPageIndexContext.Provider>
            )
          })}
        </div>
      </div>
    </SwipeableActionCardContext.Provider>
  )
}

function SwipeableActionCardPage(
  _props: SwipeableActionCardPageProps,
) {
  void _props
  return null
}

SwipeableActionCardPage.displayName = PAGE_DISPLAY_NAME

export const SwipeableActionCard = Object.assign(
  SwipeableActionCardRoot,
  {
    Page: SwipeableActionCardPage,
  },
)