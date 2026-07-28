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

  it("renders listing media, pricing, details, facilities, and review action", () => {
    const onReviewsRequest = vi.fn()
    const listing = createSearchListing({
      occupancy: 1,
      facilities: ["Wifi", "Balcony"],
      agentProfile: {
        _id: "agent-1",
        userId: "user-1",
        displayName: "Test Lister",
        profilePhoto: null,
        phone: null,
        lineUrl: null,
        whatsappPhone: null,
        telegramUrl: null,
        viberPhone: null,
        supportLanguages: ["English"],
        reviewSummary: {
          averageRating: 5,
          reviewCount: 1,
          ratingCounts: {
            oneStar: 0,
            twoStars: 0,
            threeStars: 0,
            fourStars: 0,
            fiveStars: 1,
          },
          tagCounts: [{ tag: "HELPFUL", count: 1 }],
        },
        isVerified: false,
        isOnline: true,
      },
    })

    render(
      <ListingPostBody
        listing={listing}
        onReviewsRequest={onReviewsRequest}
      />,
    )

    expect(screen.getByRole("img", { name: "Bright rental room" })).toBeInTheDocument()
    expect(screen.getByText("฿14k")).toBeInTheDocument()
    expect(screen.getByText("1 person")).toBeInTheDocument()
    expect(screen.getByText("Flexible")).toBeInTheDocument()
    expect(screen.getByText("Wifi · Balcony")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Helpful/ })).toBeInTheDocument()
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

  it("keeps review badges visible after the carousel photo loads", async () => {
    const onReviewsRequest = vi.fn()
    const listing = createSearchListing({
      agentProfile: {
        _id: "agent-1",
        userId: "user-1",
        displayName: "Test Lister",
        profilePhoto: null,
        phone: null,
        lineUrl: null,
        whatsappPhone: null,
        telegramUrl: null,
        viberPhone: null,
        supportLanguages: ["English"],
        reviewSummary: {
          averageRating: 5,
          reviewCount: 1,
          ratingCounts: {
            oneStar: 0,
            twoStars: 0,
            threeStars: 0,
            fourStars: 0,
            fiveStars: 1,
          },
          tagCounts: [{ tag: "HELPFUL", count: 1 }],
        },
        isVerified: false,
        isOnline: true,
      },
    })

    render(
      <ListingPostBody
        listing={listing}
        onReviewsRequest={onReviewsRequest}
      />,
    )

    fireEvent.load(screen.getByRole("img", { name: "Bright rental room" }))

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Bright rental room" })).toHaveClass(
        "opacity-100",
      )
    })

    expect(screen.getByRole("button", { name: /Helpful/ })).toBeVisible()
  })

  it("renders availability labels from listing data", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-29T12:00:00+07:00"))

    const { rerender } = render(
      <ListingPostBody
        listing={createSearchListing({
          availableAt: "2026-07-29T00:00:00+07:00",
        })}
      />,
    )

    expect(screen.getByText("Available now")).toBeInTheDocument()

    rerender(
      <ListingPostBody
        listing={createSearchListing({
          availableAt: "2026-08-15T00:00:00+07:00",
        })}
      />,
    )

    expect(screen.getByText("Available from Aug 15, 2026")).toBeInTheDocument()

    vi.useRealTimers()
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
    expect(screen.queryByLabelText("Lister review highlights and actions"))
      .not.toBeInTheDocument()
  })
})
