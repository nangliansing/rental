import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { createSearchListing } from "@/test/fixtures/listings"

import { ListingPostBody } from "./ListingPostBody"
import { LISTING_POST_BREAKOUT_CLASS } from "../utils/listingPostLayout"

describe("ListingPostBody", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("scrolls detail chips edge to edge within the listing card", () => {
    const listing = createSearchListing({
      occupancy: 2,
      kitchenType: "Western kitchen",
      isCookingAllowed: true,
      isPetAllowed: true,
    })

    render(<ListingPostBody listing={listing} />)

    const chipRow = screen.getByText("2 people").closest("div")

    expect(chipRow).toHaveClass(LISTING_POST_BREAKOUT_CLASS)
    expect(chipRow).toHaveClass("overflow-x-auto", "flex-nowrap")
  })

  it("renders listing media, pricing, details, and facilities", () => {
    const listing = createSearchListing({
      occupancy: 1,
      facilities: ["Wifi", "Balcony"],
    })

    render(<ListingPostBody listing={listing} />)

    expect(screen.getByRole("img", { name: "Bright rental room" })).toBeInTheDocument()
    expect(screen.getByText("฿14k")).toBeInTheDocument()
    expect(screen.getByText("1 person")).toBeInTheDocument()
    expect(screen.getByLabelText("Flexible")).toBeInTheDocument()
    expect(screen.getByText("Wifi · Balcony")).toBeInTheDocument()
    expect(screen.getByText(/month with electricity and water/)).toBeInTheDocument()
  })

  it("renders multiline descriptions with preserved formatting", () => {
    const listing = createSearchListing({
      description: "Line one\n\nLine two with extra detail",
    })

    render(<ListingPostBody listing={listing} />)

    expect(screen.getByText(/Line one/)).toHaveClass("whitespace-pre-wrap")
    expect(screen.getByText(/Line one/).textContent).toContain("Line two")
  })

  it("keeps the availability badge visible after the carousel photo loads", async () => {
    const listing = createSearchListing()

    render(<ListingPostBody listing={listing} />)

    fireEvent.load(screen.getByRole("img", { name: "Bright rental room" }))

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Bright rental room" })).toHaveClass(
        "opacity-100",
      )
    })

    expect(screen.getByLabelText("Flexible")).toBeVisible()
  })

  it("renders availability badge on the photo from listing data", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    const { rerender } = render(
      <ListingPostBody
        listing={createSearchListing({
          availableAt: "2026-07-29T00:00:00+07:00",
        })}
      />,
    )

    expect(screen.getByLabelText("Available now")).toBeInTheDocument()

    rerender(
      <ListingPostBody
        listing={createSearchListing({
          availableAt: "2026-08-15T00:00:00+07:00",
        })}
      />,
    )

    expect(screen.getByLabelText("Aug 15, 2026")).toBeInTheDocument()
    expect(screen.queryByText("Available from Aug 15, 2026")).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it("makes the availability badge editable for owners", async () => {
    const onAvailableAtChange = vi.fn()

    render(
      <ListingPostBody
        listing={createSearchListing({ availableAt: null })}
        isOwnListing
        onAvailableAtChange={onAvailableAtChange}
      />,
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Edit availability: Flexible" }),
    )

    expect(
      screen.getByRole("dialog", { name: "When is the room available?" }),
    ).toBeInTheDocument()
    expect(onAvailableAtChange).not.toHaveBeenCalled()
  })

  it("keeps the availability badge read-only for non-owners", () => {
    render(
      <ListingPostBody
        listing={createSearchListing({ availableAt: null })}
        isOwnListing={false}
        onAvailableAtChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole("button", { name: /Edit availability/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText("Flexible")).toBeInTheDocument()
  })

  it("surfaces submitting and error states from the card onto the badge", () => {
    const { rerender } = render(
      <ListingPostBody
        listing={createSearchListing({ availableAt: null })}
        isOwnListing
        isAvailabilitySubmitting
        onAvailableAtChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("button", { name: "Saving availability" }),
    ).toBeDisabled()

    rerender(
      <ListingPostBody
        listing={createSearchListing({ availableAt: null })}
        isOwnListing
        availabilityError="Could not update listing availability."
        onAvailableAtChange={vi.fn()}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not update listing availability.",
    )
  })

  it("normalizes malformed optional presentation data", () => {
    const listing = createSearchListing({
      description: "   ",
      facilities: [null, " ", " Wifi ", 42] as never,
      occupancy: Number.NaN,
      kitchenType: " ",
      media: [null, { secureUrl: " " }] as never,
      agentProfile: null,
    })

    render(<ListingPostBody listing={listing} />)

    expect(screen.queryByText("A bright room.")).not.toBeInTheDocument()
    expect(screen.queryByText(/people|person/)).not.toBeInTheDocument()
    expect(screen.getByText("Wifi")).toBeInTheDocument()
    expect(screen.getByText("No photo")).toBeInTheDocument()
  })
})
