import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { LoaderIcon } from "./LoaderIcon"

describe("LoaderIcon", () => {
  it("renders the Lucide loader with spin animation", () => {
    const { container } = render(<LoaderIcon className="h-4 w-4 text-slate-500" />)

    const icon = container.querySelector("svg")
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass("animate-spin", "h-4", "w-4", "text-slate-500")
  })

  it("forwards accessibility props", () => {
    const { container } = render(
      <LoaderIcon aria-hidden="true" data-testid="loading-indicator" />,
    )

    const icon = container.querySelector("svg")
    expect(icon).toHaveAttribute("aria-hidden", "true")
    expect(icon).toHaveAttribute("data-testid", "loading-indicator")
  })
})
