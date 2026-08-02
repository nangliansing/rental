import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { VirtualizedListingCardGrid } from "./VirtualizedListingCardGrid"

const measureElement = vi.fn()

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: () => ({
    getTotalSize: () => 420,
    getVirtualItems: () => [
      { index: 0, start: 0, key: "row-0" },
      { index: 1, start: 210, key: "row-1" },
    ],
    measureElement,
  }),
}))

class ResizeObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()
}

describe("VirtualizedListingCardGrid", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  })

  it("renders only the rows selected by the virtualization engine", () => {
    const items = Array.from({ length: 30 }, (_, index) => ({
      _id: `listing-${index}`,
      label: `Listing ${index}`,
    }))

    render(
      <VirtualizedListingCardGrid
        items={items}
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

  it("supports fixed two-column layouts inside virtual rows", () => {
    render(
      <VirtualizedListingCardGrid
        columns="two"
        items={[
          { _id: "listing-1", label: "Listing 1" },
          { _id: "listing-2", label: "Listing 2" },
          { _id: "listing-3", label: "Listing 3" },
        ]}
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
  })
})
