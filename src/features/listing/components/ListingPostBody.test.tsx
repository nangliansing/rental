import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { createSearchListing } from "@/test/fixtures/listings"

import { ListingPostBody } from "./ListingPostBody"

describe("ListingPostBody", () => {
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
    expect(screen.getByText("Wifi · Balcony")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Helpful/ })).toBeInTheDocument()
    expect(screen.getByText(/month with electricity and water/)).toBeInTheDocument()
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
