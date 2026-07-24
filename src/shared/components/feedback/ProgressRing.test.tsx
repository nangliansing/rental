import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ProgressRing } from "./ProgressRing"

describe("ProgressRing", () => {
  it("exposes accessible progress with a custom label", () => {
    render(<ProgressRing progress={48.6} label="Uploading room.jpg" />)

    const progress = screen.getByRole("progressbar", {
      name: "Uploading room.jpg",
    })
    expect(progress).toHaveAttribute("aria-valuemin", "0")
    expect(progress).toHaveAttribute("aria-valuemax", "100")
    expect(progress).toHaveAttribute("aria-valuenow", "49")
    expect(screen.getByText("49%")).toBeInTheDocument()
  })

  it("clamps out-of-range and non-finite progress", () => {
    const { rerender } = render(<ProgressRing progress={150} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    )

    rerender(<ProgressRing progress={Number.NaN} />)
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0")
  })
})
