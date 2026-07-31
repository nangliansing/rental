import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

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

vi.mock("./grid-preview", async () => {
  const actual = await vi.importActual<typeof import("./grid-preview")>("./grid-preview")

  return {
    ...actual,
    ListingGridPreviewPortal: ({
      detailMode,
      onOpenDetail,
      resolveDetailLink,
    }: {
      detailMode: "modal" | "link"
      onOpenDetail?: (listingId: string) => void
      resolveDetailLink?: (listingId: string) => { to: string; state?: unknown } | null
    }) => {
      if (detailMode === "modal") {
        return (
          <button type="button" onClick={() => onOpenDetail?.("listing-2")}>
            Open sibling from preview
          </button>
        )
      }

      const link = resolveDetailLink?.("listing-2")

      return (
        <a href={link?.to ?? "#"} data-testid="sibling-preview-link">
          Open sibling from preview
        </a>
      )
    },
  }
})

vi.mock("@/features/buildings/components/BuildingPanelSummarySection", () => ({
  BuildingPanelSummarySection: () => <div>Building card</div>,
}))

vi.mock("@/features/map-search/api/useSearchListingsInBuilding", () => ({
  useSearchListingsInBuilding: vi.fn(),
}))

import { useSearchListingsInBuilding } from "@/features/map-search/api/useSearchListingsInBuilding"

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
  beforeEach(() => {
    vi.mocked(useSearchListingsInBuilding).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
    } as never)
  })

  it("opens sibling listings in modal mode from the more-rooms preview", async () => {
    const onListingSelect = vi.fn()
    const building = createSearchBuilding({ _id: "building-1", name: "Harbour View" })

    vi.mocked(useSearchListingsInBuilding).mockReturnValue({
      data: {
        pages: [
          {
            data: {
              building,
              listings: [
                createSearchListing({ _id: "listing-1", building }),
                createSearchListing({ _id: "listing-2", building }),
              ],
            },
            pagination: { total: 2 },
          },
        ],
      },
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
    } as never)

    const { user } = renderWithProviders(
      <ListingDetailContent
        listing={createSearchListing({ _id: "listing-1", building })}
        onListingSelect={onListingSelect}
      />,
    )

    expect(
      screen.getByRole("heading", { name: "More rooms in this building" }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Open sibling from preview" }),
    )

    expect(onListingSelect).toHaveBeenCalledWith("listing-2")
  })

  it("resolves sibling listing links in link mode from the more-rooms preview", async () => {
    const building = createSearchBuilding({ _id: "building-1", name: "Harbour View" })

    vi.mocked(useSearchListingsInBuilding).mockReturnValue({
      data: {
        pages: [
          {
            data: {
              building,
              listings: [
                createSearchListing({ _id: "listing-1", building }),
                createSearchListing({ _id: "listing-2", building }),
              ],
            },
            pagination: { total: 2 },
          },
        ],
      },
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      fetchNextPage: vi.fn(),
    } as never)

    const { user } = renderWithProviders(
      <ListingDetailContent
        listing={createSearchListing({ _id: "listing-1", building })}
        siblingPreviewDetailMode="link"
      />,
      { initialEntries: ["/listings/listing-1"] },
    )

    expect(
      screen.getByRole("heading", { name: "More rooms in this building" }),
    ).toBeInTheDocument()

    await user.click(screen.getByTestId("sibling-preview-link"))

    expect(screen.getByTestId("sibling-preview-link")).toHaveAttribute(
      "href",
      "/listings/listing-2",
    )
  })

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
