import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  createListingAgentProfile,
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"
import { renderWithProviders } from "@/test/renderWithProviders"

import { ListingDetailContent } from "./ListingDetailContent"

vi.mock("./ListingPostCard", () => ({
  ListingPostCard: () => <div>Listing post card</div>,
}))

vi.mock("@/features/buildings/components/BuildingPanelSummarySection", () => ({
  BuildingPanelSummarySection: () => <div>Building card</div>,
}))

vi.mock("@/features/map-search/api/useSearchListingsInBuilding", () => ({
  useSearchListingsInBuilding: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: vi.fn(),
  }),
}))

vi.mock("@/features/buildings/neighbourhood-explore", () => ({
  useNeighbourhoodExploreDialogContext: () => null,
}))

vi.mock("./reviews/ListingDetailReviewsSection", () => ({
  ListingDetailReviewsSection: ({
    listing,
  }: {
    listing: { agentProfile?: { reviewSummary?: { averageRating?: number; reviewCount?: number } } }
  }) => {
    const summary = listing.agentProfile?.reviewSummary
    const meta =
      summary && summary.reviewCount && summary.reviewCount > 0
        ? `${Number(summary.averageRating).toFixed(1)} (${summary.reviewCount} ${
            summary.reviewCount === 1 ? "review" : "reviews"
          })`
        : "No reviews yet"

    return (
      <section aria-label="Reviews">
        <div>Lister reviews</div>
        <div>{meta}</div>
        <div>Listing reviews</div>
        <div>Coming soon</div>
      </section>
    )
  },
}))

describe("ListingDetailContent", () => {
  it("places the reviews section between listing and building cards", () => {
    const listing = createSearchListing({
      building: createSearchBuilding({ name: "Harbour View" }),
      agentProfile: createListingAgentProfile({
        reviewSummary: {
          averageRating: 4.5,
          reviewCount: 30,
          ratingCounts: {
            oneStar: 0,
            twoStars: 0,
            threeStars: 0,
            fourStars: 15,
            fiveStars: 15,
          },
          tagCounts: [],
        },
      }),
    })

    const { container } = renderWithProviders(
      <ListingDetailContent listing={listing} />,
    )

    expect(screen.getByText("Listing post card")).toBeInTheDocument()
    expect(screen.getByLabelText("Reviews")).toBeInTheDocument()
    expect(screen.getByText("Building card")).toBeInTheDocument()

    const markup = container.textContent ?? ""
    expect(markup.indexOf("Listing post card")).toBeLessThan(
      markup.indexOf("Lister reviews"),
    )
    expect(markup.indexOf("Lister reviews")).toBeLessThan(
      markup.indexOf("Building card"),
    )

    expect(screen.getByText("4.5 (30 reviews)")).toBeInTheDocument()
    expect(screen.getByText("Coming soon")).toBeInTheDocument()
  })

  it("shows No reviews yet when the lister has no review summary", () => {
    renderWithProviders(
      <ListingDetailContent
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({ reviewSummary: undefined }),
        })}
      />,
    )

    expect(screen.getByText("Lister reviews")).toBeInTheDocument()
    expect(screen.getByText("No reviews yet")).toBeInTheDocument()
  })

  it("formats a singular lister review count", () => {
    renderWithProviders(
      <ListingDetailContent
        listing={createSearchListing({
          building: createSearchBuilding(),
          agentProfile: createListingAgentProfile({
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
              tagCounts: [],
            },
          }),
        })}
      />,
    )

    expect(screen.getByText("5.0 (1 review)")).toBeInTheDocument()
  })
})
