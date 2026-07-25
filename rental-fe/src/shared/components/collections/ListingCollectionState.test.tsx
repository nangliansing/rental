import { fireEvent, render, screen } from "@testing-library/react"
import { Heart } from "lucide-react"
import { describe, expect, it, vi } from "vitest"

import {
  CollectionRefreshStatus,
  ListingCollectionMessage,
  ListingCollectionSkeleton,
} from "./ListingCollectionState"

describe("ListingCollectionState", () => {
  it("renders a non-blocking live refresh status with a spinning icon", () => {
    const { container } = render(
      <CollectionRefreshStatus label="Updating buildings..." />,
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "Updating buildings...",
    )
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite")
    expect(container.querySelector("svg")).toHaveClass("animate-spin")
  })

  it("renders a layout-matched accessible skeleton grid", () => {
    const { container } = render(
      <ListingCollectionSkeleton
        columns="two"
        count={4}
      />,
    )

    expect(screen.getByRole("status", { name: "Loading listings" })).toBeInTheDocument()
    expect(container.querySelectorAll("[aria-hidden=true]")).toHaveLength(4)
    expect(screen.getByRole("status").firstElementChild).toHaveClass(
      "grid-cols-2",
      "gap-0.5",
      "md:gap-1",
    )
  })

  it("supports collection-specific copy, icons, and retry", () => {
    const onRetry = vi.fn()
    render(
      <ListingCollectionMessage
        icon={Heart}
        title="Could not load saved rooms"
        description="Please try again."
        onRetry={onRetry}
      />,
    )

    expect(screen.getByText("Could not load saved rooms")).toBeInTheDocument()
    expect(screen.getByText("Please try again.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
