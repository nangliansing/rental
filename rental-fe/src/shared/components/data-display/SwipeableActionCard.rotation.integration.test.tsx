import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ROTATING_CONTENT_TRANSITION_MS,
  RotatingContent,
} from "./RotatingContent"
import {
  SwipeableActionCard,
  useSwipeableActionCardPageActive,
} from "./SwipeableActionCard"

let observerCallback: IntersectionObserverCallback | null = null
const observe = vi.fn()
const disconnect = vi.fn()

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ""
  readonly thresholds = []

  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback
  }

  observe = observe
  unobserve = vi.fn()
  disconnect = disconnect
  takeRecords = vi.fn(() => [])
}

function mockMatchMedia(prefersReducedMotion = false) {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string): MediaQueryList => ({
      matches: prefersReducedMotion && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  )
}

function setDocumentVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state,
  })
  document.dispatchEvent(new Event("visibilitychange"))
}

function setCardInView(isIntersecting: boolean) {
  act(() => {
    observerCallback?.(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
  })
}

function swipeToPage(scroller: HTMLElement, index: number, width = 320) {
  Object.defineProperty(scroller, "clientWidth", {
    configurable: true,
    value: width,
  })
  scroller.scrollLeft = index * width
  fireEvent.scroll(scroller)
}

function PageRotator({
  label,
  items,
  durationMs = 1000,
}: {
  label: string
  items: string[]
  durationMs?: number
}) {
  const active = useSwipeableActionCardPageActive()

  return (
    <RotatingContent aria-label={label} durationMs={durationMs} active={active}>
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </RotatingContent>
  )
}

function renderReviewCard(pageCount: 1 | 2 = 2) {
  return render(
    <SwipeableActionCard aria-label="Review highlights">
      <SwipeableActionCard.Page title="Lister reviews">
        <PageRotator
          label="Lister review teasers"
          items={["Lister A", "Lister B", "Lister C"]}
        />
      </SwipeableActionCard.Page>
      {pageCount > 1 && (
        <SwipeableActionCard.Page title="Listing reviews">
          <PageRotator
            label="Listing review teasers"
            items={["Listing X", "Listing Y"]}
          />
        </SwipeableActionCard.Page>
      )}
    </SwipeableActionCard>,
  )
}

function advanceToNextItem(dwellMs: number) {
  act(() => {
    vi.advanceTimersByTime(dwellMs)
  })
  act(() => {
    vi.advanceTimersByTime(ROTATING_CONTENT_TRANSITION_MS)
  })
}

describe("SwipeableActionCard + RotatingContent integration", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockMatchMedia(false)
    setDocumentVisibility("visible")
    observerCallback = null
    observe.mockClear()
    disconnect.mockClear()
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)
  })

  afterEach(() => {
    setDocumentVisibility("visible")
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it("observes the card and starts out paused off-screen", () => {
    renderReviewCard()

    expect(observe).toHaveBeenCalledTimes(1)
    expect(screen.getByText("Lister A")).toBeInTheDocument()
    expect(screen.queryByText("Lister B")).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByText("Lister A")).toBeInTheDocument()
    expect(screen.queryByText("Lister B")).not.toBeInTheDocument()
  })

  it("rotates only the active page after the card enters view", () => {
    renderReviewCard()
    setCardInView(true)

    advanceToNextItem(1000)
    expect(screen.getByText("Lister B")).toBeInTheDocument()
    expect(screen.getByText("Listing X")).toBeInTheDocument()
    expect(screen.queryByText("Listing Y")).not.toBeInTheDocument()

    advanceToNextItem(1000)
    expect(screen.getByText("Lister C")).toBeInTheDocument()
    expect(screen.getByText("Listing X")).toBeInTheDocument()
  })

  it("pauses the previous page and rotates the newly active page after swipe", () => {
    renderReviewCard()
    setCardInView(true)

    advanceToNextItem(1000)
    expect(screen.getByText("Lister B")).toBeInTheDocument()

    swipeToPage(screen.getByLabelText("Card pages"), 1)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByText("Lister B")).toBeInTheDocument()
    expect(screen.queryByText("Lister C")).not.toBeInTheDocument()

    advanceToNextItem(1000)
    expect(screen.getByText("Listing Y")).toBeInTheDocument()
  })

  it("pauses mid-item when the card leaves view and resumes from that item when it returns", () => {
    renderReviewCard()
    setCardInView(true)

    advanceToNextItem(1000)
    expect(screen.getByText("Lister B")).toBeInTheDocument()

    setCardInView(false)
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByText("Lister B")).toBeInTheDocument()
    expect(screen.queryByText("Lister C")).not.toBeInTheDocument()

    setCardInView(true)
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(screen.getByText("Lister B")).toBeInTheDocument()

    advanceToNextItem(1)
    expect(screen.getByText("Lister C")).toBeInTheDocument()
  })

  it("settles an in-flight transition when the card leaves view", () => {
    renderReviewCard()
    setCardInView(true)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText("Lister A")).toBeInTheDocument()
    expect(screen.getByText("Lister B")).toBeInTheDocument()

    setCardInView(false)
    expect(screen.getByText("Lister B")).toBeInTheDocument()
    expect(screen.queryByText("Lister A")).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByText("Lister B")).toBeInTheDocument()
    expect(screen.queryByText("Lister C")).not.toBeInTheDocument()
  })

  it("gates a single-page card on in-view the same way", () => {
    renderReviewCard(1)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByText("Lister A")).toBeInTheDocument()
    expect(screen.queryByText("Lister B")).not.toBeInTheDocument()

    setCardInView(true)
    advanceToNextItem(1000)
    expect(screen.getByText("Lister B")).toBeInTheDocument()
  })

  it("does not rotate when prefers-reduced-motion is set even while in view", () => {
    mockMatchMedia(true)
    renderReviewCard()
    setCardInView(true)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByText("Lister A")).toBeInTheDocument()
    expect(screen.queryByText("Lister B")).not.toBeInTheDocument()
  })

  it("pauses while the document is hidden even if the card stays in view", () => {
    renderReviewCard()
    setCardInView(true)

    act(() => {
      vi.advanceTimersByTime(500)
    })

    act(() => {
      setDocumentVisibility("hidden")
    })
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByText("Lister A")).toBeInTheDocument()

    act(() => {
      setDocumentVisibility("visible")
    })
    advanceToNextItem(1000)
    expect(screen.getByText("Lister B")).toBeInTheDocument()
  })

  it("stops after one full round on the active in-view page", () => {
    renderReviewCard()
    setCardInView(true)

    advanceToNextItem(1000) // B
    advanceToNextItem(1000) // C
    advanceToNextItem(1000) // back to A, round done

    expect(screen.getByText("Lister A")).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(screen.getByText("Lister A")).toBeInTheDocument()
    expect(screen.queryByText("Lister B")).not.toBeInTheDocument()
  })

  it("disconnects the observer and clears timers on unmount mid-rotation", () => {
    const { unmount } = renderReviewCard()
    setCardInView(true)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText("Lister A")).toBeInTheDocument()
    expect(screen.getByText("Lister B")).toBeInTheDocument()

    unmount()
    expect(disconnect).toHaveBeenCalled()

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(10_000)
      })
    }).not.toThrow()
  })

  it("disconnects the observer on unmount while still off-screen", () => {
    const { unmount } = renderReviewCard()
    expect(observe).toHaveBeenCalled()

    unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  it("pauses the active rotator when pages shrink away mid-rotation", () => {
    const { rerender } = render(
      <SwipeableActionCard aria-label="Review highlights">
        <SwipeableActionCard.Page title="Lister reviews">
          <PageRotator
            label="Lister review teasers"
            items={["Lister A", "Lister B"]}
          />
        </SwipeableActionCard.Page>
        <SwipeableActionCard.Page title="Listing reviews">
          <PageRotator
            label="Listing review teasers"
            items={["Listing X", "Listing Y"]}
          />
        </SwipeableActionCard.Page>
      </SwipeableActionCard>,
    )

    setCardInView(true)
    swipeToPage(screen.getByLabelText("Card pages"), 1)
    advanceToNextItem(1000)
    expect(screen.getByText("Listing Y")).toBeInTheDocument()

    rerender(
      <SwipeableActionCard aria-label="Review highlights">
        <SwipeableActionCard.Page title="Lister reviews">
          <PageRotator
            label="Lister review teasers"
            items={["Lister A", "Lister B"]}
          />
        </SwipeableActionCard.Page>
      </SwipeableActionCard>,
    )

    expect(screen.getByText("Lister A")).toBeInTheDocument()
    expect(screen.queryByText("Listing Y")).not.toBeInTheDocument()

    advanceToNextItem(1000)
    expect(screen.getByText("Lister B")).toBeInTheDocument()
  })
})
