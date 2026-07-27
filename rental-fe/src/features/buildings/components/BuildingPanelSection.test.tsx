import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { BuildingPanelSection } from "./BuildingPanelSection"

describe("BuildingPanelSection", () => {
  it("renders inset gutters for padded panel content", () => {
    const { container } = render(
      <BuildingPanelSection>
        <p>Building summary</p>
      </BuildingPanelSection>,
    )

    const gutters = container.firstElementChild
    const surface = gutters?.firstElementChild

    expect(gutters).toHaveClass("bg-[#f1f3f4]", "-mx-4", "py-2")
    expect(surface).toHaveClass("bg-white", "px-4", "py-4")
    expect(screen.getByText("Building summary")).toBeInTheDocument()
  })

  it("renders flush gutters for full-width surfaces", () => {
    const { container } = render(
      <BuildingPanelSection breakout="flush">
        <p>Building summary</p>
      </BuildingPanelSection>,
    )

    expect(container.firstElementChild).toHaveClass("bg-[#f1f3f4]", "py-2")
    expect(container.firstElementChild).not.toHaveClass("-mx-4")
  })
})
