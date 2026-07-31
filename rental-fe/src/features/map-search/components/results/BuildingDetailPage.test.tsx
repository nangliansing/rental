import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"
import { renderWithProviders } from "@/test/renderWithProviders"

import { useSearchListingsInBuilding } from "../../api/useSearchListingsInBuilding"
import { BuildingDetailSessionProvider } from "../../context/BuildingDetailSessionContext"
import { useMapSearchFilters } from "../../context/MapSearchFilterContext"
import { useMapSearchResults } from "../../context/MapSearchSessionContext"
import { BuildingDetailPage } from "./BuildingDetailPage"

vi.mock("../../api/useSearchListingsInBuilding")
vi.mock("../../context/MapSearchFilterContext")
vi.mock("../../context/MapSearchSessionContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../context/MapSearchSessionContext")
  >("../../context/MapSearchSessionContext")

  return {
    ...actual,
    useMapSearchResults: vi.fn(),
  }
})
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: { _id: "viewer-1", status: "ACTIVE" },
    isAuthenticated: true,
    isLoading: false,
  })),
}))
vi.mock("@/features/building-follow/components/BuildingFollowersSection", () => ({
  BuildingFollowersSection: () => (
    <section aria-label="Building followers preview">Followers</section>
  ),
}))
vi.mock("@/features/buildings/components/BuildingSummaryCard", () => ({
  BuildingSummaryCard: ({ building }: { building: { name: string } }) => (
    <h1>{building.name}</h1>
  ),
}))
vi.mock("@/features/buildings/neighbourhood-explore", () => {
  const exploreControl = {
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
  }

  return {
    BuildingNeighbourhoodExploreModal: () => null,
    NeighbourhoodExploreDialogProvider: ({
      children,
    }: {
      children: React.ReactNode
    }) => children,
    useNeighbourhoodExploreDialog: () => exploreControl,
    useNeighbourhoodExploreDialogContext: () => exploreControl,
  }
})
vi.mock("@/features/listing/components/ListingDetailModal", () => ({
  ListingDetailModal: ({
    listingId,
    onClose,
  }: {
    listingId: string | null
    onClose: () => void
  }) =>
    listingId ? (
      <div role="dialog" aria-label="Listing details">
        <span>Selected {listingId}</span>
        <button type="button" onClick={onClose}>Close details</button>
      </div>
    ) : null,
}))

describe("BuildingDetailPage", () => {
  beforeEach(() => {
    const building = createSearchBuilding()
    const listing = createSearchListing()

    vi.mocked(useMapSearchFilters).mockReturnValue({ filters: {} } as never)
    vi.mocked(useSearchListingsInBuilding).mockReturnValue({
      data: {
        pages: [{
          data: { building, listings: [listing] },
          pagination: { total: 1 },
        }],
      },
      isPending: false,
      isError: false,
      isFetching: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    } as never)
  })

  it("uses a compact preview to open the existing details modal and restores focus", async () => {
    const listingState = {
      pendingListingId: null as string | null,
    }

    vi.mocked(useMapSearchResults).mockImplementation(
      () =>
        ({
          selectedBuilding: createSearchBuilding(),
          canCreateListing: false,
          isListingSearch: false,
          get pendingListingId() {
            return listingState.pendingListingId
          },
          onListingSelect: (listingId: string) => {
            listingState.pendingListingId = listingId
          },
          onListingClose: () => {
            listingState.pendingListingId = null
          },
        }) as never,
    )

    const { rerender, user } = renderWithProviders(
      <BuildingDetailSessionProvider>
        <BuildingDetailPage onBack={vi.fn()} />
      </BuildingDetailSessionProvider>,
    )

    const preview = screen.getByRole("button", { name: "Open listing ฿14k" })

    await user.click(preview)

    expect(
      screen.getByRole("dialog", { name: "Preview listing ฿14k" }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )
    rerender(
      <BuildingDetailSessionProvider>
        <BuildingDetailPage onBack={vi.fn()} />
      </BuildingDetailSessionProvider>,
    )

    expect(
      screen.getByRole("dialog", { name: "Listing details" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Selected listing-1")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Close details" }))
    rerender(
      <BuildingDetailSessionProvider>
        <BuildingDetailPage onBack={vi.fn()} />
      </BuildingDetailSessionProvider>,
    )

    expect(screen.queryByRole("dialog", { name: "Listing details" })).not.toBeInTheDocument()
    expect(preview).toHaveFocus()
  })
})
