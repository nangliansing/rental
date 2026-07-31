import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useBuildingById } from "@/features/buildings/api"
import { useListingDetailData } from "@/features/listing/hooks/useListingDetailData"
import { useSearchListingsInBuilding } from "@/features/map-search/api/useSearchListingsInBuilding"
import { StandalonePageBackProvider } from "@/shared/components/navigation/StandalonePageBackContext"
import { StandalonePageHeader } from "@/shared/components/navigation/StandalonePageHeader"
import { __resetModalHistoryStackForTests } from "@/shared/utils/modalHistoryStack"
import {
  createSearchBuilding,
  createSearchListing,
} from "@/test/fixtures/listings"

import { BuildingPage } from "./BuildingPage"
import { ListingDetailPage } from "@/features/listing/pages/ListingDetailPage"

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
vi.mock("@/features/listing/hooks/useListingDetailData")
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { _id: "viewer-1", status: "ACTIVE" },
    isAuthenticated: true,
    isLoading: false,
  }),
}))
vi.mock("@/features/profile/api", () => ({
  useMyAgentProfile: () => ({
    canCreateListing: false,
    isPending: false,
  }),
}))
vi.mock("@/features/building-follow/components/BuildingFollowersSection", () => ({
  BuildingFollowersSection: () => (
    <section aria-label="Building followers preview">Followers</section>
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
    ExploreNeighbourhoodButton: () => null,
    NeighbourhoodExploreDialogProvider: ({
      children,
    }: {
      children: React.ReactNode
    }) => children,
    useNeighbourhoodExploreDialog: () => exploreControl,
    useNeighbourhoodExploreDialogContext: () => exploreControl,
  }
})

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

function StandaloneTestLayout() {
  return (
    <StandalonePageBackProvider>
      <StandalonePageHeader />
      <Outlet />
    </StandalonePageBackProvider>
  )
}

function renderNavigationFlow(
  initialEntry:
    | string
    | {
        pathname: string
        state?: { returnTo?: string }
      } = "/buildings/building-1",
) {
  const router = createMemoryRouter(
    [
      {
        element: <StandaloneTestLayout />,
        children: [
          {
            path: "/buildings/:buildingId",
            element: <BuildingPage />,
          },
          {
            path: "/listings/:listingId",
            element: <ListingDetailPage />,
          },
        ],
      },
    ],
    { initialEntries: [initialEntry] },
  )

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  return router
}

describe("building listing navigation integration", () => {
  const building = createSearchBuilding({ _id: "building-1" })
  const listingOne = createSearchListing({
    _id: "listing-1",
    building,
  })
  const listingTwo = createSearchListing({
    _id: "listing-2",
    rent: 16_000,
    building,
  })

  beforeEach(() => {
    __resetModalHistoryStackForTests()
    window.history.replaceState({}, "")
    window.scrollTo = vi.fn()

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
            data: { building, listings: [listingOne, listingTwo] },
            pagination: { total: 2 },
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

    vi.mocked(useListingDetailData).mockImplementation(({ listingId }) => {
      const listing =
        listingId === "listing-2"
          ? listingTwo
          : listingId === "listing-1"
            ? listingOne
            : null

      return {
        listing,
        isLoading: false,
        viewerUserId: "viewer-1",
      } as never
    })
  })

  afterEach(() => {
    __resetModalHistoryStackForTests()
    window.history.replaceState({}, "")
    document.body.style.overflow = ""
  })

  it("opens a listing from the building page", async () => {
    const user = userEvent.setup()
    const router = renderNavigationFlow()

    await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))
    await user.click(
      screen.getByRole("link", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )

    expect(router.state.location.pathname).toBe("/listings/listing-1")
  })

  it("can switch between listings in the same building", async () => {
    const user = userEvent.setup()
    const router = renderNavigationFlow()

    await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))
    await user.click(
      screen.getByRole("link", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )

    const moreRoomsHeading = await screen.findByRole("heading", {
      name: "More rooms in this building",
    })

    await user.click(
      within(moreRoomsHeading.closest("section") as HTMLElement).getByRole(
        "button",
        {
          name: "Open listing ฿16k",
        },
      ),
    )
    await user.click(
      screen.getByRole("link", {
        name: "Preview listing ฿16k. Tap for full details.",
      }),
    )

    expect(router.state.location.pathname).toBe("/listings/listing-2")
  })

  it("returns to the building page from a listing using browser back", async () => {
    const user = userEvent.setup()
    const router = renderNavigationFlow()

    await user.click(screen.getByRole("button", { name: "Open listing ฿14k" }))
    await user.click(
      screen.getByRole("link", {
        name: "Preview listing ฿14k. Tap for full details.",
      }),
    )

    expect(router.state.location.pathname).toBe("/listings/listing-1")

    await user.click(screen.getByRole("button", { name: "Go back" }))

    expect(router.state.location.pathname).toBe("/buildings/building-1")
  })
})
