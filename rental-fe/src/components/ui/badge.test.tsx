import { createRef } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Badge } from "./badge"

describe("Badge", () => {
  it("renders a presentational span with stable defaults", () => {
    render(<Badge>Available</Badge>)

    const badge = screen.getByText("Available")

    expect(badge.tagName).toBe("SPAN")
    expect(badge).toHaveAttribute("data-slot", "badge")
    expect(badge).toHaveAttribute("data-variant", "default")
    expect(badge).toHaveClass("rounded-full", "bg-primary")
  })

  it("forwards refs and native attributes", () => {
    const ref = createRef<HTMLSpanElement>()

    render(
      <Badge ref={ref} title="Current status">
        Active
      </Badge>,
    )

    expect(ref.current).toBe(screen.getByTitle("Current status"))
  })

  it("applies variants and resolves conflicting caller classes", () => {
    render(
      <Badge variant="destructive" className="h-7 px-4">
        Removed
      </Badge>,
    )

    const badge = screen.getByText("Removed")

    expect(badge).toHaveAttribute("data-variant", "destructive")
    expect(badge).toHaveClass("bg-destructive/10", "h-7", "px-4")
    expect(badge).not.toHaveClass("h-5", "px-2")
  })

  it("composes a semantic link with asChild", () => {
    render(
      <Badge asChild variant="outline">
        <a href="/listings">View listings</a>
      </Badge>,
    )

    const link = screen.getByRole("link", { name: "View listings" })

    expect(link).toHaveAttribute("href", "/listings")
    expect(link).toHaveAttribute("data-slot", "badge")
    expect(link).toHaveAttribute("data-variant", "outline")
  })
})
