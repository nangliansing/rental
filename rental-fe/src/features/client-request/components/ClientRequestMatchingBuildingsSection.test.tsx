import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ClientRequestMatchingBuildingsSection } from "./ClientRequestMatchingBuildingsSection"

const matchingBuildingsState = vi.hoisted(() => ({
  buildings: [] as Array<{
    _id: string
    name: string
    buildingType: string
    minRent: number | null
    distanceMeters: number | null
    listings: unknown[]
  }>,
  status: "success" as string,
  searchSource: "nearby" as string | null,
  canSearch: true,
  hasNextPage: false,
  isFetchingNextPage: false,
  isRefreshing: false,
  isError: false,
  fetchNextPage: vi.fn(),
  refetchActiveSearch: vi.fn(),
}))

vi.mock(
  "@/features/client-request/api/useClientRequestMatchingBuildings",
  () => ({
    useClientRequestMatchingBuildings: () => matchingBuildingsState,
  }),
)

vi.mock("@/features/map-search/components/results/BuildingCard", () => ({
  BuildingCard: ({
    building,
  }: {
    building: { name: string }
  }) => <div>{building.name}</div>,
}))

describe("ClientRequestMatchingBuildingsSection", () => {
  beforeEach(() => {
    matchingBuildingsState.buildings = [
      {
        _id: "b1",
        name: "Asoke Residence",
        buildingType: "Condo",
        minRent: 20_000,
        distanceMeters: 120,
        listings: [],
      },
    ]
    matchingBuildingsState.status = "success"
    matchingBuildingsState.searchSource = "nearby"
    matchingBuildingsState.canSearch = true
    matchingBuildingsState.hasNextPage = false
    matchingBuildingsState.isFetchingNextPage = false
    matchingBuildingsState.isRefreshing = false
    matchingBuildingsState.isError = false
  })

  it("renders matching buildings from the shared search stack", () => {
    render(
      <ClientRequestMatchingBuildingsSection
        geoSearch={{
          mode: "nearby",
          position: { lat: 13.7, lng: 100.5 },
          radiusMeters: 1000,
        }}
        filters={{ bedroomCount: 2 }}
      />,
    )

    expect(
      screen.getByRole("heading", { name: "Matching buildings" }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /match this saved search/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("Asoke Residence")).toBeInTheDocument()
  })

  it("shows an unavailable location message when geo cannot be searched", () => {
    matchingBuildingsState.canSearch = false
    matchingBuildingsState.status = "idle"
    matchingBuildingsState.buildings = []

    render(
      <ClientRequestMatchingBuildingsSection
        geoSearch={{ mode: "nearby" }}
        filters={{}}
      />,
    )

    expect(screen.getByText("Location unavailable")).toBeInTheDocument()
  })

  it("shows client-request empty copy instead of map-search placeholder", () => {
    matchingBuildingsState.status = "empty"
    matchingBuildingsState.buildings = []

    render(
      <ClientRequestMatchingBuildingsSection
        geoSearch={{
          mode: "nearby",
          position: { lat: 13.7, lng: 100.5 },
          radiusMeters: 1000,
        }}
        filters={{}}
      />,
    )

    expect(screen.getByText("Watching for matches")).toBeInTheDocument()
    expect(
      screen.getByText(/Nothing matches yet/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /When new buildings fit this saved search, they’ll show up here/i,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText("No buildings found")).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Try moving the map/i),
    ).not.toBeInTheDocument()
  })
})
