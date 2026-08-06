import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import type { BuildingNeighbourhood } from "@/features/buildings/api/getBuildingNeighbourhood"

import {
  LISTING_NEARBY_SECTION_TITLE,
  ListingNearbySection,
} from "./ListingNearbySection"

const mockUseBuildingNeighbourhood = vi.fn()
const mockExploreOpen = vi.fn()

vi.mock("@/features/buildings/api/useBuildingNeighbourhood", () => ({
  useBuildingNeighbourhood: (...args: unknown[]) =>
    mockUseBuildingNeighbourhood(...args),
}))

vi.mock("@/features/buildings/neighbourhood-explore", () => ({
  useNeighbourhoodExploreDialogContext: () => ({
    isOpen: false,
    open: mockExploreOpen,
    close: vi.fn(),
  }),
}))

const sampleData: BuildingNeighbourhood = {
  buildingId: "building-1",
  origin: { lat: 13.7, lng: 100.6 },
  radiusMeters: 1000,
  fetchRadiusMeters: 2000,
  fetchedAt: "2026-08-05T00:00:00.000Z",
  cacheStatus: "hit",
  source: "openstreetmap",
  summary: { all: 2 },
  categories: [],
  places: [
    {
      id: "mrt-1",
      name: "Phetchaburi MRT",
      lat: 13.7,
      lng: 100.6,
      category: "public_transport",
      mode: "mrt",
      distanceMeters: 450,
    },
    {
      id: "cafe-1",
      name: "Local Cafe",
      lat: 13.7,
      lng: 100.6,
      category: "cafe",
      distanceMeters: 120,
    },
  ],
}

function renderNearby(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe("ListingNearbySection", () => {
  beforeEach(() => {
    mockExploreOpen.mockReset()
    mockUseBuildingNeighbourhood.mockReset()
    mockUseBuildingNeighbourhood.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    })
  })

  it("renders nothing without a building id", () => {
    const { container } = renderNearby(
      <ListingNearbySection buildingId="   " />,
    )

    expect(container).toBeEmptyDOMElement()
    expect(mockUseBuildingNeighbourhood).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    )
  })

  it("does not fetch while collapsed", () => {
    renderNearby(<ListingNearbySection buildingId="building-1" />)

    expect(
      screen.getByRole("button", { name: LISTING_NEARBY_SECTION_TITLE }),
    ).toHaveAttribute("aria-expanded", "false")
    expect(mockUseBuildingNeighbourhood).toHaveBeenCalledWith(
      expect.objectContaining({
        buildingId: "building-1",
        enabled: false,
      }),
    )
  })

  it("fetches on expand and shows nearest places plus explore CTA", async () => {
    mockUseBuildingNeighbourhood.mockImplementation(
      ({ enabled }: { enabled: boolean }) => ({
        data: enabled ? sampleData : undefined,
        isPending: false,
        isError: false,
        isFetching: false,
        refetch: vi.fn(),
      }),
    )

    renderNearby(<ListingNearbySection buildingId="building-1" />)

    fireEvent.click(
      screen.getByRole("button", { name: LISTING_NEARBY_SECTION_TITLE }),
    )

    await waitFor(() => {
      expect(mockUseBuildingNeighbourhood).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
      )
    })

    expect(screen.getByText("Phetchaburi MRT")).toBeInTheDocument()
    expect(screen.getByText("Local Cafe")).toBeInTheDocument()
    expect(screen.getByText(/MRT \/ BTS/)).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: "Explore more on the map" }),
    )
    expect(mockExploreOpen).toHaveBeenCalledOnce()
  })

  it("shows retry when the neighbourhood query fails", () => {
    const refetch = vi.fn()
    mockUseBuildingNeighbourhood.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isFetching: false,
      refetch,
    })

    renderNearby(
      <ListingNearbySection buildingId="building-1" defaultOpen />,
    )

    expect(screen.getByText(/Couldn't load nearby places/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
