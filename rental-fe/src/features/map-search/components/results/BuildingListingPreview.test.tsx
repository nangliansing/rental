import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createSearchListing } from "@/test/fixtures/listings"

import { BuildingListingPreview } from "./BuildingListingPreview"

describe("BuildingListingPreview", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("uses shared listing presentation for normal data", () => {
    render(<BuildingListingPreview listing={createSearchListing()} />)

    expect(
      screen.getByRole("img", { name: "Room preview" }),
    ).toBeInTheDocument()
    expect(screen.getByText("฿14k")).toBeInTheDocument()
    expect(screen.getByLabelText("1 bed")).toHaveTextContent("1")
    expect(
      screen.getByRole("button", { name: "Copy listing link" }),
    ).toBeInTheDocument()
  })

  it("keeps the copy control outside the select activator", () => {
    const onSelect = vi.fn()

    render(
      <BuildingListingPreview
        listing={createSearchListing()}
        onSelect={onSelect}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Open listing ฿14k" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Copy listing link" }),
    ).toBeInTheDocument()
  })

  it("shows compact availability in the top-left corner", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    const { rerender } = render(
      <BuildingListingPreview
        listing={createSearchListing({ availableAt: null })}
      />,
    )
    expect(screen.queryByLabelText(/Flexible|Available now|Available from/i)).not.toBeInTheDocument()

    rerender(
      <BuildingListingPreview
        listing={createSearchListing({
          availableAt: "2026-07-29T00:00:00+07:00",
        })}
      />,
    )
    expect(screen.getByLabelText("Available now")).toBeInTheDocument()

    rerender(
      <BuildingListingPreview
        listing={createSearchListing({
          availableAt: "2026-08-15T00:00:00+07:00",
        })}
      />,
    )
    expect(screen.getByText("Aug 15")).toBeInTheDocument()
  })

  it("renders safe fallbacks when media and numeric data are invalid", () => {
    render(
      <BuildingListingPreview
        listing={createSearchListing({
          media: [],
          rent: Number.POSITIVE_INFINITY,
          bedroomCount: -1,
        })}
      />,
    )

    expect(screen.getByText("No photo")).toBeInTheDocument()
    expect(screen.getByText("฿--")).toBeInTheDocument()
    expect(screen.getByLabelText("Room")).toHaveTextContent("Room")
  })
})
