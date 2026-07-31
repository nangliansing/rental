import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { Route, Routes } from "react-router-dom"

import { useBuildingById } from "@/features/buildings/api"
import { useSearchListingsInBuilding } from "@/features/map-search/api/useSearchListingsInBuilding"
import { ApiError } from "@/lib/api-client"
import {
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"
import { renderWithProviders } from "@/test/renderWithProviders"

import { BuildingPage } from "./BuildingPage"

const navigateMock = vi.fn()
const scrollToMock = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  )

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock("@/features/buildings/api", async () => {
  const actual = await vi.importActual<typeof import("@/features/buildings/api")>(
    "@/features/buildings/api",
  )

  return {
    ...actual,
    useBuildingById: vi.fn(),
  }
})

vi.mock("@/features/map-search/api/useSearchListingsInBuilding")
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
vi.mock("@/features/buildings/components/BuildingPanelSummarySection", () => ({
  BuildingPanelSummarySection: ({ building }: { building: { name: string } }) => (
    <section aria-label="Building summary">
      <h1>{building.name}</h1>
    </section>
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

function renderBuildingPage(initialEntry = "/buildings/building-1") {
  return renderWithProviders(
    <Routes>
      <Route path="/buildings/:buildingId" element={<BuildingPage />} />
      <Route path="/listings/:listingId" element={<div>Listing page</div>} />
    </Routes>,
    { initialEntries: [initialEntry] },
  )
}

describe("BuildingPage", () => {
  beforeEach(() => {
    navigateMock.mockReset()
    scrollToMock.mockReset()
    window.scrollTo = scrollToMock

    const building = createSearchBuilding()
    const listing = createSearchListing()

    vi.mocked(useBuildingById).mockReturnValue({
      data: building,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never)

    vi.mocked(useSearchListingsInBuilding).mockReturnValue({
      data: {
        pages: [
          {
            data: { building, listings: [listing] },
            pagination: { total: 1 },
          },
        ],
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

  it("renders the building summary, followers section, and listings", () => {
    renderBuildingPage()

    expect(screen.getByRole("heading", { name: "Bangkapi Residence" })).toBeInTheDocument()
    expect(
      screen.getByRole("region", { name: "Building followers preview" }),
    ).toBeInTheDocument()
    expect(screen.getByText("1 available listings")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Open listing ฿14k" }),
    ).toBeInTheDocument()
  })

  it("links to the listing detail page from the preview", async () => {
    const { user } = renderBuildingPage()

    await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))

    const detailLink = screen.getByRole("link", {
      name: "Preview listing ฿14k. Tap for full details.",
    })

    expect(detailLink).toHaveAttribute("href", "/listings/listing-1")

    await user.click(detailLink)

    expect(screen.getByText("Listing page")).toBeInTheDocument()
  })

  it("shows a loading state while the building is fetching", () => {
    vi.mocked(useBuildingById).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never)

    renderBuildingPage()

    expect(screen.getByText("Loading building...")).toBeInTheDocument()
  })

  it("shows a retryable error when the building request fails", async () => {
    const refetch = vi.fn()
    vi.mocked(useBuildingById).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Server unavailable", 500, "INTERNAL_ERROR"),
      refetch,
    } as never)

    const { user } = renderBuildingPage()

    expect(
      screen.getByRole("heading", { name: "Could not load building" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it("shows an empty listings state", () => {
    vi.mocked(useSearchListingsInBuilding).mockReturnValue({
      data: {
        pages: [
          {
            data: { building: createSearchBuilding(), listings: [] },
            pagination: { total: 0 },
          },
        ],
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

    renderBuildingPage()

    expect(screen.getByText("0 available listings")).toBeInTheDocument()
    expect(screen.getByText("No listings available")).toBeInTheDocument()
  })

  it("shows a listings fetch error with retry", async () => {
    const refetch = vi.fn()
    vi.mocked(useSearchListingsInBuilding).mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      isFetching: false,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch,
    } as never)

    const { user } = renderBuildingPage()

    expect(screen.getByText("Could not load listings")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Try again" }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it("scrolls to the top when the route building id changes", () => {
    renderBuildingPage("/buildings/building-1")
    expect(scrollToMock).toHaveBeenCalledWith(0, 0)
  })

  it("shows a not-found state for blank building ids", () => {
    renderBuildingPage("/buildings/%20%20")

    expect(
      screen.getByRole("heading", { name: "Building not found" }),
    ).toBeInTheDocument()
  })

  it("shows a not-found state for missing buildings", () => {
    vi.mocked(useBuildingById).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Building not found", 404, "BUILDING_NOT_FOUND"),
      refetch: vi.fn(),
    } as never)

    renderBuildingPage()

    expect(
      screen.getByRole("heading", { name: "Building not found" }),
    ).toBeInTheDocument()
  })

  it("shows a background refresh loader while keeping cached listings visible", () => {
    vi.mocked(useSearchListingsInBuilding).mockReturnValue({
      data: {
        pages: [
          {
            data: { building: createSearchBuilding(), listings: [createSearchListing()] },
            pagination: { total: 1 },
          },
        ],
      },
      isPending: false,
      isError: false,
      isFetching: true,
      isFetchingNextPage: false,
      isFetchNextPageError: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    } as never)

    const { container } = renderBuildingPage()

    expect(screen.getByText("1 available listings")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Open listing ฿14k" }),
    ).toBeInTheDocument()
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("1 available listings")
    expect(status.querySelector("svg")).toHaveClass("animate-spin")
  })
})
