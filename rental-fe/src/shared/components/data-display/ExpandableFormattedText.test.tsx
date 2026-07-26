import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ExpandableFormattedText } from "./ExpandableFormattedText"

class ResizeObserverMock {
  constructor(private callback: ResizeObserverCallback) {}

  observe() {
    this.callback([], this as unknown as ResizeObserver)
  }

  disconnect() {}
}

describe("ExpandableFormattedText", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(120)
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  it("renders nothing for empty or invalid text", () => {
    const { container } = render(
      <>
        <ExpandableFormattedText text={null} />
        <ExpandableFormattedText text="   " />
        <ExpandableFormattedText text={42} />
      </>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("preserves user line breaks and spacing", () => {
    render(<ExpandableFormattedText text={"Line one\n\n  Line two"} />)

    const paragraph = screen.getByText(/Line one/)
    expect(paragraph).toHaveClass("whitespace-pre-wrap")
    expect(paragraph.textContent).toBe("Line one\n\n  Line two")
  })

  it("shows See more when collapsed text overflows", async () => {
    render(<ExpandableFormattedText text={"Long caption\nwith many lines"} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "See more" })).toBeInTheDocument()
    })
  })

  it("expands and collapses on toggle", async () => {
    render(<ExpandableFormattedText text={"Long caption\nwith many lines"} />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "See more" })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "See more" }))
    expect(screen.getByRole("button", { name: "See less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )

    fireEvent.click(screen.getByRole("button", { name: "See less" }))
    expect(screen.getByRole("button", { name: "See more" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
  })
})
