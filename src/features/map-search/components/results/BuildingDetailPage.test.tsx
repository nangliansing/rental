import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"

import { useSearchListingsInBuilding } from "../../api/useSearchListingsInBuilding"
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
vi.mock("@/features/buildings/components/BuildingSummaryCard", () => ({
  BuildingSummaryCard: ({ building }: { building: { name: string } }) => (
    <h1>{building.name}</h1>
  ),
}))
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
    vi.mocked(useMapSearchResults).mockReturnValue({
      selectedBuilding: building,
      canCreateListing: false,
      isListingSearch: false,
      onListExistingBuilding: vi.fn(),
    } as never)
    vi.mocked(useSearchListingsInBuilding).mockReturnValue({
      data: {
        pages: [{
          data: { building, listings: [listing] },
          pagination: { total: 1 },
        }],
      },
      isLoading: false,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    } as never)
  })

  it("uses a compact preview to open the existing details modal and restores focus", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <BuildingDetailPage onBack={vi.fn()} />
      </MemoryRouter>,
    )

    const preview = screen.getByRole("button", { name: "Open listing ฿14k" })
    expect(screen.getByTestId("building-listing-grid")).toHaveClass(
      "grid-cols-2",
      "gap-0.5",
      "md:gap-1",
    )
    expect(screen.getByTestId("building-listing-grid")).not.toHaveClass(
      "sm:grid-cols-3",
    )
    expect(screen.getByTestId("building-listing-grid")).not.toHaveClass(
      "px-4",
      "pb-2",
    )
    expect(screen.queryByRole("article")).not.toBeInTheDocument()

    await user.click(preview)

    expect(
      screen.getByRole("dialog", { name: "Listing details" }),
    ).toBeInTheDocument()
    expect(screen.getByText("Selected listing-1")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Close details" }))

    expect(screen.queryByRole("dialog", { name: "Listing details" })).not.toBeInTheDocument()
    expect(preview).toHaveFocus()
  })
})
