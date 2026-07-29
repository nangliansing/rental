import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  ROTATING_CONTENT_TRANSITION_MS,
  RotatingContent,
} from "./RotatingContent"
import {
  DEFAULT_ROTATING_CONTENT_DURATION_MS,
  normalizeRotatingContentDurationMs,
} from "./RotatingContent.utils"

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

function renderReviews(
  props: {
    durationMs?: number
    count?: number
    className?: string
    "aria-label"?: string
  } = {},
) {
  const count = props.count ?? 3

  return render(
    <RotatingContent
      durationMs={props.durationMs}
      className={props.className}
      aria-label={props["aria-label"] ?? "Review teasers"}
    >
      {Array.from({ length: count }, (_, index) => (
        <p key={index}>{`Review ${index + 1}`}</p>
      ))}
    </RotatingContent>,
  )
}

/** Advance past one dwell + the enter/exit transition cleanup. */
function advanceToNextItem(dwellMs: number) {
  act(() => {
    vi.advanceTimersByTime(dwellMs)
  })
  act(() => {
    vi.advanceTimersByTime(ROTATING_CONTENT_TRANSITION_MS)
  })
}

function startTransition(dwellMs: number) {
  act(() => {
    vi.advanceTimersByTime(dwellMs)
  })
}

describe("normalizeRotatingContentDurationMs", () => {
  it("uses the default when undefined", () => {
    expect(normalizeRotatingContentDurationMs(undefined)).toBe(
      DEFAULT_ROTATING_CONTENT_DURATION_MS,
    )
  })

  it("accepts finite positive durations and truncates fractions", () => {
    expect(normalizeRotatingContentDurationMs(1)).toBe(1)
    expect(normalizeRotatingContentDurationMs(2500)).toBe(2500)
    expect(normalizeRotatingContentDurationMs(2500.9)).toBe(2500)
  })

  it("treats zero and negatives as disabled rotation", () => {
    expect(normalizeRotatingContentDurationMs(0)).toBe(0)
    expect(normalizeRotatingContentDurationMs(-1)).toBe(0)
    expect(normalizeRotatingContentDurationMs(-10.8)).toBe(0)
  })

  it("falls back to the default for invalid values", () => {
    expect(normalizeRotatingContentDurationMs(Number.NaN)).toBe(
      DEFAULT_ROTATING_CONTENT_DURATION_MS,
    )
    expect(normalizeRotatingContentDurationMs(Number.POSITIVE_INFINITY)).toBe(
      DEFAULT_ROTATING_CONTENT_DURATION_MS,
    )
    expect(normalizeRotatingContentDurationMs(Number.NEGATIVE_INFINITY)).toBe(
      DEFAULT_ROTATING_CONTENT_DURATION_MS,
    )
    expect(normalizeRotatingContentDurationMs("4000")).toBe(
      DEFAULT_ROTATING_CONTENT_DURATION_MS,
    )
    expect(normalizeRotatingContentDurationMs(null)).toBe(
      DEFAULT_ROTATING_CONTENT_DURATION_MS,
    )
    expect(normalizeRotatingContentDurationMs({})).toBe(
      DEFAULT_ROTATING_CONTENT_DURATION_MS,
    )
  })
})

describe("RotatingContent", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockMatchMedia(false)
    setDocumentVisibility("visible")
  })

  afterEach(() => {
    setDocumentVisibility("visible")
    vi.useRealTimers()
  })

  describe("children collection", () => {
    it("returns null with no children", () => {
      const { container } = render(<RotatingContent />)
      expect(container).toBeEmptyDOMElement()
    })

    it("returns null when children are only nullish/booleans", () => {
      const { container } = render(
        <RotatingContent aria-label="Empty">
          {null}
          {false}
          {true}
          {undefined}
        </RotatingContent>,
      )
      expect(container).toBeEmptyDOMElement()
    })

    it("ignores nullish conditional children between real items", () => {
      render(
        <RotatingContent durationMs={1000} aria-label="Review teasers">
          <p>Review 1</p>
          {null}
          {false}
          <p>Review 2</p>
        </RotatingContent>,
      )

      expect(screen.getByText("Review 1")).toBeInTheDocument()
      advanceToNextItem(1000)
      expect(screen.getByText("Review 2")).toBeInTheDocument()
      advanceToNextItem(1000)
      expect(screen.getByText("Review 1")).toBeInTheDocument()
    })

    it("renders a single child without rotating", () => {
      renderReviews({ count: 1, durationMs: 1000 })

      expect(screen.getByText("Review 1")).toBeInTheDocument()
      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.queryByText("Review 2")).not.toBeInTheDocument()
    })
  })

  describe("dwell duration", () => {
    it("uses the default duration when durationMs is omitted", () => {
      renderReviews({ count: 2 })

      act(() => {
        vi.advanceTimersByTime(DEFAULT_ROTATING_CONTENT_DURATION_MS - 1)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()

      advanceToNextItem(1)
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      advanceToNextItem(DEFAULT_ROTATING_CONTENT_DURATION_MS)
      expect(screen.getByText("Review 1")).toBeInTheDocument()
    })

    it("honors a custom durationMs", () => {
      renderReviews({ count: 2, durationMs: 2500 })

      act(() => {
        vi.advanceTimersByTime(2499)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()

      advanceToNextItem(1)
      expect(screen.getByText("Review 2")).toBeInTheDocument()
    })

    it("does not rotate when durationMs is 0", () => {
      renderReviews({ durationMs: 0, count: 3 })

      act(() => {
        vi.advanceTimersByTime(10_000)
      })

      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.queryByText("Review 2")).not.toBeInTheDocument()
    })

    it("does not rotate when durationMs is negative", () => {
      renderReviews({ durationMs: -500, count: 3 })

      act(() => {
        vi.advanceTimersByTime(10_000)
      })

      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.queryByText("Review 2")).not.toBeInTheDocument()
    })

    it("falls back to the default duration for invalid durationMs props", () => {
      renderReviews({
        count: 2,
        durationMs: Number.NaN as unknown as number,
      })

      act(() => {
        vi.advanceTimersByTime(DEFAULT_ROTATING_CONTENT_DURATION_MS - 1)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()

      advanceToNextItem(1)
      expect(screen.getByText("Review 2")).toBeInTheDocument()
    })
  })

  describe("rotation cycle", () => {
    it("shows one child at a time through a single round, then stops on the first", () => {
      renderReviews({ durationMs: 1000, count: 3 })

      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.queryByText("Review 2")).not.toBeInTheDocument()

      advanceToNextItem(1000)
      expect(screen.getByText("Review 2")).toBeInTheDocument()
      expect(screen.queryByText("Review 1")).not.toBeInTheDocument()

      advanceToNextItem(1000)
      expect(screen.getByText("Review 3")).toBeInTheDocument()

      advanceToNextItem(1000)
      expect(screen.getByText("Review 1")).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.queryByText("Review 2")).not.toBeInTheDocument()
    })

    it("completes a two-item round and stops", () => {
      renderReviews({ durationMs: 1000, count: 2 })

      advanceToNextItem(1000)
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      advanceToNextItem(1000)
      expect(screen.getByText("Review 1")).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.queryByText("Review 2")).not.toBeInTheDocument()
    })

    it("resets the cycle when the child count changes", () => {
      const { rerender } = render(
        <RotatingContent durationMs={1000} aria-label="Review teasers">
          <p>Review 1</p>
          <p>Review 2</p>
          <p>Review 3</p>
        </RotatingContent>,
      )

      advanceToNextItem(1000)
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      rerender(
        <RotatingContent durationMs={1000} aria-label="Review teasers">
          <p>Review A</p>
          <p>Review B</p>
        </RotatingContent>,
      )

      expect(screen.getByText("Review A")).toBeInTheDocument()

      advanceToNextItem(1000)
      expect(screen.getByText("Review B")).toBeInTheDocument()

      advanceToNextItem(1000)
      expect(screen.getByText("Review A")).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(3000)
      })
      expect(screen.getByText("Review A")).toBeInTheDocument()
    })

    it("restarts rotation when shrinking to one item then growing again", () => {
      const { rerender } = render(
        <RotatingContent durationMs={1000} aria-label="Review teasers">
          <p>Review 1</p>
          <p>Review 2</p>
        </RotatingContent>,
      )

      advanceToNextItem(1000)
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      rerender(
        <RotatingContent durationMs={1000} aria-label="Review teasers">
          <p>Only one</p>
        </RotatingContent>,
      )
      expect(screen.getByText("Only one")).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(screen.getByText("Only one")).toBeInTheDocument()

      rerender(
        <RotatingContent durationMs={1000} aria-label="Review teasers">
          <p>Again 1</p>
          <p>Again 2</p>
        </RotatingContent>,
      )

      expect(screen.getByText("Again 1")).toBeInTheDocument()
      advanceToNextItem(1000)
      expect(screen.getByText("Again 2")).toBeInTheDocument()
    })

    it("unmounts cleanly when children become empty", () => {
      const { rerender, container } = renderReviews({ count: 2, durationMs: 1000 })

      startTransition(1000)
      rerender(<RotatingContent aria-label="Review teasers">{null}</RotatingContent>)

      expect(container).toBeEmptyDOMElement()
    })
  })

  describe("transition animation", () => {
    it("slides the next child in while the previous fades out", () => {
      renderReviews({ durationMs: 1000, count: 2 })

      startTransition(1000)

      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()
      expect(screen.getByText("Review 1").parentElement).toHaveClass(
        "rotating-content-exit",
      )
      expect(screen.getByText("Review 2").parentElement).toHaveClass(
        "rotating-content-enter",
      )
      expect(screen.getByText("Review 1").parentElement).toHaveAttribute(
        "aria-hidden",
        "true",
      )

      act(() => {
        vi.advanceTimersByTime(ROTATING_CONTENT_TRANSITION_MS)
      })

      expect(screen.getByText("Review 2")).toBeInTheDocument()
      expect(screen.queryByText("Review 1")).not.toBeInTheDocument()
    })

    it("does not start the next dwell until the transition finishes", () => {
      renderReviews({ durationMs: 1000, count: 3 })

      startTransition(1000)
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(ROTATING_CONTENT_TRANSITION_MS - 1)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()
      expect(screen.queryByText("Review 3")).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(screen.queryByText("Review 1")).not.toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      startTransition(1000)
      expect(screen.getByText("Review 3")).toBeInTheDocument()
    })

    it("clears the outgoing slide when the enter animation ends", () => {
      renderReviews({ durationMs: 1000, count: 2 })

      startTransition(1000)
      expect(screen.getByText("Review 1")).toBeInTheDocument()

      const incoming = screen.getByText("Review 2").parentElement
      expect(incoming).toHaveClass("rotating-content-enter")

      // Fallback timer is the reliable cleanup path in jsdom; assert it still
      // clears if animationend never fires.
      act(() => {
        vi.advanceTimersByTime(ROTATING_CONTENT_TRANSITION_MS)
      })

      expect(screen.getByText("Review 2")).toBeInTheDocument()
      expect(screen.queryByText("Review 1")).not.toBeInTheDocument()
    })

    it("keeps both slides until the transition window completes", () => {
      renderReviews({ durationMs: 1000, count: 2 })

      startTransition(1000)
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(ROTATING_CONTENT_TRANSITION_MS - 1)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()
    })

    it("ignores dwell ticks that would fire during an in-flight transition", () => {
      renderReviews({ durationMs: 1000, count: 3 })

      startTransition(1000)
      act(() => {
        vi.advanceTimersByTime(Math.floor(ROTATING_CONTENT_TRANSITION_MS / 2))
      })

      expect(screen.queryByText("Review 3")).not.toBeInTheDocument()
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()
    })

    it("exposes the transition duration as a CSS custom property", () => {
      renderReviews({ count: 1 })

      expect(screen.getByLabelText("Review teasers")).toHaveStyle({
        "--rotating-content-ms": `${ROTATING_CONTENT_TRANSITION_MS}ms`,
      })
    })
  })

  describe("accessibility and chrome", () => {
    it("applies className and aria-label", () => {
      renderReviews({ className: "px-4", count: 1 })

      const root = screen.getByLabelText("Review teasers")
      expect(root).toHaveClass("px-4", "min-w-0", "overflow-hidden")
    })

    it("marks the active slide as a polite live region while rotating", () => {
      renderReviews({ durationMs: 1000, count: 2 })

      expect(screen.getByText("Review 1").parentElement).toHaveAttribute(
        "aria-live",
        "polite",
      )
      expect(screen.getByText("Review 1").parentElement).toHaveAttribute(
        "aria-atomic",
        "true",
      )
    })

    it("keeps a polite live region after the round completes", () => {
      renderReviews({ durationMs: 1000, count: 2 })

      advanceToNextItem(1000)
      advanceToNextItem(1000)

      expect(screen.getByText("Review 1").parentElement).toHaveAttribute(
        "aria-live",
        "polite",
      )
    })

    it("does not use a live region for a single static child", () => {
      renderReviews({ count: 1 })

      expect(screen.getByText("Review 1").parentElement).not.toHaveAttribute(
        "aria-live",
      )
    })
  })

  describe("reduced motion and visibility", () => {
    it("does not rotate when prefers-reduced-motion is set", () => {
      mockMatchMedia(true)
      renderReviews({ durationMs: 1000, count: 3 })

      act(() => {
        vi.advanceTimersByTime(10_000)
      })

      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.queryByText("Review 2")).not.toBeInTheDocument()
    })

    it("pauses while the document is hidden and resumes afterward", () => {
      renderReviews({ durationMs: 1000, count: 2 })

      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()

      act(() => {
        setDocumentVisibility("hidden")
      })

      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()

      act(() => {
        setDocumentVisibility("visible")
      })

      advanceToNextItem(1000)
      expect(screen.getByText("Review 2")).toBeInTheDocument()
    })

    it("does not rotate when mounted while the document is already hidden", () => {
      setDocumentVisibility("hidden")
      renderReviews({ durationMs: 1000, count: 2 })

      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.queryByText("Review 2")).not.toBeInTheDocument()

      act(() => {
        setDocumentVisibility("visible")
      })
      advanceToNextItem(1000)
      expect(screen.getByText("Review 2")).toBeInTheDocument()
    })
  })

  describe("active prop", () => {
    it("pauses rotation on the current item when active becomes false", () => {
      const { rerender } = render(
        <RotatingContent
          durationMs={1000}
          active
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
          <p>Review 3</p>
        </RotatingContent>,
      )

      advanceToNextItem(1000)
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      rerender(
        <RotatingContent
          durationMs={1000}
          active={false}
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
          <p>Review 3</p>
        </RotatingContent>,
      )

      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(screen.getByText("Review 2")).toBeInTheDocument()
      expect(screen.queryByText("Review 3")).not.toBeInTheDocument()
    })

    it("settles an in-flight transition immediately when active becomes false", () => {
      const { rerender } = render(
        <RotatingContent
          durationMs={1000}
          active
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
          <p>Review 3</p>
        </RotatingContent>,
      )

      startTransition(1000)
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      rerender(
        <RotatingContent
          durationMs={1000}
          active={false}
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
          <p>Review 3</p>
        </RotatingContent>,
      )

      expect(screen.getByText("Review 2")).toBeInTheDocument()
      expect(screen.queryByText("Review 1")).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(screen.getByText("Review 2")).toBeInTheDocument()
      expect(screen.queryByText("Review 3")).not.toBeInTheDocument()
    })

    it("resumes from the same item when active becomes true again", () => {
      const { rerender } = render(
        <RotatingContent
          durationMs={1000}
          active
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
          <p>Review 3</p>
        </RotatingContent>,
      )

      advanceToNextItem(1000)
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      rerender(
        <RotatingContent
          durationMs={1000}
          active={false}
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
          <p>Review 3</p>
        </RotatingContent>,
      )

      act(() => {
        vi.advanceTimersByTime(5000)
      })
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      rerender(
        <RotatingContent
          durationMs={1000}
          active
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
          <p>Review 3</p>
        </RotatingContent>,
      )

      act(() => {
        vi.advanceTimersByTime(999)
      })
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      advanceToNextItem(1)
      expect(screen.getByText("Review 3")).toBeInTheDocument()
    })

    it("does not rotate when mounted with active false", () => {
      render(
        <RotatingContent
          durationMs={1000}
          active={false}
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
        </RotatingContent>,
      )

      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.queryByText("Review 2")).not.toBeInTheDocument()
    })
  })

  describe("timer cleanup", () => {
    it("leaves no pending timers after a full round completes", () => {
      renderReviews({ durationMs: 1000, count: 2 })

      advanceToNextItem(1000)
      advanceToNextItem(1000)

      expect(vi.getTimerCount()).toBe(0)

      act(() => {
        vi.advanceTimersByTime(10_000)
      })

      expect(vi.getTimerCount()).toBe(0)
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.queryByText("Review 2")).not.toBeInTheDocument()
    })

    it("clears timers when active becomes false mid-dwell", () => {
      const { rerender } = render(
        <RotatingContent
          durationMs={1000}
          active
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
        </RotatingContent>,
      )

      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(vi.getTimerCount()).toBeGreaterThan(0)

      rerender(
        <RotatingContent
          durationMs={1000}
          active={false}
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
        </RotatingContent>,
      )

      expect(vi.getTimerCount()).toBe(0)
      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(vi.getTimerCount()).toBe(0)
      expect(screen.getByText("Review 1")).toBeInTheDocument()
    })

    it("clears timers on unmount during a dwell", () => {
      const { unmount } = renderReviews({ durationMs: 1000, count: 3 })

      act(() => {
        vi.advanceTimersByTime(500)
      })
      expect(vi.getTimerCount()).toBeGreaterThan(0)

      unmount()
      expect(vi.getTimerCount()).toBe(0)

      expect(() => {
        act(() => {
          vi.advanceTimersByTime(10_000)
        })
      }).not.toThrow()
    })

    it("clears timers on unmount mid-transition", () => {
      const { unmount } = renderReviews({ durationMs: 1000, count: 3 })

      startTransition(1000)
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()
      expect(vi.getTimerCount()).toBeGreaterThan(0)

      unmount()
      expect(vi.getTimerCount()).toBe(0)

      expect(() => {
        act(() => {
          vi.advanceTimersByTime(10_000)
        })
      }).not.toThrow()
    })

    it("clears timers after rapid active toggles", () => {
      const { rerender } = render(
        <RotatingContent
          durationMs={1000}
          active
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
          <p>Review 3</p>
        </RotatingContent>,
      )

      const teasers = (
        <>
          <p>Review 1</p>
          <p>Review 2</p>
          <p>Review 3</p>
        </>
      )

      for (const active of [false, true, false, true, false] as const) {
        rerender(
          <RotatingContent
            durationMs={1000}
            active={active}
            aria-label="Review teasers"
          >
            {teasers}
          </RotatingContent>,
        )
        act(() => {
          vi.advanceTimersByTime(200)
        })
      }

      expect(vi.getTimerCount()).toBe(0)
      expect(screen.getByText("Review 1")).toBeInTheDocument()
    })
  })

  describe("combined pause and resume scenarios", () => {
    it("finishes an in-flight transition when the document becomes hidden, then pauses", () => {
      renderReviews({ durationMs: 1000, count: 3 })

      startTransition(1000)
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      act(() => {
        setDocumentVisibility("hidden")
      })

      act(() => {
        vi.advanceTimersByTime(ROTATING_CONTENT_TRANSITION_MS)
      })
      expect(screen.getByText("Review 2")).toBeInTheDocument()
      expect(screen.queryByText("Review 1")).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(screen.getByText("Review 2")).toBeInTheDocument()
      expect(screen.queryByText("Review 3")).not.toBeInTheDocument()
      expect(vi.getTimerCount()).toBe(0)
    })

    it("does not restart after a completed round when active toggles off and on", () => {
      const { rerender } = render(
        <RotatingContent
          durationMs={1000}
          active
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
        </RotatingContent>,
      )

      advanceToNextItem(1000)
      advanceToNextItem(1000)
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(vi.getTimerCount()).toBe(0)

      rerender(
        <RotatingContent
          durationMs={1000}
          active={false}
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
        </RotatingContent>,
      )
      rerender(
        <RotatingContent
          durationMs={1000}
          active
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
        </RotatingContent>,
      )

      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.queryByText("Review 2")).not.toBeInTheDocument()
      expect(vi.getTimerCount()).toBe(0)
    })

    it("picks up a new durationMs on the next dwell after a prop change", () => {
      const { rerender } = render(
        <RotatingContent durationMs={1000} aria-label="Review teasers">
          <p>Review 1</p>
          <p>Review 2</p>
        </RotatingContent>,
      )

      act(() => {
        vi.advanceTimersByTime(500)
      })

      rerender(
        <RotatingContent durationMs={2000} aria-label="Review teasers">
          <p>Review 1</p>
          <p>Review 2</p>
        </RotatingContent>,
      )

      act(() => {
        vi.advanceTimersByTime(1999)
      })
      expect(screen.getByText("Review 1")).toBeInTheDocument()

      advanceToNextItem(1)
      expect(screen.getByText("Review 2")).toBeInTheDocument()
    })

    it("removes the visibility listener after the round completes", () => {
      const addSpy = vi.spyOn(document, "addEventListener")
      const removeSpy = vi.spyOn(document, "removeEventListener")

      renderReviews({ durationMs: 1000, count: 2 })

      expect(
        addSpy.mock.calls.some(([type]) => type === "visibilitychange"),
      ).toBe(true)

      advanceToNextItem(1000)
      advanceToNextItem(1000)

      expect(
        removeSpy.mock.calls.some(([type]) => type === "visibilitychange"),
      ).toBe(true)
      expect(vi.getTimerCount()).toBe(0)

      addSpy.mockRestore()
      removeSpy.mockRestore()
    })

    it("removes the visibility listener when active becomes false", () => {
      const removeSpy = vi.spyOn(document, "removeEventListener")
      const { rerender } = render(
        <RotatingContent
          durationMs={1000}
          active
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
        </RotatingContent>,
      )

      rerender(
        <RotatingContent
          durationMs={1000}
          active={false}
          aria-label="Review teasers"
        >
          <p>Review 1</p>
          <p>Review 2</p>
        </RotatingContent>,
      )

      expect(
        removeSpy.mock.calls.some(([type]) => type === "visibilitychange"),
      ).toBe(true)
      expect(vi.getTimerCount()).toBe(0)

      removeSpy.mockRestore()
    })

    it("ignores nested animationend events from child elements", () => {
      renderReviews({ durationMs: 1000, count: 2 })
      startTransition(1000)

      fireEvent.animationEnd(screen.getByText("Review 2"), {
        animationName: "rotating-content-enter",
      })

      expect(screen.getByText("Review 1")).toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(ROTATING_CONTENT_TRANSITION_MS)
      })
      expect(screen.queryByText("Review 1")).not.toBeInTheDocument()
      expect(screen.getByText("Review 2")).toBeInTheDocument()
      // Dwell for the next step is allowed to be pending.
      expect(vi.getTimerCount()).toBe(1)
    })

    it("does not use a live region when durationMs disables rotation", () => {
      renderReviews({ durationMs: 0, count: 2 })

      expect(screen.getByText("Review 1").parentElement).not.toHaveAttribute(
        "aria-live",
      )
    })
  })
})
