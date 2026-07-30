import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createSearchListing } from "@/test/fixtures/listings"

import {
  LISTING_GRID_AVAILABLE_NOW_INDICATOR_CLASS_NAME,
  ListingGridCardAvailableNowIndicator,
  ListingGridCardAvailabilityBadge,
  ListingGridCardBadge,
} from "./listingGridCardChrome"

describe("listingGridCardChrome", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders the available-now indicator with shared styling", () => {
    render(<ListingGridCardAvailableNowIndicator show />)

    expect(screen.getByLabelText("Available now")).toHaveClass(
      LISTING_GRID_AVAILABLE_NOW_INDICATOR_CLASS_NAME,
    )
  })

  it("renders nothing when show is false", () => {
    const { container } = render(
      <ListingGridCardAvailableNowIndicator show={false} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("uses green styling when the listing is available now", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    const listing = createSearchListing({
      availableAt: "2026-07-29T00:00:00+07:00",
    })

    const { container } = render(
      <ListingGridCardAvailabilityBadge listing={listing} />,
    )

    expect(screen.getByText("Available now")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("bg-emerald-600/90")

    vi.useRealTimers()
  })

  it("uses neutral styling for flexible availability", () => {
    const listing = createSearchListing({ availableAt: null })

    const { container } = render(
      <ListingGridCardAvailabilityBadge listing={listing} />,
    )

    expect(screen.getByText("Flexible")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("bg-slate-950/45")
    expect(container.firstElementChild).not.toHaveClass("bg-emerald-600/90")
  })

  it("renders a future availability date with neutral styling", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    const listing = createSearchListing({
      availableAt: "2026-08-15T00:00:00+07:00",
    })

    const { container } = render(
      <ListingGridCardAvailabilityBadge listing={listing} />,
    )

    expect(screen.getByText("Aug 15, 2026")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveClass("bg-slate-950/45")
  })

  it("renders the contract badge and private lock", () => {
    render(
      <ListingGridCardBadge
        listing={createSearchListing({
          visibility: "PRIVATE",
          contractMonths: 3,
        })}
      />,
    )

    expect(screen.getByLabelText("Private listing")).toBeInTheDocument()
    expect(screen.getByText("3 mo")).toBeInTheDocument()
  })

  it("renders a public contract badge without the lock", () => {
    render(
      <ListingGridCardBadge
        listing={createSearchListing({
          visibility: "PUBLIC",
          contractMonths: 12,
        })}
      />,
    )

    expect(screen.queryByLabelText("Private listing")).not.toBeInTheDocument()
    expect(screen.getByText("12 mo")).toBeInTheDocument()
  })
})
