import { useRef } from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useListingGridColumnCount } from "./useListingGridColumnCount"

let resizeObserverCallback: ResizeObserverCallback | null = null

class ResizeObserverMock {
  observe = vi.fn()
  disconnect = vi.fn()

  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback
  }
}

function ColumnCountProbe({
  columns,
  width,
}: {
  columns: "responsive" | "two"
  width: number
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const columnCount = useListingGridColumnCount(columns, containerRef)

  return (
    <div
      ref={(node) => {
        containerRef.current = node
        if (node) {
          Object.defineProperty(node, "clientWidth", {
            configurable: true,
            value: width,
          })
        }
      }}
      data-testid="grid-container"
    >
      {columnCount}
    </div>
  )
}

describe("useListingGridColumnCount", () => {
  beforeEach(() => {
    resizeObserverCallback = null
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
  })

  it("derives two columns on narrow responsive containers", () => {
    render(<ColumnCountProbe columns="responsive" width={500} />)

    expect(screen.getByTestId("grid-container")).toHaveTextContent("2")
  })

  it("derives three columns once the responsive breakpoint is reached", () => {
    render(<ColumnCountProbe columns="responsive" width={768} />)

    expect(screen.getByTestId("grid-container")).toHaveTextContent("3")
  })

  it("keeps two columns for fixed two-column grids regardless of width", () => {
    render(<ColumnCountProbe columns="two" width={1200} />)

    expect(screen.getByTestId("grid-container")).toHaveTextContent("2")
  })

  it("updates when resize observer callbacks report a new width", async () => {
    render(<ColumnCountProbe columns="responsive" width={500} />)

    const node = screen.getByTestId("grid-container")
    expect(node).toHaveTextContent("2")

    act(() => {
      Object.defineProperty(node, "clientWidth", {
        configurable: true,
        value: 768,
      })
      resizeObserverCallback?.([], {} as ResizeObserver)
    })

    await waitFor(() => {
      expect(node).toHaveTextContent("3")
    })
  })
})
