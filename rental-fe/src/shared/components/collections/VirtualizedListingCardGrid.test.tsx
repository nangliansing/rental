import { render, screen } from "@testing-library/react"
import { createRef } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { VirtualizedListingCardGrid } from "./VirtualizedListingCardGrid"

const mocks = vi.hoisted(() => ({
  measureElement: vi.fn(),
  useVirtualizer: vi.fn(),
  useWindowVirtualizer: vi.fn(),
  virtualItems: [
    { index: 0, start: 0, key: "row-0" },
    { index: 1, start: 210, key: "row-1" },
  ],
}))

function createVirtualizerMock(scrollMargin = 0) {
  return {
    getTotalSize: () => 420,
    getVirtualItems: () => mocks.virtualItems,
    measureElement: mocks.measureElement,
    options: { scrollMargin },
  }
}

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: mocks.useVirtualizer,
  useWindowVirtualizer: mocks.useWindowVirtualizer,
}))

class ResizeObserverMock {
  private callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe = vi.fn((target: Element) => {
    this.callback([], this as unknown as ResizeObserver)
    Object.defineProperty(target, "clientWidth", {
      configurable: true,
      value: 360,
    })
    if (target instanceof HTMLElement) {
      Object.defineProperty(target, "offsetTop", {
        configurable: true,
        value: 320,
      })
    }
  })

  disconnect = vi.fn()
}

function createItems(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    _id: `listing-${index}`,
    label: `Listing ${index}`,
  }))
}

describe("VirtualizedListingCardGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useVirtualizer.mockImplementation(() => createVirtualizerMock(0))
    mocks.useWindowVirtualizer.mockImplementation(() => createVirtualizerMock(320))
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  })

  it("renders only the rows selected by the virtualization engine", () => {
    render(
      <VirtualizedListingCardGrid
        items={createItems(30)}
        getItemKey={(item) => item._id}
        renderItem={(item) => <article>{item.label}</article>}
        testId="virtualized-listing-grid"
      />,
    )

    expect(screen.getByTestId("virtualized-listing-grid")).toHaveStyle({
      height: "420px",
    })
    expect(screen.getByText("Listing 0")).toBeInTheDocument()
    expect(screen.getByText("Listing 1")).toBeInTheDocument()
    expect(screen.queryByText("Listing 4")).not.toBeInTheDocument()
  })

  it("uses window virtualization for page-level grids without a scroll root ref", () => {
    render(
      <VirtualizedListingCardGrid
        items={createItems(30)}
        getItemKey={(item) => item._id}
        renderItem={(item) => <article>{item.label}</article>}
      />,
    )

    expect(mocks.useWindowVirtualizer).toHaveBeenCalled()
    expect(mocks.useVirtualizer).not.toHaveBeenCalled()
  })

  it("uses element virtualization when a scroll root ref is provided", () => {
    const rootRef = createRef<HTMLDivElement>()
    rootRef.current = document.createElement("div")

    render(
      <VirtualizedListingCardGrid
        rootRef={rootRef}
        items={createItems(30)}
        getItemKey={(item) => item._id}
        renderItem={(item) => <article>{item.label}</article>}
      />,
    )

    expect(mocks.useVirtualizer).toHaveBeenCalled()
    expect(mocks.useWindowVirtualizer).not.toHaveBeenCalled()

    const config = mocks.useVirtualizer.mock.calls.at(-1)?.[0] as {
      getScrollElement: () => HTMLElement | null
      scrollMargin?: number
    }

    expect(config.getScrollElement()).toBe(rootRef.current)
    expect(config.scrollMargin).toBeUndefined()
  })

  it("passes the list offset as scrollMargin to the window virtualizer", () => {
    render(
      <VirtualizedListingCardGrid
        items={createItems(30)}
        getItemKey={(item) => item._id}
        renderItem={(item) => <article>{item.label}</article>}
        testId="window-grid"
      />,
    )

    expect(mocks.useWindowVirtualizer).toHaveBeenCalled()
    const lastCall = mocks.useWindowVirtualizer.mock.calls.at(-1)?.[0] as {
      scrollMargin: number
      count: number
      overscan: number
    }

    expect(lastCall.scrollMargin).toBe(320)
    expect(lastCall.count).toBeGreaterThan(0)
    expect(lastCall.overscan).toBe(2)
  })

  it("positions window-scrolled rows using the virtualizer scroll margin", () => {
    render(
      <VirtualizedListingCardGrid
        items={createItems(6)}
        getItemKey={(item) => item._id}
        renderItem={(item) => <article>{item.label}</article>}
        testId="window-grid"
      />,
    )

    const grid = screen.getByTestId("window-grid")

    expect(grid.querySelector("[data-index='0']")).toHaveStyle({
      transform: "translateY(-320px)",
    })
    expect(grid.querySelector("[data-index='1']")).toHaveStyle({
      transform: "translateY(-110px)",
    })
  })

  it("positions panel-scrolled rows from the top of the scroll container", () => {
    const rootRef = createRef<HTMLDivElement>()
    rootRef.current = document.createElement("div")

    render(
      <VirtualizedListingCardGrid
        rootRef={rootRef}
        items={createItems(6)}
        getItemKey={(item) => item._id}
        renderItem={(item) => <article>{item.label}</article>}
        testId="panel-grid"
      />,
    )

    const grid = screen.getByTestId("panel-grid")

    expect(grid.querySelector("[data-index='0']")).toHaveStyle({
      transform: "translateY(0px)",
    })
    expect(grid.querySelector("[data-index='1']")).toHaveStyle({
      transform: "translateY(210px)",
    })
  })

  it("estimates row height from the measured container width and column count", () => {
    render(
      <VirtualizedListingCardGrid
        columns="two"
        items={createItems(4)}
        getItemKey={(item) => item._id}
        renderItem={(item) => <article>{item.label}</article>}
      />,
    )

    const config = mocks.useWindowVirtualizer.mock.calls.at(-1)?.[0] as {
      estimateSize: () => number
    }

    expect(config.estimateSize()).toBe(181)
  })

  it("supports fixed two-column layouts inside virtual rows", () => {
    render(
      <VirtualizedListingCardGrid
        columns="two"
        items={createItems(3)}
        getItemKey={(item) => item._id}
        renderItem={(item) => <article>{item.label}</article>}
        testId="two-column-grid"
      />,
    )

    const row = screen.getByTestId("two-column-grid").querySelector("[data-index='0']")
    expect(row).toHaveClass("grid-cols-2")
    expect(row).not.toHaveClass("sm:grid-cols-3")
  })

  it("returns null for empty collections", () => {
    const { container } = render(
      <VirtualizedListingCardGrid
        items={[]}
        getItemKey={() => "empty"}
        renderItem={() => null}
      />,
    )

    expect(container).toBeEmptyDOMElement()

    const lastWindowCall = mocks.useWindowVirtualizer.mock.calls.at(-1)?.[0] as {
      count: number
    }

    expect(lastWindowCall.count).toBe(0)
  })
})
