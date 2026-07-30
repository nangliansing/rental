import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  createListingAgentProfile,
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"

import { ListingGridCardOverlayContent } from "./ListingGridCardOverlayContent"

describe("ListingGridCardOverlayContent", () => {
  it("hides fine print by default", () => {
    const listing = {
      ...createSearchListing(),
      building: createSearchBuilding(),
    }

    render(<ListingGridCardOverlayContent listing={listing} />)

    expect(screen.getByText("฿14k")).toBeInTheDocument()
    expect(screen.getByText("Bangkapi Residence")).toBeInTheDocument()
    expect(screen.getByText("1 bed · 36 sqm")).toBeInTheDocument()
    expect(screen.queryByText(/^Dep /)).not.toBeInTheDocument()
  })

  it("shows fine print when requested", () => {
    const listing = {
      ...createSearchListing(),
      building: createSearchBuilding(),
    }

    const { container } = render(
      <ListingGridCardOverlayContent listing={listing} showFinePrint />,
    )

    expect(
      container.querySelector('[data-slot="listing-grid-card-fine-print"]'),
    ).toBeInTheDocument()
    expect(screen.getByText(/^Dep /)).toBeInTheDocument()
    expect(screen.getByText(/^Move /)).toBeInTheDocument()
  })

  it("omits building name when showBuildingName is false", () => {
    const listing = {
      ...createSearchListing(),
      building: createSearchBuilding(),
    }

    render(
      <ListingGridCardOverlayContent
        listing={listing}
        showBuildingName={false}
      />,
    )

    expect(screen.queryByText("Bangkapi Residence")).not.toBeInTheDocument()
  })

  it("shows agent attribution in building context", () => {
    const listing = {
      ...createSearchListing({
        agentProfile: createListingAgentProfile({
          displayName: "Mina Chen",
          isVerified: true,
          reviewSummary: {
            averageRating: 4.5,
            reviewCount: 35,
            ratingCounts: {
              oneStar: 0,
              twoStars: 0,
              threeStars: 0,
              fourStars: 10,
              fiveStars: 25,
            },
            tagCounts: [],
          },
        }),
      }),
      building: createSearchBuilding(),
    }

    render(
      <ListingGridCardOverlayContent
        listing={listing}
        showAgentAttribution
      />,
    )

    expect(screen.getByText("Mina Chen")).toBeInTheDocument()
    expect(screen.getByLabelText("Verified lister")).toBeInTheDocument()
    expect(screen.getByText("4.5 (35)")).toBeInTheDocument()
  })

  it("hides agent attribution by default", () => {
    const listing = {
      ...createSearchListing({
        agentProfile: createListingAgentProfile({ displayName: "Mina Chen" }),
      }),
      building: createSearchBuilding(),
    }

    render(<ListingGridCardOverlayContent listing={listing} />)

    expect(screen.queryByText("Mina Chen")).not.toBeInTheDocument()
  })

  it("skips availability label work when fine print is hidden", () => {
    const listing = createSearchListing({ availableAt: null })

    render(<ListingGridCardOverlayContent listing={listing} />)

    expect(screen.queryByText("Flexible")).not.toBeInTheDocument()
  })

  it("can hide availability inside fine print while still showing other fine print", () => {
    const listing = createSearchListing({ availableAt: null })

    render(
      <ListingGridCardOverlayContent
        listing={listing}
        showFinePrint
        showAvailabilityInFinePrint={false}
      />,
    )

    expect(screen.getByText(/^Dep /)).toBeInTheDocument()
    expect(screen.queryByText("Flexible")).not.toBeInTheDocument()
  })

  it("renders cooking and pet affordances in the overlay", () => {
    render(
      <ListingGridCardOverlayContent
        listing={createSearchListing({
          isCookingAllowed: true,
          isPetAllowed: true,
        })}
      />,
    )

    expect(screen.getByLabelText("Cooking allowed")).toBeInTheDocument()
    expect(screen.getByLabelText("Pets allowed")).toBeInTheDocument()
  })
})
