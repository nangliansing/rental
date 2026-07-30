import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  SwipeableActionCard,
  useSwipeableActionCardPageActive,
} from "./SwipeableActionCard"

function expectScrollerTouchAction(
  scroller: HTMLElement,
  axis: "both" | "x" | "y",
) {
  const expected = {
    both: "manipulation",
    x: "pan-x",
    y: "pan-y",
  }[axis]

  expect(scroller.style.touchAction || "manipulation").toBe(expected)
}

function renderCard({
  onClick,
  pageCount = 2,
  className,
}: {
  onClick?: (index: number) => void
  pageCount?: 1 | 2 | 3
  className?: string
} = {}) {
  return render(
    <SwipeableActionCard
      onClick={onClick}
      aria-label="Promo card"
      className={className}
    >
      <SwipeableActionCard.Page title="Page one" meta="Meta one">
        <span>Body one</span>
      </SwipeableActionCard.Page>
      {pageCount > 1 && (
        <SwipeableActionCard.Page title="Page two" meta="Meta two">
          <span>Body two</span>
          <button type="button">Open app</button>
          <a href="/app">Open link</a>
        </SwipeableActionCard.Page>
      )}
      {pageCount > 2 && (
        <SwipeableActionCard.Page title="Page three" meta="Meta three">
          <span>Body three</span>
        </SwipeableActionCard.Page>
      )}
    </SwipeableActionCard>,
  )
}

function swipeToPage(scroller: HTMLElement, index: number, width = 320) {
  Object.defineProperty(scroller, "clientWidth", {
    configurable: true,
    value: width,
  })
  scroller.scrollLeft = index * width
  fireEvent.scroll(scroller)
}

function getScroller() {
  return screen.getByTestId("swipeable-action-card-scroller")
}

function getCard() {
  return screen.getByRole("region", { name: "Promo card" })
}

function getDots() {
  return screen.getByTestId("swipeable-action-card-dots").querySelectorAll("span")
}

describe("SwipeableActionCard", () => {
  describe("touch-action / page scroll contract", () => {
    it.each([1, 2, 3] as const)(
      "uses touch-manipulation (never a fixed pan axis) on the snap track for %i page(s)",
      (pageCount) => {
        renderCard({ pageCount })

        const scroller = getScroller()
        expect(scroller).toHaveClass("touch-manipulation")
        expect(scroller).not.toHaveClass("touch-pan-x")
        expect(scroller).not.toHaveClass("touch-pan-y")
        expectScrollerTouchAction(scroller, "both")
      },
    )

    it.each([1, 2, 3] as const)(
      "keeps horizontal snap scrolling affordances for %i page(s)",
      (pageCount) => {
        renderCard({ pageCount })

        const scroller = getScroller()
        expect(scroller).toHaveClass(
          "snap-x",
          "snap-mandatory",
          "overflow-x-auto",
          "overscroll-x-contain",
        )
      },
    )

    it("does not restrict touch-action on the outer card region", () => {
      renderCard({ onClick: vi.fn(), pageCount: 2 })

      const card = getCard()
      expect(card).not.toHaveClass("touch-pan-x")
      expect(card).not.toHaveClass("touch-pan-y")
      expect(card).not.toHaveClass("touch-manipulation")
    })

    it("keeps touch-manipulation on the snap track without onClick handlers", () => {
      renderCard({ pageCount: 2 })

      expect(getScroller()).toHaveClass("touch-manipulation")
      expect(getCard()).not.toHaveAttribute("tabindex")
    })

    it("keeps touch-manipulation on the snap track while the active page is disabled", () => {
      render(
        <SwipeableActionCard onClick={vi.fn()} aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">A</SwipeableActionCard.Page>
          <SwipeableActionCard.Page title="Page two" disabled>
            B
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      swipeToPage(getScroller(), 1)
      expect(getScroller()).toHaveClass("touch-manipulation")
    })

    it("allows the snap track inside a vertically scrollable page shell", () => {
      render(
        <div data-testid="page-shell" className="h-48 overflow-y-auto">
          <div className="h-96">Above</div>
          <SwipeableActionCard onClick={vi.fn()} aria-label="Promo card">
            <SwipeableActionCard.Page title="Page one">Body one</SwipeableActionCard.Page>
            <SwipeableActionCard.Page title="Page two">Body two</SwipeableActionCard.Page>
          </SwipeableActionCard>
          <div className="h-96">Below</div>
        </div>,
      )

      const pageShell = screen.getByTestId("page-shell")
      const scroller = getScroller()

      expect(pageShell).toHaveClass("overflow-y-auto")
      expect(scroller).toHaveClass("touch-manipulation")
      expect(pageShell).not.toHaveClass("touch-pan-x")
    })

    it("locks to pan-x after a horizontal drag on the snap track", () => {
      renderCard({ onClick: vi.fn(), pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 40, clientY: 0 })

      expectScrollerTouchAction(scroller, "x")
    })

    it("locks to pan-y after a vertical drag on the snap track", () => {
      renderCard({ onClick: vi.fn(), pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 0, clientY: 40 })

      expectScrollerTouchAction(scroller, "y")
    })

    it("resets the snap track touch axis after the gesture ends", () => {
      renderCard({ onClick: vi.fn(), pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 40, clientY: 0 })
      fireEvent.pointerUp(scroller, { clientX: 40, clientY: 0 })

      expectScrollerTouchAction(scroller, "both")
    })

    it("does not axis-lock the snap track for a single page", () => {
      renderCard({ pageCount: 1 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 40, clientY: 0 })

      expectScrollerTouchAction(scroller, "both")
    })

    it("never calls preventDefault on pointer moves (native scroll stays enabled)", () => {
      renderCard({ onClick: vi.fn(), pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })

      for (const [clientX, clientY] of [
        [0, 40],
        [40, 0],
        [30, 30],
      ] as const) {
        const move = new PointerEvent("pointermove", {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          pointerId: 1,
          pointerType: "touch",
        })
        const preventDefault = vi.spyOn(move, "preventDefault")
        scroller.dispatchEvent(move)
        expect(preventDefault).not.toHaveBeenCalled()
      }
    })
  })

  describe("directional axis lock scenarios", () => {
    it("locks to vertical scrolling for equal diagonal movement", () => {
      renderCard({ pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 20, clientY: 20 })

      expectScrollerTouchAction(scroller, "y")
    })

    it("does not lock before tap slop is exceeded", () => {
      renderCard({ pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 9, clientY: 0 })

      expectScrollerTouchAction(scroller, "both")
    })

    it("locks at the first axis and ignores later opposite movement", () => {
      renderCard({ pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 40, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 0, clientY: 80 })

      expectScrollerTouchAction(scroller, "x")
    })

    it("ignores non-primary pointer buttons on the snap track", () => {
      renderCard({ pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 2, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 40, clientY: 0 })

      expectScrollerTouchAction(scroller, "both")
    })

    it("resets the snap track touch axis on pointer cancel", () => {
      renderCard({ pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 40, clientY: 0 })
      fireEvent.pointerCancel(scroller)

      expectScrollerTouchAction(scroller, "both")
    })

    it("supports consecutive gestures with opposite axis locks", () => {
      renderCard({ pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 40, clientY: 0 })
      fireEvent.pointerUp(scroller, { clientX: 40, clientY: 0 })
      expectScrollerTouchAction(scroller, "both")

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 0, clientY: 40 })
      expectScrollerTouchAction(scroller, "y")
    })

    it("axis-locks even when the card has no onClick handler", () => {
      renderCard({ pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 40, clientY: 0 })

      expectScrollerTouchAction(scroller, "x")
      expect(getCard()).not.toHaveClass("cursor-pointer")
    })

    it("axis-locks while the active page is disabled", () => {
      render(
        <SwipeableActionCard onClick={vi.fn()} aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">A</SwipeableActionCard.Page>
          <SwipeableActionCard.Page title="Page two" disabled>
            B
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      const scroller = getScroller()
      swipeToPage(scroller, 1)

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 0, clientY: 40 })

      expectScrollerTouchAction(scroller, "y")
    })

    it("unmounts cleanly mid axis lock", () => {
      const { unmount } = renderCard({ pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 40, clientY: 0 })

      expect(() => unmount()).not.toThrow()
    })

    it("still swipes pages after a horizontal axis lock gesture ends", () => {
      renderCard({ pageCount: 2 })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 40, clientY: 0 })
      fireEvent.pointerUp(scroller, { clientX: 40, clientY: 0 })

      swipeToPage(scroller, 1)
      expect(screen.getByText("Page two")).toBeInTheDocument()
    })

    it("does not attach axis-lock handlers to the header region", () => {
      renderCard({ onClick: vi.fn(), pageCount: 2 })
      const title = screen.getByText("Page one")

      fireEvent.pointerDown(title, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(title, { clientX: 40, clientY: 0 })

      expect(getScroller().style.touchAction).toBe("")
    })
  })

  describe("activation gestures on snap track vs header", () => {
    it("activates when the snap track is tapped without movement", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.pointerUp(scroller, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.click(scroller)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("does not activate after a vertical drag starting on the snap track", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 0, clientY: 40 })
      fireEvent.pointerUp(scroller, { button: 0, clientX: 0, clientY: 40 })
      fireEvent.click(scroller)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not activate after a horizontal drag starting on the snap track", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const scroller = getScroller()

      fireEvent.pointerDown(scroller, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(scroller, { clientX: 40, clientY: 0 })
      fireEvent.pointerUp(scroller, { button: 0, clientX: 40, clientY: 0 })
      fireEvent.click(scroller)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("activates when the header is tapped without movement", () => {
      const onClick = vi.fn()
      renderCard({ onClick })

      fireEvent.pointerDown(screen.getByText("Page one"), {
        button: 0,
        clientX: 10,
        clientY: 10,
      })
      fireEvent.pointerUp(screen.getByText("Page one"), {
        button: 0,
        clientX: 10,
        clientY: 10,
      })
      fireEvent.click(getCard())

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("does not activate after a vertical drag starting on the header", () => {
      const onClick = vi.fn()
      renderCard({ onClick })

      fireEvent.pointerDown(screen.getByText("Page one"), {
        button: 0,
        clientX: 0,
        clientY: 0,
      })
      fireEvent.pointerMove(getCard(), { clientX: 0, clientY: 40 })
      fireEvent.click(getCard())

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not activate when horizontal swipe on snap track is followed by click", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const scroller = getScroller()

      swipeToPage(scroller, 1)
      fireEvent.click(scroller)

      expect(onClick).not.toHaveBeenCalled()
      expect(screen.getByText("Page two")).toBeInTheDocument()
    })
  })

  describe("single-page snap track", () => {
    it("still exposes the snap track with touch-manipulation for one page", () => {
      renderCard({ pageCount: 1 })

      expect(getScroller()).toHaveClass("touch-manipulation")
      expect(screen.queryByLabelText("Card pages")).not.toBeInTheDocument()
    })

    it("does not attach scroll indexing for one page", () => {
      renderCard({ pageCount: 1 })
      const scroller = getScroller()

      Object.defineProperty(scroller, "clientWidth", {
        configurable: true,
        value: 320,
      })
      scroller.scrollLeft = 320
      fireEvent.scroll(scroller)

      expect(screen.getByText("Page one")).toBeInTheDocument()
    })
  })

  describe("rendering and children collection", () => {
    it("returns null with no children", () => {
      const { container } = render(<SwipeableActionCard aria-label="Empty" />)
      expect(container).toBeEmptyDOMElement()
    })

    it("returns null when children are not Page markers", () => {
      const { container } = render(
        <SwipeableActionCard aria-label="Empty">
          <div>ignored</div>
          {"text"}
          {null}
          {false}
        </SwipeableActionCard>,
      )
      expect(container).toBeEmptyDOMElement()
    })

    it("ignores non-Page siblings mixed with valid pages", () => {
      render(
        <SwipeableActionCard aria-label="Promo card">
          <div>noise</div>
          <SwipeableActionCard.Page title="Only page">Body</SwipeableActionCard.Page>
          <span>more noise</span>
        </SwipeableActionCard>,
      )

      expect(screen.getByText("Only page")).toBeInTheDocument()
      expect(screen.getByText("Body")).toBeInTheDocument()
      expect(screen.queryByText("noise")).not.toBeInTheDocument()
      expect(screen.queryByTestId("swipeable-action-card-dots")).not.toBeInTheDocument()
    })

    it("supports conditional Page children", () => {
      const showSecond = false
      render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Always">A</SwipeableActionCard.Page>
          {showSecond ? (
            <SwipeableActionCard.Page title="Maybe">B</SwipeableActionCard.Page>
          ) : null}
        </SwipeableActionCard>,
      )

      expect(screen.getByText("Always")).toBeInTheDocument()
      expect(screen.queryByText("Maybe")).not.toBeInTheDocument()
      expect(screen.queryByTestId("swipeable-action-card-dots")).not.toBeInTheDocument()
    })

    it("applies root and page classNames", () => {
      render(
        <SwipeableActionCard aria-label="Promo card" className="shadow-md">
          <SwipeableActionCard.Page title="Titled" className="bg-white">
            Content
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(getCard()).toHaveClass("shadow-md", "rounded-xl", "bg-slate-100")
      expect(screen.getByText("Content")).toHaveClass("w-full", "bg-white")
    })

    it("renders ReactNode titles", () => {
      render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page
            title={
              <span>
                Lister <strong>reviews</strong>
              </span>
            }
          >
            Body
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(screen.getByText("reviews")).toBeInTheDocument()
    })
  })

  describe("title meta", () => {
    it("shows meta beside the active title", () => {
      renderCard()
      expect(screen.getByText("Page one")).toBeInTheDocument()
      expect(screen.getByText("Meta one")).toBeInTheDocument()
    })

    it.each([
      ["null", null],
      ["undefined", undefined],
      ["false", false],
      ["empty string", ""],
    ] as const)("hides meta when value is %s", (_label, meta) => {
      render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Title" meta={meta}>
            Body
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      const titleRow = screen.getByText("Title").parentElement?.parentElement
      expect(titleRow?.children).toHaveLength(1)
    })

    it("updates meta with the active page after swipe", () => {
      renderCard({ pageCount: 2 })
      swipeToPage(screen.getByLabelText("Card pages"), 1)

      expect(screen.getByText("Page two")).toBeInTheDocument()
      expect(screen.getByText("Meta two")).toBeInTheDocument()
      expect(screen.queryByText("Page one")).not.toBeInTheDocument()
      expect(screen.queryByText("Meta one")).not.toBeInTheDocument()
    })
  })

  describe("single vs multi page chrome", () => {
    it("hides dots, carousel label, and aria-live for one page", () => {
      renderCard({ pageCount: 1 })

      expect(screen.queryByTestId("swipeable-action-card-dots")).not.toBeInTheDocument()
      expect(screen.queryByLabelText("Card pages")).not.toBeInTheDocument()
      expect(
        screen.getByText("Page one").parentElement,
      ).not.toHaveAttribute("aria-live")
    })

    it("shows dots, carousel label, and polite live region for multiple pages", () => {
      renderCard({ pageCount: 3 })

      expect(getDots()).toHaveLength(3)
      expect(getDots()[0]).toHaveClass("bg-slate-950")
      expect(getDots()[1]).toHaveClass("bg-slate-300")
      expect(screen.getByLabelText("Card pages")).toHaveAttribute(
        "aria-roledescription",
        "carousel",
      )
      expect(screen.getByText("Page one").parentElement).toHaveAttribute(
        "aria-live",
        "polite",
      )
    })

    it("marks inactive pages aria-hidden and active page visible", () => {
      renderCard({ pageCount: 2 })

      const scroller = screen.getByLabelText("Card pages")
      const slides = within(scroller).getAllByText(/Body/).map((node) => node.parentElement)

      expect(slides[0]).not.toHaveAttribute("aria-hidden")
      expect(slides[1]).toHaveAttribute("aria-hidden", "true")

      swipeToPage(scroller, 1)

      expect(slides[0]).toHaveAttribute("aria-hidden", "true")
      expect(slides[1]).not.toHaveAttribute("aria-hidden")
    })

    it("keeps page bodies edge-to-edge on the snap track", () => {
      renderCard({ pageCount: 2 })

      const scroller = screen.getByLabelText("Card pages")
      expect(scroller).toHaveClass("snap-x", "touch-manipulation")
      for (const body of within(scroller).getAllByText(/Body/)) {
        expect(body.parentElement).toHaveClass("w-full", "snap-center")
      }
    })

    it("uses touch-manipulation on the snap track so neither scroll axis is permanently blocked", () => {
      renderCard({ pageCount: 2 })

      const scroller = screen.getByLabelText("Card pages")
      expect(scroller).toHaveClass("touch-manipulation")
      expect(scroller).not.toHaveClass("touch-pan-x")
      expect(scroller).not.toHaveClass("touch-pan-y")
    })
  })

  describe("swiping / scroll index", () => {
    it("moves title and active dot across all pages", () => {
      renderCard({ pageCount: 3 })
      const scroller = screen.getByLabelText("Card pages")

      swipeToPage(scroller, 1)
      expect(screen.getByText("Page two")).toBeInTheDocument()
      expect(getDots()[1]).toHaveClass("bg-slate-950")

      swipeToPage(scroller, 2)
      expect(screen.getByText("Page three")).toBeInTheDocument()
      expect(getDots()[2]).toHaveClass("bg-slate-950")

      swipeToPage(scroller, 0)
      expect(screen.getByText("Page one")).toBeInTheDocument()
      expect(getDots()[0]).toHaveClass("bg-slate-950")
    })

    it("snaps using rounded scroll progress", () => {
      renderCard({ pageCount: 3 })
      const scroller = screen.getByLabelText("Card pages")
      Object.defineProperty(scroller, "clientWidth", {
        configurable: true,
        value: 320,
      })

      scroller.scrollLeft = 159
      fireEvent.scroll(scroller)
      expect(screen.getByText("Page one")).toBeInTheDocument()

      scroller.scrollLeft = 160
      fireEvent.scroll(scroller)
      expect(screen.getByText("Page two")).toBeInTheDocument()
    })

    it("ignores scroll when clientWidth is zero", () => {
      renderCard({ pageCount: 2 })
      const scroller = screen.getByLabelText("Card pages")
      Object.defineProperty(scroller, "clientWidth", {
        configurable: true,
        value: 0,
      })
      scroller.scrollLeft = 320
      fireEvent.scroll(scroller)

      expect(screen.getByText("Page one")).toBeInTheDocument()
    })
  })

  describe("page count changes", () => {
    it("clamps to first page when shrinking to one page", () => {
      const { rerender } = renderCard({ pageCount: 3 })
      swipeToPage(screen.getByLabelText("Card pages"), 2)

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one" meta="Meta one">
            <span>Body one</span>
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(screen.getByText("Page one")).toBeInTheDocument()
      expect(screen.queryByText("Page three")).not.toBeInTheDocument()
      expect(screen.queryByTestId("swipeable-action-card-dots")).not.toBeInTheDocument()
    })

    it("clamps a high index onto the last remaining page", () => {
      const { rerender } = renderCard({ pageCount: 3 })
      swipeToPage(screen.getByLabelText("Card pages"), 2)

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">A</SwipeableActionCard.Page>
          <SwipeableActionCard.Page title="Page two">B</SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(screen.getByText("Page two")).toBeInTheDocument()
      expect(getDots()).toHaveLength(2)
      expect(getDots()[1]).toHaveClass("bg-slate-950")
    })

    it("keeps the current index when growing pages", () => {
      const { rerender } = render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">A</SwipeableActionCard.Page>
          <SwipeableActionCard.Page title="Page two">B</SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      swipeToPage(screen.getByLabelText("Card pages"), 1)

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">A</SwipeableActionCard.Page>
          <SwipeableActionCard.Page title="Page two">B</SwipeableActionCard.Page>
          <SwipeableActionCard.Page title="Page three">C</SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(screen.getByText("Page two")).toBeInTheDocument()
      expect(getDots()).toHaveLength(3)
      expect(getDots()[1]).toHaveClass("bg-slate-950")
    })

    it("unmounts cleanly when pages become empty", () => {
      const { rerender, container } = renderCard({ pageCount: 2 })

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <div>gone</div>
        </SwipeableActionCard>,
      )

      expect(container).toBeEmptyDOMElement()
    })
  })

  describe("activation click / pointer", () => {
    it("activates the current page index on card click", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      fireEvent.click(getCard())
      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("activates the swiped page index", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const card = getCard()

      swipeToPage(screen.getByLabelText("Card pages"), 1)
      fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.pointerUp(card, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(1)
    })

    it("still activates when movement stays within tap slop", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const card = getCard()

      fireEvent.pointerDown(card, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(card, { clientX: 6, clientY: 6 })
      fireEvent.pointerUp(card, { button: 0, clientX: 6, clientY: 6 })
      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("does not activate after horizontal drag past tap slop", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const card = getCard()

      fireEvent.pointerDown(card, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(card, { clientX: 40, clientY: 0 })
      fireEvent.pointerUp(card, { button: 0, clientX: 40, clientY: 0 })
      fireEvent.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not activate after vertical drag past tap slop", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const card = getCard()

      fireEvent.pointerDown(card, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(card, { clientX: 0, clientY: 40 })
      fireEvent.pointerUp(card, { button: 0, clientX: 0, clientY: 40 })
      fireEvent.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("ignores non-primary pointer buttons", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const card = getCard()

      fireEvent.pointerDown(card, { button: 2, clientX: 0, clientY: 0 })
      fireEvent.pointerMove(card, { clientX: 40, clientY: 0 })
      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("does not activate after pointer cancel", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const card = getCard()

      fireEvent.pointerDown(card, { button: 0, clientX: 0, clientY: 0 })
      fireEvent.pointerCancel(card)
      fireEvent.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not activate after a scroll gesture click", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const card = getCard()

      swipeToPage(screen.getByLabelText("Card pages"), 1)
      fireEvent.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not attach activation styling or handlers without onClick", () => {
      renderCard({ pageCount: 1 })
      const card = getCard()

      expect(card).not.toHaveAttribute("tabindex")
      expect(card).not.toHaveClass("cursor-pointer")
      fireEvent.click(card)
    })

    it("does not activate a disabled page even when onClick is provided", () => {
      const onClick = vi.fn()
      render(
        <SwipeableActionCard onClick={onClick} aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">A</SwipeableActionCard.Page>
          <SwipeableActionCard.Page title="Page two" disabled>
            Coming in the future
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      const card = getCard()
      swipeToPage(screen.getByLabelText("Card pages"), 1)

      expect(screen.getByText("Page two")).toBeInTheDocument()
      expect(card).toHaveAttribute("aria-disabled", "true")
      expect(card).toHaveClass("cursor-default")
      expect(card).not.toHaveClass("cursor-pointer")
      expect(card).not.toHaveAttribute("tabindex")

      fireEvent.click(card)
      fireEvent.keyDown(card, { key: "Enter" })
      expect(onClick).not.toHaveBeenCalled()

      swipeToPage(screen.getByLabelText("Card pages"), 0)
      expect(card).not.toHaveAttribute("aria-disabled")
      expect(card).toHaveClass("cursor-pointer")

      fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.pointerUp(card, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.click(card)
      expect(onClick).toHaveBeenCalledWith(0)
    })
  })

  describe("nested interactive content", () => {
    it("does not activate when a nested button is clicked", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const card = getCard()

      swipeToPage(screen.getByLabelText("Card pages"), 1)
      fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.pointerUp(card, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.click(screen.getByRole("button", { name: "Open app" }))

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not activate when a nested link is clicked", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const card = getCard()

      swipeToPage(screen.getByLabelText("Card pages"), 1)
      fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.pointerUp(card, { button: 0, clientX: 10, clientY: 10 })
      fireEvent.click(screen.getByRole("link", { name: "Open link" }))

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not activate for role=button content", () => {
      const onClick = vi.fn()
      render(
        <SwipeableActionCard onClick={onClick} aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            <div role="button" tabIndex={0}>
              Nested action
            </div>
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      fireEvent.click(screen.getByRole("button", { name: "Nested action" }))
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe("keyboard activation", () => {
    it("activates from Enter and Space when the card is focused", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      const card = getCard()

      fireEvent.keyDown(card, { key: "Enter" })
      fireEvent.keyDown(card, { key: " " })

      expect(onClick).toHaveBeenNthCalledWith(1, 0)
      expect(onClick).toHaveBeenNthCalledWith(2, 0)
    })

    it("ignores other keys", () => {
      const onClick = vi.fn()
      renderCard({ onClick })

      fireEvent.keyDown(getCard(), { key: "Escape" })
      fireEvent.keyDown(getCard(), { key: "ArrowRight" })
      fireEvent.keyDown(getCard(), { key: "Tab" })

      expect(onClick).not.toHaveBeenCalled()
    })

    it("ignores Enter bubbled from nested controls", () => {
      const onClick = vi.fn()
      renderCard({ onClick })
      swipeToPage(screen.getByLabelText("Card pages"), 1)

      fireEvent.keyDown(screen.getByRole("button", { name: "Open app" }), {
        key: "Enter",
      })

      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe("useSwipeableActionCardPageActive", () => {
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

    function PageActiveProbe({ label }: { label: string }) {
      const active = useSwipeableActionCardPageActive()
      return <span>{`${label}:${active ? "on" : "off"}`}</span>
    }

    function setCardInView(isIntersecting: boolean) {
      act(() => {
        observerCallback?.(
          [{ isIntersecting } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      })
    }

    beforeEach(() => {
      observerCallback = null
      observe.mockClear()
      disconnect.mockClear()
      vi.stubGlobal("IntersectionObserver", IntersectionObserverMock)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it("returns true outside a swipeable card", () => {
      function OutsideProbe() {
        const active = useSwipeableActionCardPageActive()
        return <span>{active ? "outside-on" : "outside-off"}</span>
      }

      render(<OutsideProbe />)
      expect(screen.getByText("outside-on")).toBeInTheDocument()
    })

    it("is active only for the current page while the card is in view", () => {
      render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            <PageActiveProbe label="one" />
          </SwipeableActionCard.Page>
          <SwipeableActionCard.Page title="Page two">
            <PageActiveProbe label="two" />
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(screen.getByText("one:off")).toBeInTheDocument()
      expect(screen.getByText("two:off")).toBeInTheDocument()

      setCardInView(true)
      expect(screen.getByText("one:on")).toBeInTheDocument()
      expect(screen.getByText("two:off")).toBeInTheDocument()

      swipeToPage(screen.getByLabelText("Card pages"), 1)
      expect(screen.getByText("one:off")).toBeInTheDocument()
      expect(screen.getByText("two:on")).toBeInTheDocument()

      setCardInView(false)
      expect(screen.getByText("one:off")).toBeInTheDocument()
      expect(screen.getByText("two:off")).toBeInTheDocument()
    })

    it("keeps a single page inactive until the card intersects", () => {
      render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Only">
            <PageActiveProbe label="only" />
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(screen.getByText("only:off")).toBeInTheDocument()
      setCardInView(true)
      expect(screen.getByText("only:on")).toBeInTheDocument()
    })

    it("disconnects the intersection observer on unmount", () => {
      const { unmount } = render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            <PageActiveProbe label="one" />
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(observe).toHaveBeenCalled()
      unmount()
      expect(disconnect).toHaveBeenCalled()
    })

    it("reactivates page zero when the card shrinks back to one page", () => {
      const { rerender } = render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            <PageActiveProbe label="one" />
          </SwipeableActionCard.Page>
          <SwipeableActionCard.Page title="Page two">
            <PageActiveProbe label="two" />
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      setCardInView(true)
      swipeToPage(screen.getByLabelText("Card pages"), 1)
      expect(screen.getByText("two:on")).toBeInTheDocument()

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            <PageActiveProbe label="one" />
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(screen.getByText("one:on")).toBeInTheDocument()
      expect(screen.queryByText("two:on")).not.toBeInTheDocument()
    })
  })
})
