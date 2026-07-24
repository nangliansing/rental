import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, test, vi } from "vitest"

import {
  RatingSelector,
  type RatingSelectorSize,
} from "./RatingSelector"

describe("RatingSelector", () => {
  it("renders a labeled five-point radio group with medium defaults", () => {
    render(<RatingSelector label="Rating" value={3} onChange={vi.fn()} />)

    expect(screen.getByRole("group", { name: "Rating" })).toBeInTheDocument()

    const ratings = screen.getAllByRole("radio")
    expect(ratings).toHaveLength(5)
    expect(screen.getByRole("radio", { name: "3 stars" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "4 stars" })).not.toBeChecked()

    const thirdStar = screen
      .getByRole("radio", { name: "3 stars" })
      .nextElementSibling?.querySelector("svg")
    const fourthStar = screen
      .getByRole("radio", { name: "4 stars" })
      .nextElementSibling?.querySelector("svg")

    expect(thirdStar).toHaveClass("h-7", "fill-current")
    expect(fourthStar).toHaveClass("text-slate-200")
  })

  it("uses a defensive accessible name when the visible label is missing", () => {
    render(<RatingSelector value={0} onChange={vi.fn()} />)

    expect(screen.getByRole("group", { name: "Rating" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "1 star" })).not.toBeChecked()
  })

  it("emits the selected rating", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<RatingSelector value={2} onChange={onChange} />)

    await user.click(screen.getByRole("radio", { name: "4 stars" }))

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it("supports native arrow-key navigation in a controlled group", async () => {
    const user = userEvent.setup()

    function ControlledRating() {
      const [value, setValue] = useState(2)
      return <RatingSelector label="Rating" value={value} onChange={setValue} />
    }

    render(<ControlledRating />)

    const secondRating = screen.getByRole("radio", { name: "2 stars" })
    secondRating.focus()
    await user.keyboard("{ArrowRight}")

    expect(screen.getByRole("radio", { name: "3 stars" })).toBeChecked()
  })

  it("disables every rating and blocks changes", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<RatingSelector value={2} disabled onChange={onChange} />)

    const ratings = screen.getAllByRole("radio")
    ratings.forEach((rating) => expect(rating).toBeDisabled())

    await user.click(screen.getByRole("radio", { name: "4 stars" }))
    expect(onChange).not.toHaveBeenCalled()
  })

  test.each([
    ["small", "h-5"],
    ["medium", "h-7"],
    ["large", "h-8"],
  ] satisfies [RatingSelectorSize, string][])(
    "supports the %s size",
    (size, expectedClass) => {
      render(<RatingSelector value={1} size={size} onChange={vi.fn()} />)

      const star = screen
        .getByRole("radio", { name: "1 star" })
        .nextElementSibling?.querySelector("svg")

      expect(star).toHaveClass(expectedClass)
    },
  )

  it("normalizes unsafe max and value inputs", () => {
    const { rerender } = render(
      <RatingSelector value={99} max={100} onChange={vi.fn()} />,
    )

    expect(screen.getAllByRole("radio")).toHaveLength(10)
    expect(screen.getByRole("radio", { name: "10 stars" })).toBeChecked()

    rerender(<RatingSelector value={undefined} max={Number.NaN} onChange={vi.fn()} />)

    expect(screen.getAllByRole("radio")).toHaveLength(5)
    expect(screen.getAllByRole("radio").every((rating) => !rating.hasAttribute("checked"))).toBe(
      true,
    )
  })

  it("clamps a non-positive max to one option", () => {
    render(<RatingSelector value={1} max={0} onChange={vi.fn()} />)

    expect(screen.getAllByRole("radio")).toHaveLength(1)
    expect(screen.getByRole("radio", { name: "1 star" })).toBeChecked()
  })
})
