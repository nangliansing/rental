import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { createListingAgentProfile } from "@/test/fixtures/listings"

import { ListingGridCardAgentAttribution } from "./ListingGridCardAgentAttribution"

describe("ListingGridCardAgentAttribution", () => {
  it("renders name, verified badge, and review summary", () => {
    render(
      <ListingGridCardAgentAttribution
        agent={createListingAgentProfile({
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
        })}
      />,
    )

    expect(screen.getByText("Mina Chen")).toBeInTheDocument()
    expect(screen.getByLabelText("Verified lister")).toBeInTheDocument()
    expect(screen.getByText("4.5 (35)")).toBeInTheDocument()
  })

  it("hides review line when there are no reviews", () => {
    render(
      <ListingGridCardAgentAttribution
        agent={createListingAgentProfile({
          displayName: "Mina Chen",
          reviewSummary: {
            averageRating: 0,
            reviewCount: 0,
            ratingCounts: {
              oneStar: 0,
              twoStars: 0,
              threeStars: 0,
              fourStars: 0,
              fiveStars: 0,
            },
            tagCounts: [],
          },
        })}
      />,
    )

    expect(screen.getByText("Mina Chen")).toBeInTheDocument()
    expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument()
  })

  it("hides verified badge when the lister is not verified", () => {
    render(
      <ListingGridCardAgentAttribution
        agent={createListingAgentProfile({
          displayName: "Mina Chen",
          isVerified: false,
        })}
      />,
    )

    expect(screen.queryByLabelText("Verified lister")).not.toBeInTheDocument()
  })

  it("renders nothing when agent data is missing", () => {
    const { container } = render(
      <ListingGridCardAgentAttribution agent={null} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when display name is blank", () => {
    const { container } = render(
      <ListingGridCardAgentAttribution
        agent={createListingAgentProfile({ displayName: "   " })}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
