import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { ListerReview } from "../api"
import { ReviewForm } from "./ReviewForm"

function buildReview(
  values: Partial<Pick<ListerReview, "rating" | "tags" | "comment">> = {},
) {
  return {
    rating: 5,
    tags: [],
    comment: null,
    ...values,
  } as ListerReview
}

describe("ReviewForm", () => {
  it("submits normalized create values through accessible controls", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ReviewForm
        mode="create"
        initialReview={null}
        isSubmitting={false}
        errorMessage=""
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByRole("group", { name: "Rating" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Tags" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "5 stars" })).toBeChecked()

    await user.click(screen.getByRole("radio", { name: "4 stars" }))
    await user.click(screen.getByRole("button", { name: "Helpful" }))
    await user.type(
      screen.getByRole("textbox", { name: /comment/i }),
      "  Clear and responsive  ",
    )
    await user.click(screen.getByRole("button", { name: "Post review" }))

    expect(onSubmit).toHaveBeenCalledWith({
      rating: 4,
      tags: ["HELPFUL"],
      comment: "Clear and responsive",
    })
  })

  it("blocks unchanged edits and submits updated review values", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ReviewForm
        mode="edit"
        initialReview={buildReview({
          rating: 4,
          tags: ["RESPONSIVE", "HELPFUL"],
          comment: "Original review",
        })}
        isSubmitting={false}
        errorMessage=""
        onSubmit={onSubmit}
      />,
    )

    const submit = screen.getByRole("button", { name: "Save review" })
    expect(submit).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Responsive" }))
    await user.click(submit)

    expect(onSubmit).toHaveBeenCalledWith({
      rating: 4,
      tags: ["HELPFUL"],
      comment: "Original review",
    })
  })

  it("disables every control while a review is being submitted", () => {
    render(
      <ReviewForm
        mode="create"
        initialReview={null}
        isSubmitting
        errorMessage=""
        onSubmit={vi.fn()}
      />,
    )

    screen.getAllByRole("radio").forEach((radio) => expect(radio).toBeDisabled())
    expect(screen.getByRole("button", { name: "Helpful" })).toBeDisabled()
    expect(screen.getByRole("textbox", { name: /comment/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Post review" })).toBeDisabled()
  })

  it("announces a normalized error and connects it to the comment", () => {
    render(
      <ReviewForm
        mode="create"
        initialReview={null}
        isSubmitting={false}
        errorMessage="  Review could not be saved  "
        onSubmit={vi.fn()}
      />,
    )

    const comment = screen.getByRole("textbox", { name: /comment/i })
    expect(screen.getByRole("alert")).toHaveTextContent("Review could not be saved")
    expect(comment).toHaveAccessibleDescription("Review could not be saved")
    expect(comment).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("1200 characters left")).toBeInTheDocument()
  })

  it("falls back safely when optional review data is malformed", () => {
    const malformedReview = {
      rating: 0,
      tags: undefined,
      comment: undefined,
    } as unknown as ListerReview

    render(
      <ReviewForm
        mode="edit"
        initialReview={malformedReview}
        isSubmitting={false}
        errorMessage={null as unknown as string}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("radio", { name: "5 stars" })).toBeChecked()
    expect(screen.getByRole("button", { name: "Helpful" })).not.toHaveAttribute(
      "aria-pressed",
      "true",
    )
    expect(screen.getByRole("textbox", { name: /comment/i })).toHaveValue("")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save review" })).toBeDisabled()
  })
})
