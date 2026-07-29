import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import {
  SwipeableActionCard,
  clampSwipeableActionCardIndex,
  resolveSwipeableActionCardIndex,
  useSwipeableActionCardPageActive,
} from "./SwipeableActionCard"

type RenderCardOptions = {
  onClick?: (index: number) => void
  pageCount?: 1 | 2 | 3
  className?: string
}

type PrimaryPointerOptions = Partial<{
  pointerId: number
  pointerType: string
  isPrimary: boolean
  button: number
  clientX: number
  clientY: number
}>

let nextAnimationFrameId = 1
let animationFrameCallbacks = new Map<
  number,
  FrameRequestCallback
>()

function primaryPointer(
  overrides: PrimaryPointerOptions = {},
) {
  return {
    pointerId: 1,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    clientX: 0,
    clientY: 0,
    ...overrides,
  }
}

function flushAnimationFrames(timestamp = 0) {
  act(() => {
    const callbacks = [...animationFrameCallbacks.values()]
    animationFrameCallbacks.clear()

    for (const callback of callbacks) {
      callback(timestamp)
    }
  })
}

function renderCard({
  onClick,
  pageCount = 2,
  className,
}: RenderCardOptions = {}) {
  return render(
    <SwipeableActionCard
      onClick={onClick}
      aria-label="Promo card"
      className={className}
    >
      <SwipeableActionCard.Page
        title="Page one"
        meta="Meta one"
      >
        <span>Body one</span>
      </SwipeableActionCard.Page>

      {pageCount > 1 && (
        <SwipeableActionCard.Page
          title="Page two"
          meta="Meta two"
        >
          <span>Body two</span>
          <button type="button">Open app</button>
          <a href="/app">Open link</a>
        </SwipeableActionCard.Page>
      )}

      {pageCount > 2 && (
        <SwipeableActionCard.Page
          title="Page three"
          meta="Meta three"
        >
          <span>Body three</span>
        </SwipeableActionCard.Page>
      )}
    </SwipeableActionCard>,
  )
}

function setScrollerWidth(
  scroller: HTMLElement,
  width = 320,
) {
  Object.defineProperty(scroller, "clientWidth", {
    configurable: true,
    value: width,
  })
}

function scrollToPage(
  scroller: HTMLElement,
  index: number,
  width = 320,
) {
  setScrollerWidth(scroller, width)
  scroller.scrollLeft = index * width
  fireEvent.scroll(scroller)
}

function swipeToPage(
  scroller: HTMLElement,
  index: number,
  width = 320,
) {
  scrollToPage(scroller, index, width)
  flushAnimationFrames()
}

function getCard() {
  return screen.getByRole("region", {
    name: "Promo card",
  })
}

function getScroller() {
  return screen.getByLabelText("Card pages")
}

function getDots() {
  return screen
    .getByTestId("swipeable-action-card-dots")
    .querySelectorAll("span")
}

describe("SwipeableActionCard utilities", () => {
  describe("clampSwipeableActionCardIndex", () => {
    it.each([
      {
        index: 0,
        length: 3,
        expected: 0,
      },
      {
        index: 1,
        length: 3,
        expected: 1,
      },
      {
        index: 2,
        length: 3,
        expected: 2,
      },
      {
        index: -1,
        length: 3,
        expected: 0,
      },
      {
        index: 10,
        length: 3,
        expected: 2,
      },
      {
        index: 1.9,
        length: 3,
        expected: 1,
      },
      {
        index: Number.NaN,
        length: 3,
        expected: 0,
      },
      {
        index: Number.POSITIVE_INFINITY,
        length: 3,
        expected: 0,
      },
      {
        index: Number.NEGATIVE_INFINITY,
        length: 3,
        expected: 0,
      },
      {
        index: 2,
        length: 0,
        expected: 0,
      },
      {
        index: 2,
        length: -1,
        expected: 0,
      },
    ])(
      "clamps index $index for length $length",
      ({ index, length, expected }) => {
        expect(
          clampSwipeableActionCardIndex(index, length),
        ).toBe(expected)
      },
    )
  })

  describe("resolveSwipeableActionCardIndex", () => {
    it.each([
      {
        scrollLeft: 0,
        width: 320,
        count: 3,
        expected: 0,
      },
      {
        scrollLeft: 159,
        width: 320,
        count: 3,
        expected: 0,
      },
      {
        scrollLeft: 160,
        width: 320,
        count: 3,
        expected: 1,
      },
      {
        scrollLeft: 320,
        width: 320,
        count: 3,
        expected: 1,
      },
      {
        scrollLeft: 640,
        width: 320,
        count: 3,
        expected: 2,
      },
      {
        scrollLeft: 2_000,
        width: 320,
        count: 3,
        expected: 2,
      },
      {
        scrollLeft: -100,
        width: 320,
        count: 3,
        expected: 0,
      },
    ])(
      "resolves scrollLeft $scrollLeft to page $expected",
      ({
        scrollLeft,
        width,
        count,
        expected,
      }) => {
        expect(
          resolveSwipeableActionCardIndex(
            scrollLeft,
            width,
            count,
          ),
        ).toBe(expected)
      },
    )

    it.each([
      {
        scrollLeft: 320,
        width: 0,
        count: 2,
      },
      {
        scrollLeft: 320,
        width: -1,
        count: 2,
      },
      {
        scrollLeft: 320,
        width: 320,
        count: 0,
      },
      {
        scrollLeft: 320,
        width: 320,
        count: -1,
      },
      {
        scrollLeft: Number.NaN,
        width: 320,
        count: 2,
      },
      {
        scrollLeft: Number.POSITIVE_INFINITY,
        width: 320,
        count: 2,
      },
    ])(
      "returns null for invalid scroll measurements",
      ({ scrollLeft, width, count }) => {
        expect(
          resolveSwipeableActionCardIndex(
            scrollLeft,
            width,
            count,
          ),
        ).toBeNull()
      },
    )
  })
})

describe("SwipeableActionCard", () => {
  beforeEach(() => {
    nextAnimationFrameId = 1
    animationFrameCallbacks = new Map()

    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        const id = nextAnimationFrameId
        nextAnimationFrameId += 1
        animationFrameCallbacks.set(id, callback)
        return id
      }),
    )

    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((id: number) => {
        animationFrameCallbacks.delete(id)
      }),
    )
  })

  afterEach(() => {
    animationFrameCallbacks.clear()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe("rendering and child collection", () => {
    it("returns null with no children", () => {
      const { container } = render(
        <SwipeableActionCard aria-label="Empty" />,
      )

      expect(container).toBeEmptyDOMElement()
    })

    it("returns null when children are not Page markers", () => {
      const { container } = render(
        <SwipeableActionCard aria-label="Empty">
          <div>Ignored element</div>
          {"Ignored text"}
          {null}
          {false}
        </SwipeableActionCard>,
      )

      expect(container).toBeEmptyDOMElement()
    })

    it("ignores non-Page siblings mixed with valid pages", () => {
      render(
        <SwipeableActionCard aria-label="Promo card">
          <div>Noise</div>

          <SwipeableActionCard.Page title="Only page">
            Body
          </SwipeableActionCard.Page>

          <span>More noise</span>
        </SwipeableActionCard>,
      )

      expect(
        screen.getByText("Only page"),
      ).toBeInTheDocument()
      expect(screen.getByText("Body")).toBeInTheDocument()
      expect(
        screen.queryByText("Noise"),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText("More noise"),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId(
          "swipeable-action-card-dots",
        ),
      ).not.toBeInTheDocument()
    })

    it("supports conditional Page children", () => {
      const showSecondPage = false

      render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Always">
            A
          </SwipeableActionCard.Page>

          {showSecondPage ? (
            <SwipeableActionCard.Page title="Maybe">
              B
            </SwipeableActionCard.Page>
          ) : null}
        </SwipeableActionCard>,
      )

      expect(
        screen.getByText("Always"),
      ).toBeInTheDocument()
      expect(
        screen.queryByText("Maybe"),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId(
          "swipeable-action-card-dots",
        ),
      ).not.toBeInTheDocument()
    })

    it("applies root and page class names", () => {
      render(
        <SwipeableActionCard
          aria-label="Promo card"
          className="shadow-md"
        >
          <SwipeableActionCard.Page
            title="Titled"
            className="bg-white"
          >
            Content
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(getCard()).toHaveClass(
        "shadow-md",
        "rounded-xl",
        "bg-slate-100",
      )

      expect(
        screen.getByText("Content"),
      ).toHaveClass("w-full", "bg-white")
    })

    it("supports ReactNode titles and metadata", () => {
      render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page
            title={
              <span>
                Lister <strong>reviews</strong>
              </span>
            }
            meta={
              <span>
                <strong>30</strong> ratings
              </span>
            }
          >
            Body
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(
        screen.getByText("reviews"),
      ).toBeInTheDocument()
      expect(screen.getByText("30")).toBeInTheDocument()
      expect(
        screen.getByText(/ratings/),
      ).toBeInTheDocument()
    })

    it("preserves explicit Page keys", () => {
      const { rerender } = render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page
            key="first"
            title="First"
          >
            First body
          </SwipeableActionCard.Page>

          <SwipeableActionCard.Page
            key="second"
            title="Second"
          >
            Second body
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      swipeToPage(getScroller(), 1)

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page
            key="first"
            title="Updated first"
          >
            Updated first body
          </SwipeableActionCard.Page>

          <SwipeableActionCard.Page
            key="second"
            title="Updated second"
          >
            Updated second body
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(
        screen.getByText("Updated second"),
      ).toBeInTheDocument()
    })
  })

  describe("title and metadata", () => {
    it("shows metadata beside the active title", () => {
      renderCard()

      expect(
        screen.getByText("Page one"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("Meta one"),
      ).toBeInTheDocument()
    })

    it.each([
      ["null", null],
      ["undefined", undefined],
      ["false", false],
      ["empty string", ""],
    ] as const)(
      "hides metadata when its value is %s",
      (_label, meta) => {
        render(
          <SwipeableActionCard aria-label="Promo card">
            <SwipeableActionCard.Page
              title="Title"
              meta={meta}
            >
              Body
            </SwipeableActionCard.Page>
          </SwipeableActionCard>,
        )

        const titleContainer =
          screen.getByText("Title").parentElement

        expect(titleContainer?.children).toHaveLength(1)
      },
    )

    it("renders numeric metadata including zero", () => {
      render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page
            title="Reviews"
            meta={0}
          >
            Body
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(screen.getByText("0")).toBeInTheDocument()
    })

    it("updates title and metadata after swiping", () => {
      renderCard({ pageCount: 2 })

      swipeToPage(getScroller(), 1)

      expect(
        screen.getByText("Page two"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("Meta two"),
      ).toBeInTheDocument()
      expect(
        screen.queryByText("Page one"),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText("Meta one"),
      ).not.toBeInTheDocument()
    })
  })

  describe("single-page and multi-page chrome", () => {
    it("hides carousel chrome for a single page", () => {
      renderCard({ pageCount: 1 })

      expect(
        screen.queryByTestId(
          "swipeable-action-card-dots",
        ),
      ).not.toBeInTheDocument()

      expect(
        screen.queryByLabelText("Card pages"),
      ).not.toBeInTheDocument()

      const liveRegion =
        screen.getByText("Page one").parentElement

      expect(liveRegion).not.toHaveAttribute("aria-live")
      expect(liveRegion).not.toHaveAttribute("aria-atomic")
    })

    it("shows carousel chrome for multiple pages", () => {
      renderCard({ pageCount: 3 })

      expect(getDots()).toHaveLength(3)
      expect(getDots()[0]).toHaveClass("bg-slate-950")
      expect(getDots()[1]).toHaveClass("bg-slate-300")
      expect(getDots()[2]).toHaveClass("bg-slate-300")

      expect(getScroller()).toHaveAttribute(
        "aria-roledescription",
        "carousel",
      )

      const liveRegion =
        screen.getByText("Page one").parentElement

      expect(liveRegion).toHaveAttribute(
        "aria-live",
        "polite",
      )
      expect(liveRegion).toHaveAttribute(
        "aria-atomic",
        "true",
      )
    })

    it("marks inactive pages aria-hidden", () => {
      renderCard({ pageCount: 2 })

      const scroller = getScroller()
      const slides = within(scroller)
        .getAllByText(/Body/)
        .map((node) => node.parentElement)

      expect(slides[0]).not.toHaveAttribute(
        "aria-hidden",
      )
      expect(slides[1]).toHaveAttribute(
        "aria-hidden",
        "true",
      )

      swipeToPage(scroller, 1)

      expect(slides[0]).toHaveAttribute(
        "aria-hidden",
        "true",
      )
      expect(slides[1]).not.toHaveAttribute(
        "aria-hidden",
      )
    })

    it("allows vertical page scrolling while retaining horizontal snapping", () => {
      renderCard({ pageCount: 2 })

      const scroller = getScroller()

      expect(scroller).toHaveClass(
        "touch-auto",
        "snap-x",
        "snap-mandatory",
        "overflow-x-auto",
        "overscroll-x-contain",
      )

      expect(scroller).not.toHaveClass("touch-pan-x")
    })

    it("keeps each page edge-to-edge on the snap track", () => {
      renderCard({ pageCount: 2 })

      const pageBodies = within(getScroller()).getAllByText(
        /Body/,
      )

      for (const body of pageBodies) {
        expect(body.parentElement).toHaveClass(
          "w-full",
          "shrink-0",
          "snap-center",
          "snap-always",
        )

        expect(body.parentElement).not.toHaveClass(
          "min-w-full",
        )
      }
    })

    it("hides the native scrollbar", () => {
      renderCard({ pageCount: 2 })

      expect(getScroller()).toHaveClass(
        "[scrollbar-width:none]",
        "[&::-webkit-scrollbar]:hidden",
      )
    })
  })

  describe("scrolling and active-page calculation", () => {
    it("moves the title and active dot across all pages", () => {
      renderCard({ pageCount: 3 })

      const scroller = getScroller()

      swipeToPage(scroller, 1)

      expect(
        screen.getByText("Page two"),
      ).toBeInTheDocument()
      expect(getDots()[1]).toHaveClass("bg-slate-950")

      swipeToPage(scroller, 2)

      expect(
        screen.getByText("Page three"),
      ).toBeInTheDocument()
      expect(getDots()[2]).toHaveClass("bg-slate-950")

      swipeToPage(scroller, 0)

      expect(
        screen.getByText("Page one"),
      ).toBeInTheDocument()
      expect(getDots()[0]).toHaveClass("bg-slate-950")
    })

    it("uses rounded scroll progress", () => {
      renderCard({ pageCount: 3 })

      const scroller = getScroller()
      setScrollerWidth(scroller, 320)

      scroller.scrollLeft = 159
      fireEvent.scroll(scroller)
      flushAnimationFrames()

      expect(
        screen.getByText("Page one"),
      ).toBeInTheDocument()

      scroller.scrollLeft = 160
      fireEvent.scroll(scroller)
      flushAnimationFrames()

      expect(
        screen.getByText("Page two"),
      ).toBeInTheDocument()
    })

    it("ignores scrolling when clientWidth is zero", () => {
      renderCard({ pageCount: 2 })

      const scroller = getScroller()
      setScrollerWidth(scroller, 0)

      scroller.scrollLeft = 320
      fireEvent.scroll(scroller)
      flushAnimationFrames()

      expect(
        screen.getByText("Page one"),
      ).toBeInTheDocument()
    })

    it("does not update until the animation frame runs", () => {
      renderCard({ pageCount: 2 })

      const scroller = getScroller()

      scrollToPage(scroller, 1)

      expect(
        screen.getByText("Page one"),
      ).toBeInTheDocument()

      flushAnimationFrames()

      expect(
        screen.getByText("Page two"),
      ).toBeInTheDocument()
    })

    it("batches multiple scroll events into one animation frame", () => {
      renderCard({ pageCount: 3 })

      const scroller = getScroller()
      setScrollerWidth(scroller, 320)

      scroller.scrollLeft = 100
      fireEvent.scroll(scroller)

      scroller.scrollLeft = 500
      fireEvent.scroll(scroller)

      scroller.scrollLeft = 640
      fireEvent.scroll(scroller)

      expect(requestAnimationFrame).toHaveBeenCalledTimes(1)

      flushAnimationFrames()

      expect(
        screen.getByText("Page three"),
      ).toBeInTheDocument()
    })

    it("does not rerender to an invalid index from excessive scrollLeft", () => {
      renderCard({ pageCount: 2 })

      const scroller = getScroller()
      setScrollerWidth(scroller, 320)

      scroller.scrollLeft = 10_000
      fireEvent.scroll(scroller)
      flushAnimationFrames()

      expect(
        screen.getByText("Page two"),
      ).toBeInTheDocument()
      expect(getDots()[1]).toHaveClass("bg-slate-950")
    })
  })

  describe("page-count changes", () => {
    it("clamps to page zero when shrinking to one page", () => {
      const { rerender } = renderCard({
        pageCount: 3,
      })

      swipeToPage(getScroller(), 2)

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page
            title="Page one"
            meta="Meta one"
          >
            <span>Body one</span>
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(
        screen.getByText("Page one"),
      ).toBeInTheDocument()
      expect(
        screen.queryByText("Page three"),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByTestId(
          "swipeable-action-card-dots",
        ),
      ).not.toBeInTheDocument()
    })

    it("clamps a high index to the final remaining page", () => {
      const { rerender } = renderCard({
        pageCount: 3,
      })

      swipeToPage(getScroller(), 2)

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            A
          </SwipeableActionCard.Page>

          <SwipeableActionCard.Page title="Page two">
            B
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(
        screen.getByText("Page two"),
      ).toBeInTheDocument()
      expect(getDots()).toHaveLength(2)
      expect(getDots()[1]).toHaveClass("bg-slate-950")
    })

    it("keeps the current index when adding pages", () => {
      const { rerender } = render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            A
          </SwipeableActionCard.Page>

          <SwipeableActionCard.Page title="Page two">
            B
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      swipeToPage(getScroller(), 1)

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            A
          </SwipeableActionCard.Page>

          <SwipeableActionCard.Page title="Page two">
            B
          </SwipeableActionCard.Page>

          <SwipeableActionCard.Page title="Page three">
            C
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(
        screen.getByText("Page two"),
      ).toBeInTheDocument()
      expect(getDots()).toHaveLength(3)
      expect(getDots()[1]).toHaveClass("bg-slate-950")
    })

    it("remains on page zero when growing from one page", () => {
      const { rerender } = render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            A
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            A
          </SwipeableActionCard.Page>

          <SwipeableActionCard.Page title="Page two">
            B
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(
        screen.getByText("Page one"),
      ).toBeInTheDocument()
      expect(getDots()[0]).toHaveClass("bg-slate-950")
    })

    it("unmounts the card when pages become empty", () => {
      const { rerender, container } = renderCard({
        pageCount: 2,
      })

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <div>Not a marker</div>
        </SwipeableActionCard>,
      )

      expect(container).toBeEmptyDOMElement()
    })

    it("can mount again after becoming empty", () => {
      const { rerender, container } = renderCard({
        pageCount: 2,
      })

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <div>Not a marker</div>
        </SwipeableActionCard>,
      )

      expect(container).toBeEmptyDOMElement()

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Restored">
            Restored body
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(
        screen.getByText("Restored"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("Restored body"),
      ).toBeInTheDocument()
    })
  })

  describe("root activation state", () => {
    it("is focusable and styled as interactive when onClick exists", () => {
      renderCard({ onClick: vi.fn() })

      const card = getCard()

      expect(card).toHaveAttribute("tabindex", "0")
      expect(card).toHaveClass("cursor-pointer")
      expect(card).toHaveClass("hover:bg-slate-200/80")
      expect(card).toHaveClass(
        "focus-visible:outline-none",
      )
    })

    it("is not focusable or interactively styled without onClick", () => {
      renderCard({ pageCount: 1 })

      const card = getCard()

      expect(card).not.toHaveAttribute("tabindex")
      expect(card).not.toHaveClass("cursor-pointer")
      expect(card).not.toHaveClass(
        "hover:bg-slate-200/80",
      )

      fireEvent.click(card)
    })

    it("forwards the accessible label to the region", () => {
      renderCard()

      expect(getCard()).toHaveAttribute(
        "aria-label",
        "Promo card",
      )
      expect(getCard()).toHaveAttribute("role", "region")
    })
  })

  describe("click and pointer activation", () => {
    it("activates the current page on a direct click", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      fireEvent.click(getCard())

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("activates the currently swiped page", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      swipeToPage(getScroller(), 1)

      fireEvent.pointerDown(
        card,
        primaryPointer({
          clientX: 10,
          clientY: 10,
        }),
      )

      fireEvent.pointerUp(
        card,
        primaryPointer({
          clientX: 10,
          clientY: 10,
        }),
      )

      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(1)
    })

    it("activates when movement remains within tap slop", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(card, primaryPointer())

      fireEvent.pointerMove(
        card,
        primaryPointer({
          clientX: 6,
          clientY: 6,
        }),
      )

      fireEvent.pointerUp(
        card,
        primaryPointer({
          clientX: 6,
          clientY: 6,
        }),
      )

      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("activates at exactly the tap-slop boundary", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(card, primaryPointer())

      fireEvent.pointerMove(
        card,
        primaryPointer({
          clientX: 10,
          clientY: 0,
        }),
      )

      fireEvent.pointerUp(
        card,
        primaryPointer({
          clientX: 10,
          clientY: 0,
        }),
      )

      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("does not activate after horizontal movement past tap slop", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(card, primaryPointer())

      fireEvent.pointerMove(
        card,
        primaryPointer({
          clientX: 40,
          clientY: 0,
        }),
      )

      fireEvent.pointerUp(
        card,
        primaryPointer({
          clientX: 40,
          clientY: 0,
        }),
      )

      fireEvent.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not activate after vertical movement past tap slop", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(card, primaryPointer())

      fireEvent.pointerMove(
        card,
        primaryPointer({
          clientX: 0,
          clientY: 40,
        }),
      )

      fireEvent.pointerUp(
        card,
        primaryPointer({
          clientX: 0,
          clientY: 40,
        }),
      )

      fireEvent.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not activate after diagonal movement past tap slop", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(card, primaryPointer())

      fireEvent.pointerMove(
        card,
        primaryPointer({
          clientX: 8,
          clientY: 8,
        }),
      )

      fireEvent.pointerUp(
        card,
        primaryPointer({
          clientX: 8,
          clientY: 8,
        }),
      )

      fireEvent.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("ignores movement from a different pointer", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(
        card,
        primaryPointer({
          pointerId: 1,
        }),
      )

      fireEvent.pointerMove(
        card,
        primaryPointer({
          pointerId: 2,
          isPrimary: false,
          clientX: 100,
        }),
      )

      fireEvent.pointerUp(
        card,
        primaryPointer({
          pointerId: 1,
        }),
      )

      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("does not clear the active pointer from another pointer's pointerup", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(
        card,
        primaryPointer({
          pointerId: 1,
        }),
      )

      fireEvent.pointerUp(
        card,
        primaryPointer({
          pointerId: 2,
          isPrimary: false,
        }),
      )

      fireEvent.pointerMove(
        card,
        primaryPointer({
          pointerId: 1,
          clientX: 40,
        }),
      )

      fireEvent.pointerUp(
        card,
        primaryPointer({
          pointerId: 1,
          clientX: 40,
        }),
      )

      fireEvent.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("ignores non-primary touch pointers", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(
        card,
        primaryPointer({
          pointerId: 2,
          isPrimary: false,
        }),
      )

      fireEvent.pointerMove(
        card,
        primaryPointer({
          pointerId: 2,
          isPrimary: false,
          clientX: 100,
        }),
      )

      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("ignores secondary mouse-button pointerdown", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(
        card,
        primaryPointer({
          pointerType: "mouse",
          button: 2,
        }),
      )

      fireEvent.pointerMove(
        card,
        primaryPointer({
          pointerType: "mouse",
          button: 2,
          clientX: 100,
        }),
      )

      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("accepts primary mouse-button pointerdown", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(
        card,
        primaryPointer({
          pointerType: "mouse",
          button: 0,
        }),
      )

      fireEvent.pointerMove(
        card,
        primaryPointer({
          pointerType: "mouse",
          button: 0,
          clientX: 40,
        }),
      )

      fireEvent.pointerUp(
        card,
        primaryPointer({
          pointerType: "mouse",
          button: 0,
          clientX: 40,
        }),
      )

      fireEvent.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not activate after pointer cancellation", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(card, primaryPointer())

      fireEvent.pointerCancel(card, primaryPointer())

      fireEvent.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("clears click suppression after consuming one click", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()

      fireEvent.pointerDown(card, primaryPointer())

      fireEvent.pointerMove(
        card,
        primaryPointer({
          clientX: 40,
        }),
      )

      fireEvent.pointerUp(
        card,
        primaryPointer({
          clientX: 40,
        }),
      )

      fireEvent.click(card)
      expect(onClick).not.toHaveBeenCalled()

      fireEvent.click(card)
      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("does not suppress an unrelated click after programmatic scrolling", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      swipeToPage(getScroller(), 1)
      fireEvent.click(getCard())

      expect(onClick).toHaveBeenCalledExactlyOnceWith(1)
    })

    it("suppresses activation after scrolling during a pointer gesture", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()
      const scroller = getScroller()

      fireEvent.pointerDown(
        card,
        primaryPointer({
          clientX: 100,
          clientY: 10,
        }),
      )

      swipeToPage(scroller, 1)

      fireEvent.pointerUp(
        card,
        primaryPointer({
          clientX: 20,
          clientY: 10,
        }),
      )

      fireEvent.click(card)

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not suppress a click for scroll events after pointerup", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      const card = getCard()
      const scroller = getScroller()

      fireEvent.pointerDown(card, primaryPointer())
      fireEvent.pointerUp(card, primaryPointer())

      swipeToPage(scroller, 1)
      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(1)
    })
  })

  describe("disabled pages", () => {
    function renderDisabledCard(onClick = vi.fn()) {
      return {
        onClick,
        ...render(
          <SwipeableActionCard
            onClick={onClick}
            aria-label="Promo card"
          >
            <SwipeableActionCard.Page title="Page one">
              Active page
            </SwipeableActionCard.Page>

            <SwipeableActionCard.Page
              title="Page two"
              disabled
            >
              Coming in the future
            </SwipeableActionCard.Page>
          </SwipeableActionCard>,
        ),
      }
    }

    it("prevents activation on a disabled page", () => {
      const { onClick } = renderDisabledCard()

      const card = getCard()

      swipeToPage(getScroller(), 1)

      fireEvent.click(card)
      fireEvent.keyDown(card, { key: "Enter" })
      fireEvent.keyDown(card, { key: " " })

      expect(onClick).not.toHaveBeenCalled()
    })

    it("sets disabled accessibility and visual state", () => {
      renderDisabledCard()

      const card = getCard()

      swipeToPage(getScroller(), 1)

      expect(card).toHaveAttribute(
        "aria-disabled",
        "true",
      )
      expect(card).toHaveClass("cursor-default")
      expect(card).not.toHaveClass("cursor-pointer")
      expect(card).not.toHaveAttribute("tabindex")

      expect(
        screen.getByText("Page two"),
      ).toHaveClass("text-slate-500")

      expect(getDots()[1]).toHaveClass("bg-slate-400")
    })

    it("restores activation when returning to an enabled page", () => {
      const { onClick } = renderDisabledCard()

      const card = getCard()

      swipeToPage(getScroller(), 1)

      expect(card).toHaveAttribute(
        "aria-disabled",
        "true",
      )

      swipeToPage(getScroller(), 0)

      expect(card).not.toHaveAttribute("aria-disabled")
      expect(card).toHaveClass("cursor-pointer")
      expect(card).toHaveAttribute("tabindex", "0")

      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("keeps a disabled page swipeable", () => {
      renderDisabledCard()

      swipeToPage(getScroller(), 1)

      expect(
        screen.getByText("Page two"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("Coming in the future"),
      ).toBeInTheDocument()
    })

    it("does not mark the card disabled when there is no onClick and page is enabled", () => {
      renderCard({ pageCount: 1 })

      expect(getCard()).not.toHaveAttribute(
        "aria-disabled",
      )
    })
  })

  describe("nested interactive content", () => {
    it("does not activate when a nested button is clicked", () => {
      const onClick = vi.fn()

      renderCard({ onClick })
      swipeToPage(getScroller(), 1)

      fireEvent.click(
        screen.getByRole("button", {
          name: "Open app",
        }),
      )

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not activate when a nested link is clicked", () => {
      const onClick = vi.fn()

      renderCard({ onClick })
      swipeToPage(getScroller(), 1)

      fireEvent.click(
        screen.getByRole("link", {
          name: "Open link",
        }),
      )

      expect(onClick).not.toHaveBeenCalled()
    })

    it.each([
      ["button", "button"],
      ["link", "link"],
      ["checkbox", "checkbox"],
      ["menuitem", "menuitem"],
      ["option", "option"],
      ["radio", "radio"],
      ["switch", "switch"],
      ["tab", "tab"],
    ] as const)(
      "does not activate nested role=%s content",
      (label, role) => {
        const onClick = vi.fn()

        render(
          <SwipeableActionCard
            onClick={onClick}
            aria-label="Promo card"
          >
            <SwipeableActionCard.Page title="Page one">
              <div role={role} tabIndex={0}>
                {label} action
              </div>
            </SwipeableActionCard.Page>
          </SwipeableActionCard>,
        )

        fireEvent.click(
          screen.getByRole(role, {
            name: `${label} action`,
          }),
        )

        expect(onClick).not.toHaveBeenCalled()
      },
    )

    it("does not activate nested contenteditable content", () => {
      const onClick = vi.fn()

      render(
        <SwipeableActionCard
          onClick={onClick}
          aria-label="Promo card"
        >
          <SwipeableActionCard.Page title="Page one">
            <div
              contentEditable
              suppressContentEditableWarning
            >
              Editable content
            </div>
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      fireEvent.click(
        screen.getByText("Editable content"),
      )

      expect(onClick).not.toHaveBeenCalled()
    })

    it("does not activate when a child inside a nested button is clicked", () => {
      const onClick = vi.fn()

      render(
        <SwipeableActionCard
          onClick={onClick}
          aria-label="Promo card"
        >
          <SwipeableActionCard.Page title="Page one">
            <button type="button">
              <span>Nested button text</span>
            </button>
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      fireEvent.click(
        screen.getByText("Nested button text"),
      )

      expect(onClick).not.toHaveBeenCalled()
    })

    it("activates when ordinary non-interactive content is clicked", () => {
      const onClick = vi.fn()

      render(
        <SwipeableActionCard
          onClick={onClick}
          aria-label="Promo card"
        >
          <SwipeableActionCard.Page title="Page one">
            <div>
              <span>Ordinary content</span>
            </div>
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      fireEvent.click(
        screen.getByText("Ordinary content"),
      )

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })
  })

  describe("keyboard activation", () => {
    it("activates with Enter", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      fireEvent.keyDown(getCard(), {
        key: "Enter",
      })

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it("activates with Space", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      fireEvent.keyDown(getCard(), {
        key: " ",
      })

      expect(onClick).toHaveBeenCalledExactlyOnceWith(0)
    })

    it.each(["Enter", " "])(
      "prevents the default action for %s",
      (key) => {
        renderCard({ onClick: vi.fn() })

        const wasNotCancelled = fireEvent.keyDown(
          getCard(),
          {
            key,
          },
        )

        expect(wasNotCancelled).toBe(false)
      },
    )

    it.each([
      "Escape",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Tab",
      "a",
    ])("ignores the %s key", (key) => {
      const onClick = vi.fn()

      renderCard({ onClick })

      fireEvent.keyDown(getCard(), { key })

      expect(onClick).not.toHaveBeenCalled()
    })

    it("activates the current swiped page with the keyboard", () => {
      const onClick = vi.fn()

      renderCard({ onClick })

      swipeToPage(getScroller(), 1)

      fireEvent.keyDown(getCard(), {
        key: "Enter",
      })

      expect(onClick).toHaveBeenCalledExactlyOnceWith(1)
    })

    it("ignores Enter bubbled from a nested button", () => {
      const onClick = vi.fn()

      renderCard({ onClick })
      swipeToPage(getScroller(), 1)

      fireEvent.keyDown(
        screen.getByRole("button", {
          name: "Open app",
        }),
        {
          key: "Enter",
        },
      )

      expect(onClick).not.toHaveBeenCalled()
    })

    it("ignores Space bubbled from a nested button", () => {
      const onClick = vi.fn()

      renderCard({ onClick })
      swipeToPage(getScroller(), 1)

      fireEvent.keyDown(
        screen.getByRole("button", {
          name: "Open app",
        }),
        {
          key: " ",
        },
      )

      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe("animation-frame cleanup", () => {
    it("cancels a pending animation frame on unmount", () => {
      const { unmount } = renderCard({
        pageCount: 2,
      })

      const scroller = getScroller()

      scrollToPage(scroller, 1)

      expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
      expect(animationFrameCallbacks.size).toBe(1)

      unmount()

      expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
      expect(animationFrameCallbacks.size).toBe(0)
    })

    it("does not cancel a completed animation frame on unmount", () => {
      const { unmount } = renderCard({
        pageCount: 2,
      })

      scrollToPage(getScroller(), 1)
      flushAnimationFrames()

      unmount()

      expect(cancelAnimationFrame).not.toHaveBeenCalled()
    })
  })

  describe("useSwipeableActionCardPageActive", () => {
    let observerCallback:
      | IntersectionObserverCallback
      | null = null

    const observe = vi.fn()
    const unobserve = vi.fn()
    const disconnect = vi.fn()
    const takeRecords = vi.fn(() => [])

    class IntersectionObserverMock
      implements IntersectionObserver
    {
      readonly root = null
      readonly rootMargin = ""
      readonly thresholds = []

      constructor(
        callback: IntersectionObserverCallback,
      ) {
        observerCallback = callback
      }

      observe = observe
      unobserve = unobserve
      disconnect = disconnect
      takeRecords = takeRecords
    }

    function PageActiveProbe({
      label,
    }: {
      label: string
    }) {
      const active =
        useSwipeableActionCardPageActive()

      return (
        <span>
          {`${label}:${active ? "on" : "off"}`}
        </span>
      )
    }

    function setCardInView(isIntersecting: boolean) {
      act(() => {
        observerCallback?.(
          [
            {
              isIntersecting,
              intersectionRatio: isIntersecting
                ? 1
                : 0,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        )
      })
    }

    beforeEach(() => {
      observerCallback = null

      observe.mockClear()
      unobserve.mockClear()
      disconnect.mockClear()
      takeRecords.mockClear()

      vi.stubGlobal(
        "IntersectionObserver",
        IntersectionObserverMock,
      )
    })

    it("returns true outside a swipeable card", () => {
      function OutsideProbe() {
        const active =
          useSwipeableActionCardPageActive()

        return (
          <span>
            {active ? "outside-on" : "outside-off"}
          </span>
        )
      }

      render(<OutsideProbe />)

      expect(
        screen.getByText("outside-on"),
      ).toBeInTheDocument()
    })

    it("starts inactive before the card intersects", () => {
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

      expect(
        screen.getByText("one:off"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("two:off"),
      ).toBeInTheDocument()
    })

    it("is active only for the current page while in view", () => {
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

      setCardInView(true)

      expect(
        screen.getByText("one:on"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("two:off"),
      ).toBeInTheDocument()

      swipeToPage(getScroller(), 1)

      expect(
        screen.getByText("one:off"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("two:on"),
      ).toBeInTheDocument()
    })

    it("deactivates every page when leaving the viewport", () => {
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

      setCardInView(true)
      swipeToPage(getScroller(), 1)

      expect(
        screen.getByText("two:on"),
      ).toBeInTheDocument()

      setCardInView(false)

      expect(
        screen.getByText("one:off"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("two:off"),
      ).toBeInTheDocument()
    })

    it("reactivates the current page when re-entering the viewport", () => {
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

      setCardInView(true)
      swipeToPage(getScroller(), 1)
      setCardInView(false)
      setCardInView(true)

      expect(
        screen.getByText("one:off"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("two:on"),
      ).toBeInTheDocument()
    })

    it("keeps a single page inactive until intersection", () => {
      render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Only">
            <PageActiveProbe label="only" />
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(
        screen.getByText("only:off"),
      ).toBeInTheDocument()

      setCardInView(true)

      expect(
        screen.getByText("only:on"),
      ).toBeInTheDocument()
    })

    it("reactivates page zero after shrinking to one page", () => {
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
      swipeToPage(getScroller(), 1)

      expect(
        screen.getByText("two:on"),
      ).toBeInTheDocument()

      rerender(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            <PageActiveProbe label="one" />
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(
        screen.getByText("one:on"),
      ).toBeInTheDocument()
      expect(
        screen.queryByText("two:on"),
      ).not.toBeInTheDocument()
    })

    it("observes the rendered card element", () => {
      render(
        <SwipeableActionCard aria-label="Promo card">
          <SwipeableActionCard.Page title="Page one">
            <PageActiveProbe label="one" />
          </SwipeableActionCard.Page>
        </SwipeableActionCard>,
      )

      expect(observe).toHaveBeenCalledTimes(1)
      expect(observe).toHaveBeenCalledWith(getCard())
    })

    it("disconnects the observer on unmount", () => {
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
  })
})