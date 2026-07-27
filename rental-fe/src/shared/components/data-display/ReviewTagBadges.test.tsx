import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ReviewTagBadges } from "./ReviewTagBadges"

describe("ReviewTagBadges", () => {
  it("uses a horizontal scroll row for review badges", () => {
    render(
      <ReviewTagBadges
        tagCounts={[
          { tag: "ACCURATE_INFO", count: 1 },
          { tag: "CLEAR_COMMUNICATION", count: 1 },
        ]}
      />,
    )

    expect(
      screen.getByLabelText("Lister review highlights and actions"),
    ).toHaveClass("overflow-x-auto", "flex-nowrap")
    expect(screen.getByText("Accurate information: 1")).toHaveClass(
      "whitespace-nowrap",
      "shrink-0",
    )
  })

  it("ranks, deduplicates, and limits reviewer tags to the top two", () => {
    render(
      <ReviewTagBadges
        tagCounts={[
          { tag: "HELPFUL", count: 2 },
          { tag: "RESPONSIVE", count: 4 },
          { tag: "FRIENDLY", count: 3 },
          { tag: "HELPFUL", count: 3 },
          { tag: "ACCURATE_INFO", count: 1 },
        ]}
      />,
    )

    expect(
      screen.getByLabelText("Lister review highlights and actions"),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Helpful, mentioned in 5 reviews" }),
    ).toHaveTextContent("Helpful: 5")
    expect(
      screen.getByRole("button", { name: "Responsive, mentioned in 4 reviews" }),
    ).toHaveTextContent("Responsive: 4")
    expect(screen.queryByText("Friendly")).not.toBeInTheDocument()
    expect(screen.queryByText("Accurate information")).not.toBeInTheDocument()
  })

  it("renders full pills with staggered, reduced-motion-safe animation", () => {
    render(
      <ReviewTagBadges
        tagCounts={[
          { tag: "HELPFUL", count: 2 },
          { tag: "RESPONSIVE", count: 1 },
        ]}
      />,
    )

    const helpful = screen.getByRole("button", {
      name: "Helpful, mentioned in 2 reviews",
    })
    const responsive = screen.getByRole("button", {
      name: "Responsive, mentioned in 1 review",
    })

    expect(helpful).toHaveClass("rounded-full", "review-tag-float")
    expect(helpful).toHaveStyle({ animationDelay: "0s" })
    expect(responsive).toHaveStyle({ animationDelay: "-1.3s" })
  })

  it("shows evidence-based details on hover and keyboard focus", async () => {
    const user = userEvent.setup()
    render(
      <ReviewTagBadges tagCounts={[{ tag: "RESPONSIVE", count: 2 }]} />,
    )

    const badge = screen.getByRole("button", {
      name: "Responsive, mentioned in 2 reviews",
    })
    await user.hover(badge)

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Reviewers often describe this lister as responsive.",
    )
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Mentioned in 2 reviews.",
    )

    await user.unhover(badge)
    badge.focus()
    expect(await screen.findByRole("tooltip")).toBeInTheDocument()
  })

  it("supports touch disclosure without changing the badge action", async () => {
    render(<ReviewTagBadges tagCounts={[{ tag: "HELPFUL", count: 1 }]} />)

    const badge = screen.getByRole("button", {
      name: "Helpful, mentioned in 1 review",
    })
    fireEvent.pointerDown(badge, { pointerType: "touch" })

    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Mentioned in 1 review.",
    )
  })

  it("opens reviews when an interactive tag is clicked", async () => {
    const user = userEvent.setup()
    const onReviewsClick = vi.fn()
    render(
      <ReviewTagBadges
        tagCounts={[{ tag: "RESPONSIVE", count: 2 }]}
        onReviewsClick={onReviewsClick}
      />,
    )

    await user.click(
      screen.getByRole("button", {
        name: "Responsive, mentioned in 2 reviews. Open lister reviews",
      }),
    )

    expect(onReviewsClick).toHaveBeenCalledOnce()
  })

  it("shows a leading review action even when there are no tags", async () => {
    const user = userEvent.setup()
    const onReviewsClick = vi.fn()
    render(
      <ReviewTagBadges tagCounts={[]} onReviewsClick={onReviewsClick} />,
    )

    const action = screen.getByRole("button", { name: "Open lister reviews" })
    expect(action.querySelector("svg")).toBeInTheDocument()

    await user.hover(action)
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "Read feedback or write a review for this lister.",
    )

    await user.click(action)
    expect(onReviewsClick).toHaveBeenCalledOnce()
  })

  it("renders nothing for malformed, unknown, or empty tag data", () => {
    const { container, rerender } = render(
      <ReviewTagBadges
        tagCounts={[
          { tag: "UNKNOWN", count: 10 },
          { tag: "HELPFUL", count: Number.NaN },
          { tag: null, count: 3 },
        ]}
      />,
    )

    expect(container).toBeEmptyDOMElement()

    rerender(
      <ReviewTagBadges
        tagCounts={[{ tag: "HELPFUL", count: 1 }]}
        maxTags={0}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("shows tag counts inline for mobile-friendly reading", () => {
    render(
      <ReviewTagBadges tagCounts={[{ tag: "FAST_FOLLOW_UP", count: 3 }]} />,
    )

    expect(screen.getByRole("button", { name: /Fast follow-up/ })).toHaveTextContent(
      "Fast follow-up: 3",
    )
  })

  it("uses the two-tag default when maxTags is not finite", () => {
    render(
      <ReviewTagBadges
        tagCounts={[
          { tag: "HELPFUL", count: 3 },
          { tag: "RESPONSIVE", count: 2 },
          { tag: "FRIENDLY", count: 1 },
        ]}
        maxTags={Number.NaN}
      />,
    )

    expect(screen.getByText("Helpful: 3")).toBeInTheDocument()
    expect(screen.getByText("Responsive: 2")).toBeInTheDocument()
    expect(screen.queryByText("Friendly")).not.toBeInTheDocument()
  })
})
