import type { ReactNode } from "react"
import { useEffect } from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClientProvider } from "@tanstack/react-query"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { buildListerMapSearchUrl } from "@/features/agent/lister-map-search/buildListerMapSearchUrl"
import { createListerMapSearchNavigationState } from "@/features/agent/lister-map-search/navigationState"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { useMyAgentProfile } from "@/features/profile/api"
import { Toaster } from "@/components/ui/toaster"
import { createListerProfile } from "@/test/fixtures/listerProfile"
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/renderWithProviders"

import type { SearchBounds } from "../hooks/useMapBounds"
import type { SearchBuilding } from "../types"
import { MapSearchPage } from "./MapSearchPage"

const searchMocks = vi.hoisted(() => ({
  area: vi.fn(),
  nearby: vi.fn(),
  line: vi.fn(),
  listingsInBuilding: vi.fn(),
}))

const getListerProfileById = vi.hoisted(() => vi.fn())
const toastSpy = vi.hoisted(() => vi.fn())

const googleMapsMocks = vi.hoisted(() => {
  const handlers: {
    onDragstart?: () => void
    onClick?: (event: unknown) => void
    onIdle?: () => void
  } = {}

  let bounds: SearchBounds = {
    northEast: { lat: 14, lng: 101 },
    southWest: { lat: 13, lng: 100 },
  }

  let center = { lat: 13.5, lng: 100.5 }

  const createLatLng = (lat: number, lng: number) => ({
    lat: () => lat,
    lng: () => lng,
  })

  const map = {
    getBounds: () => ({
      getNorthEast: () =>
        createLatLng(bounds.northEast.lat, bounds.northEast.lng),
      getSouthWest: () =>
        createLatLng(bounds.southWest.lat, bounds.southWest.lng),
    }),
    getCenter: () => createLatLng(center.lat, center.lng),
    getZoom: () => 15,
    fitBounds: vi.fn(),
  }

  return {
    handlers,
    map,
    setBounds: (next: SearchBounds) => {
      bounds = next
    },
    setCenter: (next: { lat: number; lng: number }) => {
      center = next
    },
    resetBounds: () => {
      bounds = {
        northEast: { lat: 14, lng: 101 },
        southWest: { lat: 13, lng: 100 },
      }
    },
    resetCenter: () => {
      center = { lat: 13.5, lng: 100.5 }
    },
    triggerMapPan: () => {
      handlers.onDragstart?.()
      handlers.onIdle?.()
    },
    triggerMapClick: (position = { lat: 13.8, lng: 100.7 }) => {
      handlers.onClick?.({
        detail: { latLng: position },
      })
    },
  }
})

const initialAreaBounds: SearchBounds = {
  northEast: { lat: 14, lng: 101 },
  southWest: { lat: 13, lng: 100 },
}

const pannedAreaBounds: SearchBounds = {
  northEast: { lat: 15, lng: 102 },
  southWest: { lat: 14, lng: 101 },
}

const areaSearchUrl =
  "/?search=area&neLat=14&neLng=101&swLat=13&swLng=100"

const brokenBuildingDeepLinkUrl =
  "/?search=area&neLat=14&neLng=101&swLat=13&swLng=100&building=missing-building-id"

const urlAreaFilters = {
  minRent: 5_000,
  bedroomCount: 1,
}

const filteredAreaSearchUrl = `/?search=area&neLat=14&neLng=101&swLat=13&swLng=100&filters=${encodeURIComponent(JSON.stringify(urlAreaFilters))}`

const nearbyPinPosition = { lat: 13.7563, lng: 100.5018 }
const movedNearbyPinPosition = { lat: 13.8, lng: 100.7 }
const defaultMapCenter = { lat: 13.5, lng: 100.5 }

const nearbySearchUrl =
  "/?search=nearby&lat=13.75630&lng=100.50180&radius=1000"

const linePoint1 = { lat: 13.76531, lng: 100.6421 }
const linePoint2 = { lat: 13.775, lng: 100.652 }
const linePoint3 = { lat: 13.785, lng: 100.662 }

const lineGeometry = {
  type: "LineString" as const,
  coordinates: [
    [linePoint1.lng, linePoint1.lat],
    [linePoint2.lng, linePoint2.lat],
  ] as [[number, number], [number, number]],
}

const updatedLineGeometry = {
  type: "LineString" as const,
  coordinates: [
    [linePoint1.lng, linePoint1.lat],
    [linePoint2.lng, linePoint2.lat],
    [linePoint3.lng, linePoint3.lat],
  ] as [[number, number], [number, number], [number, number]],
}

const lineSearchUrl =
  "/?search=line&line=100.64210,13.76531;100.65200,13.77500&radius=500"

const mockBuilding: SearchBuilding = {
  _id: "building-area-1",
  name: "Area Test Residence",
  buildingType: "Apartment",
  facilities: ["Parking"],
  security: ["CCTV"],
  location: { type: "Point", coordinates: [100.5, 13.5] },
  address: "123 Test Street, Bangkok",
  minRent: 8_000,
  maxRent: 12_000,
  listings: [],
  distanceMeters: 500,
}

const secondaryMockBuilding: SearchBuilding = {
  ...mockBuilding,
  _id: "building-area-2",
  name: "Second Area Residence",
  address: "999 Other Street, Bangkok",
  minRent: 12_000,
  maxRent: 15_000,
  location: { type: "Point", coordinates: [100.6, 13.6] },
  distanceMeters: 700,
}

const pannedMockBuilding: SearchBuilding = {
  ...mockBuilding,
  _id: "building-area-panned",
  name: "Panned Area Residence",
  address: "456 New View Road, Bangkok",
  location: { type: "Point", coordinates: [101.5, 14.5] },
}

const nearbyMockBuilding: SearchBuilding = {
  ...mockBuilding,
  _id: "building-nearby-1",
  name: "Nearby Pin Residence",
  address: "789 Pin Lane, Bangkok",
  location: {
    type: "Point",
    coordinates: [nearbyPinPosition.lng, nearbyPinPosition.lat],
  },
  distanceMeters: 120,
}

const movedNearbyMockBuilding: SearchBuilding = {
  ...nearbyMockBuilding,
  _id: "building-nearby-2",
  name: "Moved Pin Residence",
  address: "101 Relocated Alley, Bangkok",
  location: {
    type: "Point",
    coordinates: [movedNearbyPinPosition.lng, movedNearbyPinPosition.lat],
  },
  distanceMeters: 80,
}

const droppedPinMockBuilding: SearchBuilding = {
  ...mockBuilding,
  _id: "building-nearby-dropped",
  name: "Dropped Pin Residence",
  address: "202 Center Street, Bangkok",
  location: {
    type: "Point",
    coordinates: [defaultMapCenter.lng, defaultMapCenter.lat],
  },
  distanceMeters: 200,
}

const lineMockBuilding: SearchBuilding = {
  ...mockBuilding,
  _id: "building-line-1",
  name: "Line Corridor Residence",
  address: "303 Route Street, Bangkok",
  location: {
    type: "Point",
    coordinates: [linePoint1.lng, linePoint1.lat],
  },
  distanceMeters: 250,
}

const updatedLineMockBuilding: SearchBuilding = {
  ...lineMockBuilding,
  _id: "building-line-2",
  name: "Extended Line Residence",
  address: "404 Extended Route, Bangkok",
  location: {
    type: "Point",
    coordinates: [linePoint3.lng, linePoint3.lat],
  },
  distanceMeters: 180,
}

vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: ReactNode }) => children,
  Map: ({
    children,
    onDragstart,
    onClick,
    onIdle,
  }: {
    children?: ReactNode
    onDragstart?: () => void
    onClick?: (event: unknown) => void
    onIdle?: () => void
  }) => {
    googleMapsMocks.handlers.onDragstart = onDragstart
    googleMapsMocks.handlers.onClick = onClick
    googleMapsMocks.handlers.onIdle = onIdle

    useEffect(() => {
      onIdle?.()
    }, [onIdle])

    return <div data-testid="map">{children}</div>
  },
  AdvancedMarker: ({
    children,
    title,
  }: {
    children?: ReactNode
    title?: string
  }) => (
    <div data-testid="advanced-marker" data-title={title}>
      {children}
    </div>
  ),
  Circle: () => <div data-testid="circle-overlay" />,
  Polygon: () => <div data-testid="polygon-overlay" />,
  Polyline: () => <div data-testid="polyline-overlay" />,
  useAdvancedMarkerRef: () => [vi.fn(), null],
  useMap: () => googleMapsMocks.map,
}))

vi.mock("../hooks/useGoogleMapsLoadState", () => ({
  useGoogleMapsLoadState: () => ({
    status: "ready",
    markReady: vi.fn(),
    markFailed: vi.fn(),
  }),
}))

vi.mock("../hooks/useMapCameraTransition", () => ({
  useMapCameraTransition: () => ({ flyTo: vi.fn(), isMoving: false }),
}))

vi.mock("../utils/line-coverage", () => ({
  buildLineCoveragePolygon: vi.fn(() => []),
}))

vi.mock("@googlemaps/markerclusterer", () => ({
  MarkerClusterer: class MarkerClusterer {
    clearMarkers = vi.fn()
    addMarkers = vi.fn()

    constructor(_options: unknown) {}
  },
}))

vi.mock("./place-search/PlaceSearch", () => ({
  PlaceSearch: () => <div data-testid="place-search" />,
}))

vi.mock("../api/searchBuildingsInMap", () => ({
  searchBuildingsInMap: searchMocks.area,
}))

vi.mock("../api/searchBuildingsNearby", () => ({
  searchBuildingsNearby: searchMocks.nearby,
}))

vi.mock("../api/searchBuildingsNearLines", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/searchBuildingsNearLines")>()),
  searchBuildingsNearLines: searchMocks.line,
}))

vi.mock("../api/searchListingsInBuilding", () => ({
  searchListingsInBuilding: searchMocks.listingsInBuilding,
}))

vi.mock("@/features/auth/hooks/useAuth")
vi.mock("@/features/profile/api")

vi.mock("@/features/agent/api/getListerProfileById", () => ({
  getListerProfileById,
}))

vi.mock("@/hooks/use-toast", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/use-toast")>()

  return {
    ...actual,
    toast: (props: Parameters<typeof actual.toast>[0]) => {
      toastSpy(props)
      return actual.toast(props)
    },
  }
})

function mockAreaSearchResults(
  ...responses: Array<{
    data: SearchBuilding[]
    total?: number
  }>
) {
  for (const response of responses) {
    searchMocks.area.mockResolvedValueOnce({
      success: true,
      data: response.data,
      pagination: {
        page: 1,
        limit: 20,
        total: response.total ?? response.data.length,
      },
    })
  }
}

function mockAreaSearchFailure(error: Error = new Error("Network error")) {
  searchMocks.area.mockRejectedValueOnce(error)
}

function mockNearbySearchResults(
  ...responses: Array<{
    data: SearchBuilding[]
  }>
) {
  for (const response of responses) {
    searchMocks.nearby.mockResolvedValueOnce({
      success: true,
      data: response.data,
    })
  }
}

function mockLineSearchResults(
  ...responses: Array<{
    data: SearchBuilding[]
    total?: number
  }>
) {
  for (const response of responses) {
    searchMocks.line.mockResolvedValueOnce({
      success: true,
      data: response.data,
      pagination: {
        page: 1,
        limit: 20,
        total: response.total ?? response.data.length,
      },
    })
  }
}

function mockListingsInBuilding(
  building: SearchBuilding,
  listings: SearchBuilding["listings"] = [],
) {
  searchMocks.listingsInBuilding.mockResolvedValue({
    success: true,
    data: {
      building: {
        _id: building._id,
        name: building.name,
        buildingType: building.buildingType,
        facilities: building.facilities,
        security: building.security,
        location: building.location,
        address: building.address,
        minRent: building.minRent,
        maxRent: building.maxRent,
      },
      listings,
    },
    pagination: {
      page: 1,
      limit: 20,
      total: listings.length,
    },
  })
}

function getMarkerButton(label: string) {
  return screen.getByRole("button", { name: label })
}

const listerMapSearchAgentId = "agent-lister-map-1"
const listerMapSearchUrl = buildListerMapSearchUrl(listerMapSearchAgentId)

function renderMapSearchPageAt(
  initialEntry:
    | string
    | {
        pathname?: string
        search?: string
        state?: unknown
      },
  options: { withToaster?: boolean } = {},
) {
  const queryClient = createTestQueryClient()
  const pageElement = options.withToaster ? (
    <>
      <MapSearchPage />
      <Toaster />
    </>
  ) : (
    <MapSearchPage />
  )
  const router = createMemoryRouter([{ path: "/", element: pageElement }], {
    initialEntries: [initialEntry],
  })

  return {
    router,
    queryClient,
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  }
}

async function waitForHydrationToSettle() {
  await new Promise((resolve) => setTimeout(resolve, 500))
}

function getFiltersFromSearch(search: string) {
  const filtersParam = new URLSearchParams(search).get("filters")
  expect(filtersParam).not.toBeNull()
  return JSON.parse(filtersParam!) as Record<string, unknown>
}

describe("MapSearchPage integration", () => {
  beforeEach(() => {
    searchMocks.area.mockReset()
    searchMocks.nearby.mockReset()
    searchMocks.line.mockReset()
    searchMocks.listingsInBuilding.mockReset()
    getListerProfileById.mockReset()
    toastSpy.mockReset()
    googleMapsMocks.resetBounds()
    googleMapsMocks.resetCenter()

    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
    } as never)

    vi.mocked(useMyAgentProfile).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never)
  })

  it("mounts and hydrates an area search from the URL", async () => {
    mockAreaSearchResults({ data: [mockBuilding] })
    renderWithProviders(<MapSearchPage />, {
      initialEntries: [areaSearchUrl],
    })

    expect(screen.getByRole("main")).toBeInTheDocument()
    expect(screen.getByTestId("map")).toBeInTheDocument()
    expect(screen.getByTestId("place-search")).toBeInTheDocument()

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledOnce()
    })

    expect(searchMocks.area).toHaveBeenCalledWith(
      expect.objectContaining({
        bounds: initialAreaBounds,
        page: 1,
        limit: 20,
      }),
    )
    expect(searchMocks.nearby).not.toHaveBeenCalled()
    expect(searchMocks.line).not.toHaveBeenCalled()

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    expect(panel.getByText("1 building")).toBeInTheDocument()
    expect(panel.getByText("Area Test Residence")).toBeInTheDocument()
    expect(panel.getByText("123 Test Street, Bangkok")).toBeInTheDocument()
  })

  it("commits a new area search after the map moves", async () => {
    mockAreaSearchResults(
      { data: [mockBuilding] },
      { data: [pannedMockBuilding] },
    )

    const { user } = renderWithProviders(<MapSearchPage />, {
      initialEntries: [areaSearchUrl],
    })

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledOnce()
    })

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    expect(panel.getByText("Area Test Residence")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Search this area" }),
    ).not.toBeInTheDocument()

    googleMapsMocks.triggerMapPan()

    const searchButton = await screen.findByRole("button", {
      name: "Search this area",
    })
    expect(searchButton).toBeEnabled()

    googleMapsMocks.setBounds(pannedAreaBounds)
    await user.click(searchButton)

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledTimes(2)
    })

    expect(searchMocks.area).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bounds: pannedAreaBounds,
        page: 1,
        limit: 20,
      }),
    )
    expect(searchMocks.nearby).not.toHaveBeenCalled()
    expect(searchMocks.line).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(panel.getByText("Panned Area Residence")).toBeInTheDocument()
    })
    expect(panel.queryByText("Area Test Residence")).not.toBeInTheDocument()
    expect(panel.getByText("456 New View Road, Bangkok")).toBeInTheDocument()
  })

  it("hydrates a nearby search from the URL", async () => {
    mockNearbySearchResults({ data: [nearbyMockBuilding] })

    renderWithProviders(<MapSearchPage />, {
      initialEntries: [nearbySearchUrl],
    })

    await waitFor(() => {
      expect(searchMocks.nearby).toHaveBeenCalledOnce()
    })

    expect(searchMocks.nearby).toHaveBeenCalledWith(
      expect.objectContaining({
        position: nearbyPinPosition,
        radiusMeters: 1_000,
        limit: 20,
      }),
    )
    expect(searchMocks.area).not.toHaveBeenCalled()
    expect(searchMocks.line).not.toHaveBeenCalled()

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    expect(panel.getByText("1 building near pin")).toBeInTheDocument()
    expect(panel.getByText("Nearby Pin Residence")).toBeInTheDocument()
    expect(panel.getByText("789 Pin Lane, Bangkok")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Remove pin" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("drops a pin and commits a nearby search from the idle map", async () => {
    mockNearbySearchResults({ data: [droppedPinMockBuilding] })

    const { user } = renderWithProviders(<MapSearchPage />, {
      initialEntries: ["/"],
    })

    expect(screen.queryByTestId("results-panel-mobile")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Drop pin" }))
    expect(screen.getByRole("button", { name: "Remove pin" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )

    const searchButton = await screen.findByRole("button", {
      name: "Search within 1 km",
    })
    expect(searchButton).toBeEnabled()

    await user.click(searchButton)

    await waitFor(() => {
      expect(searchMocks.nearby).toHaveBeenCalledOnce()
    })

    expect(searchMocks.nearby).toHaveBeenCalledWith(
      expect.objectContaining({
        position: defaultMapCenter,
        radiusMeters: 1_000,
        limit: 20,
      }),
    )
    expect(searchMocks.area).not.toHaveBeenCalled()
    expect(searchMocks.line).not.toHaveBeenCalled()

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    await waitFor(() => {
      expect(panel.getByText("Dropped Pin Residence")).toBeInTheDocument()
    })
    expect(panel.getByText("1 building near pin")).toBeInTheDocument()
    expect(panel.getByText("202 Center Street, Bangkok")).toBeInTheDocument()
  })

  it("commits an updated nearby search after the pin moves", async () => {
    mockNearbySearchResults(
      { data: [nearbyMockBuilding] },
      { data: [movedNearbyMockBuilding] },
    )

    const { user } = renderWithProviders(<MapSearchPage />, {
      initialEntries: [nearbySearchUrl],
    })

    await waitFor(() => {
      expect(searchMocks.nearby).toHaveBeenCalledOnce()
    })

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    expect(panel.getByText("Nearby Pin Residence")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Search within 1 km" }),
    ).not.toBeInTheDocument()

    googleMapsMocks.triggerMapClick(movedNearbyPinPosition)

    const searchButton = await screen.findByRole("button", {
      name: "Search within 1 km",
    })
    expect(searchButton).toBeEnabled()

    await user.click(searchButton)

    await waitFor(() => {
      expect(searchMocks.nearby).toHaveBeenCalledTimes(2)
    })

    expect(searchMocks.nearby).toHaveBeenLastCalledWith(
      expect.objectContaining({
        position: movedNearbyPinPosition,
        radiusMeters: 1_000,
        limit: 20,
      }),
    )
    expect(searchMocks.area).not.toHaveBeenCalled()
    expect(searchMocks.line).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(panel.getByText("Moved Pin Residence")).toBeInTheDocument()
    })
    expect(panel.queryByText("Nearby Pin Residence")).not.toBeInTheDocument()
    expect(panel.getByText("101 Relocated Alley, Bangkok")).toBeInTheDocument()
  })

  it("hydrates a line search from the URL", async () => {
    mockLineSearchResults({ data: [lineMockBuilding] })

    renderWithProviders(<MapSearchPage />, {
      initialEntries: [lineSearchUrl],
    })

    await waitFor(() => {
      expect(searchMocks.line).toHaveBeenCalledOnce()
    })

    expect(searchMocks.line).toHaveBeenCalledWith(
      expect.objectContaining({
        geometry: lineGeometry,
        distanceMeters: 500,
        page: 1,
        limit: 20,
      }),
    )
    expect(searchMocks.area).not.toHaveBeenCalled()
    expect(searchMocks.nearby).not.toHaveBeenCalled()

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    expect(panel.getByText("1 building along line")).toBeInTheDocument()
    expect(panel.getByText("Line Corridor Residence")).toBeInTheDocument()
    expect(panel.getByText("303 Route Street, Bangkok")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Exit line search mode" }),
    ).toHaveAttribute("aria-pressed", "true")
    expect(
      screen.getByRole("button", { name: "Line search distance: 500 m" }),
    ).toBeVisible()
  })

  it("draws a line and commits a search from the idle map", async () => {
    mockLineSearchResults({ data: [lineMockBuilding] })

    const { user } = renderWithProviders(<MapSearchPage />, {
      initialEntries: ["/"],
    })

    expect(screen.queryByTestId("results-panel-mobile")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Draw search line" }))
    expect(
      screen.getByRole("button", { name: "Exit line search mode" }),
    ).toHaveAttribute("aria-pressed", "true")

    googleMapsMocks.triggerMapClick(linePoint1)
    googleMapsMocks.triggerMapClick(linePoint2)

    const searchButton = await screen.findByRole("button", {
      name: "Search within 500 m of line",
    })
    expect(searchButton).toBeEnabled()

    await user.click(searchButton)

    await waitFor(() => {
      expect(searchMocks.line).toHaveBeenCalledOnce()
    })

    expect(searchMocks.line).toHaveBeenCalledWith(
      expect.objectContaining({
        geometry: lineGeometry,
        distanceMeters: 500,
        page: 1,
        limit: 20,
      }),
    )
    expect(searchMocks.area).not.toHaveBeenCalled()
    expect(searchMocks.nearby).not.toHaveBeenCalled()

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    await waitFor(() => {
      expect(panel.getByText("Line Corridor Residence")).toBeInTheDocument()
    })
    expect(panel.getByText("1 building along line")).toBeInTheDocument()
    expect(panel.getByText("303 Route Street, Bangkok")).toBeInTheDocument()
  })

  it("commits an updated line search after editing the line", async () => {
    mockLineSearchResults(
      { data: [lineMockBuilding] },
      { data: [updatedLineMockBuilding] },
    )

    const { user } = renderWithProviders(<MapSearchPage />, {
      initialEntries: ["/"],
    })

    await user.click(screen.getByRole("button", { name: "Draw search line" }))
    googleMapsMocks.triggerMapClick(linePoint1)
    googleMapsMocks.triggerMapClick(linePoint2)

    await user.click(
      await screen.findByRole("button", {
        name: "Search within 500 m of line",
      }),
    )

    await waitFor(() => {
      expect(searchMocks.line).toHaveBeenCalledOnce()
    })

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    expect(panel.getByText("Line Corridor Residence")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Search updated line" }),
    ).not.toBeInTheDocument()

    googleMapsMocks.triggerMapClick(linePoint3)

    const searchButton = await screen.findByRole("button", {
      name: "Search updated line",
    })
    expect(searchButton).toBeEnabled()

    await user.click(searchButton)

    await waitFor(() => {
      expect(searchMocks.line).toHaveBeenCalledTimes(2)
    })

    expect(searchMocks.line).toHaveBeenLastCalledWith(
      expect.objectContaining({
        geometry: updatedLineGeometry,
        distanceMeters: 500,
        page: 1,
        limit: 20,
      }),
    )
    expect(searchMocks.area).not.toHaveBeenCalled()
    expect(searchMocks.nearby).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(panel.getByText("Extended Line Residence")).toBeInTheDocument()
    })
    expect(panel.queryByText("Line Corridor Residence")).not.toBeInTheDocument()
    expect(panel.getByText("404 Extended Route, Bangkok")).toBeInTheDocument()
  })

  it("selects a building and returns to the results list", async () => {
    mockAreaSearchResults({ data: [mockBuilding] }, { data: [mockBuilding] })
    mockListingsInBuilding(mockBuilding)

    const { user } = renderWithProviders(<MapSearchPage />, {
      initialEntries: [areaSearchUrl],
    })

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledOnce()
    })

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    expect(panel.getByText("1 building")).toBeInTheDocument()

    await user.click(
      panel.getByRole("button", { name: /Area Test Residence/i }),
    )

    await waitFor(() => {
      expect(searchMocks.listingsInBuilding).toHaveBeenCalledWith(
        expect.objectContaining({
          buildingId: mockBuilding._id,
          page: 1,
          limit: 20,
        }),
      )
    })

    expect(
      panel.getByRole("heading", { name: "Area Test Residence details" }),
    ).toBeInTheDocument()
    expect(panel.getByText("0 available listings")).toBeInTheDocument()
    expect(panel.getByText("No listings available")).toBeInTheDocument()
    expect(panel.queryByText("1 building")).not.toBeInTheDocument()

    await user.click(panel.getByRole("button", { name: "Go back" }))

    await waitFor(() => {
      expect(panel.getByText("1 building")).toBeInTheDocument()
    })
    expect(
      panel.getByRole("button", { name: /Area Test Residence/i }),
    ).toBeInTheDocument()
    expect(panel.queryByText("0 available listings")).not.toBeInTheDocument()
    expect(
      panel.queryByRole("heading", { name: "Area Test Residence details" }),
    ).not.toBeInTheDocument()
  })

  it("shows an unresolved-building message for a broken building deep link", async () => {
    mockAreaSearchResults({ data: [mockBuilding] })

    renderWithProviders(<MapSearchPage />, {
      initialEntries: [brokenBuildingDeepLinkUrl],
    })

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledOnce()
    })

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    await waitFor(() => {
      expect(panel.getByText("Building not found")).toBeInTheDocument()
    })

    expect(
      panel.getByText(
        "This building is no longer in the current results. Try searching again or choose another building.",
      ),
    ).toBeInTheDocument()
    expect(
      panel.getByRole("button", { name: "Search this area" }),
    ).toBeEnabled()
    expect(panel.getByText("1 building")).toBeInTheDocument()
    expect(panel.getByText("Area Test Residence")).toBeInTheDocument()
    expect(
      panel.queryByRole("heading", { name: "Area Test Residence details" }),
    ).not.toBeInTheDocument()
    expect(searchMocks.listingsInBuilding).not.toHaveBeenCalled()
  })

  it("recovers from a failed area search when the user retries", async () => {
    mockAreaSearchFailure()
    mockAreaSearchResults({ data: [mockBuilding] })

    const { user } = renderWithProviders(<MapSearchPage />, {
      initialEntries: [areaSearchUrl],
    })

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledOnce()
    })

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    expect(panel.getByText("Search failed")).toBeInTheDocument()
    expect(panel.getByRole("alert")).toHaveTextContent(
      "Could not search this area",
    )
    expect(panel.getByText("Please try again in a moment.")).toBeInTheDocument()
    expect(
      panel.getByRole("button", { name: "Retry search" }),
    ).toBeEnabled()

    await user.click(panel.getByRole("button", { name: "Retry search" }))

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledTimes(2)
    })

    await waitFor(() => {
      expect(panel.getByText("1 building")).toBeInTheDocument()
    })
    expect(panel.getByText("Area Test Residence")).toBeInTheDocument()
    expect(panel.queryByText("Search failed")).not.toBeInTheDocument()
    expect(panel.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("highlights the matching map marker when a list card is hovered", async () => {
    mockAreaSearchResults({
      data: [mockBuilding, secondaryMockBuilding],
      total: 2,
    })

    renderWithProviders(<MapSearchPage />, {
      initialEntries: [areaSearchUrl],
    })

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledOnce()
    })

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    await waitFor(() => {
      expect(getMarkerButton("฿8k")).toBeInTheDocument()
    })

    expect(getMarkerButton("฿8k")).toHaveClass("bg-white")
    expect(getMarkerButton("฿12k")).toHaveClass("bg-white")

    fireEvent.mouseEnter(
      panel.getByRole("button", { name: /Area Test Residence/i }),
    )

    await waitFor(() => {
      expect(getMarkerButton("฿8k")).toHaveClass("bg-slate-950")
    })
    expect(getMarkerButton("฿12k")).toHaveClass("bg-white")

    fireEvent.mouseLeave(
      panel.getByRole("button", { name: /Area Test Residence/i }),
    )

    await waitFor(() => {
      expect(getMarkerButton("฿8k")).toHaveClass("bg-white")
    })
    expect(getMarkerButton("฿8k")).not.toHaveClass("bg-slate-950")
  })

  it("hydrates area search filters from the URL", async () => {
    mockAreaSearchResults({ data: [mockBuilding] })

    renderWithProviders(<MapSearchPage />, {
      initialEntries: [filteredAreaSearchUrl],
    })

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledOnce()
    })

    expect(searchMocks.area).toHaveBeenCalledWith(
      expect.objectContaining({
        bounds: initialAreaBounds,
        filters: urlAreaFilters,
      }),
    )

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    expect(panel.getByText("1+ bed")).toBeInTheDocument()
    expect(panel.getByText("฿5k - Any")).toBeInTheDocument()
  })

  it("applies filters, syncs them to the URL, and refetches results", async () => {
    mockAreaSearchResults({ data: [mockBuilding] }, { data: [mockBuilding] })

    const { router, user } = renderMapSearchPageAt(areaSearchUrl)

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledOnce()
    })

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    const panel = within(mobilePanel)

    await user.click(panel.getByRole("button", { name: /^Filters/ }))
    expect(
      panel.getByRole("heading", { name: "Rental filters" }),
    ).toBeInTheDocument()

    await user.click(panel.getByRole("button", { name: "1+ bed" }))
    await user.click(panel.getByRole("button", { name: "Apply filters" }))

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledTimes(2)
    })

    expect(searchMocks.area).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bounds: initialAreaBounds,
        filters: expect.objectContaining({
          bedroomCount: 1,
          minRent: 1_000,
          maxRent: 8_000,
          isForeignerAccepted: true,
        }),
      }),
    )

    await waitFor(() => {
      expect(getFiltersFromSearch(router.state.location.search).bedroomCount).toBe(
        1,
      )
    })

    expect(panel.getByText("1+ bed")).toBeInTheDocument()
    expect(panel.queryByRole("heading", { name: "Rental filters" })).not.toBeInTheDocument()
  })

  it("does not mark area search stale during programmatic camera restore", async () => {
    mockAreaSearchResults({ data: [mockBuilding] })

    renderWithProviders(<MapSearchPage />, {
      initialEntries: [areaSearchUrl],
    })

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledOnce()
    })

    expect(
      screen.queryByRole("button", { name: "Search this area" }),
    ).not.toBeInTheDocument()
  })

  it("uses my location to drop a pin and commit a nearby search", async () => {
    const currentPosition = { lat: 13.7563, lng: 100.5018 }
    mockNearbySearchResults({ data: [nearbyMockBuilding] })

    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: {
              latitude: currentPosition.lat,
              longitude: currentPosition.lng,
            },
          } as GeolocationCoordinates)
        },
      },
    })

    const { user } = renderWithProviders(<MapSearchPage />, {
      initialEntries: ["/"],
    })

    await user.click(screen.getByRole("button", { name: "Use my location" }))

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Remove pin" }),
      ).toHaveAttribute("aria-pressed", "true")
    })

    const searchButton = await screen.findByRole("button", {
      name: "Search within 1 km",
    })
    await user.click(searchButton)

    await waitFor(() => {
      expect(searchMocks.nearby).toHaveBeenCalledOnce()
    })

    expect(searchMocks.nearby).toHaveBeenCalledWith(
      expect.objectContaining({
        position: currentPosition,
        radiusMeters: 1_000,
      }),
    )
  })

  it("exits pin mode when Remove pin is clicked", async () => {
    const { user } = renderWithProviders(<MapSearchPage />, {
      initialEntries: ["/"],
    })

    await user.click(screen.getByRole("button", { name: "Drop pin" }))
    expect(screen.getByRole("button", { name: "Remove pin" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )

    await user.click(screen.getByRole("button", { name: "Remove pin" }))
    expect(screen.getByRole("button", { name: "Drop pin" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    expect(
      screen.queryByRole("button", { name: "Search within 1 km" }),
    ).not.toBeInTheDocument()
  })

  it("exits line mode and returns to area search controls", async () => {
    const { user } = renderWithProviders(<MapSearchPage />, {
      initialEntries: ["/"],
    })

    await user.click(screen.getByRole("button", { name: "Draw search line" }))
    expect(
      screen.getByRole("button", { name: "Exit line search mode" }),
    ).toHaveAttribute("aria-pressed", "true")

    await user.click(
      screen.getByRole("button", { name: "Exit line search mode" }),
    )
    expect(
      screen.getByRole("button", { name: "Draw search line" }),
    ).toHaveAttribute("aria-pressed", "false")
    expect(
      screen.queryByRole("button", { name: "Place starting point" }),
    ).not.toBeInTheDocument()
  })

  it("ignores map clicks for pin moves while in area mode", async () => {
    mockAreaSearchResults({ data: [mockBuilding] })

    renderWithProviders(<MapSearchPage />, {
      initialEntries: [areaSearchUrl],
    })

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledOnce()
    })

    googleMapsMocks.triggerMapClick({ lat: 13.8, lng: 100.7 })

    expect(screen.getByRole("button", { name: "Drop pin" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    expect(
      screen.queryByRole("button", { name: "Search within 1 km" }),
    ).not.toBeInTheDocument()
  })
})

describe("MapSearchPage lister map search integration", () => {
  beforeEach(() => {
    searchMocks.area.mockReset()
    searchMocks.nearby.mockReset()
    searchMocks.line.mockReset()
    searchMocks.listingsInBuilding.mockReset()
    getListerProfileById.mockReset()
    toastSpy.mockReset()
    googleMapsMocks.resetBounds()
    googleMapsMocks.resetCenter()

    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
    } as never)

    vi.mocked(useMyAgentProfile).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    } as never)
  })

  it("hydrates the lister from router seed without fetching the profile", async () => {
    renderMapSearchPageAt(
      {
        search: listerMapSearchUrl.split("?")[1]
          ? `?${listerMapSearchUrl.split("?")[1]}`
          : "",
        state: createListerMapSearchNavigationState({
          _id: listerMapSearchAgentId,
          displayName: "Smoke Lister",
          profilePhoto: null,
        }),
      },
      { withToaster: true },
    )

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith({
        title: "Search an area to see Smoke Lister's listings",
        variant: "search-hint",
      })
    })

    expect(getListerProfileById).not.toHaveBeenCalled()
  })

  it("fetches the lister profile once when only the URL filter is present", async () => {
    getListerProfileById.mockResolvedValue(
      createListerProfile({
        _id: listerMapSearchAgentId,
        displayName: "Fetched Lister",
      }),
    )

    renderMapSearchPageAt(listerMapSearchUrl, { withToaster: true })

    await waitFor(() => {
      expect(getListerProfileById).toHaveBeenCalledTimes(1)
    })

    await waitForHydrationToSettle()
    expect(getListerProfileById).toHaveBeenCalledTimes(1)
    expect(getListerProfileById).toHaveBeenCalledWith(
      listerMapSearchAgentId,
      expect.any(AbortSignal),
    )
  })

  it("shows the arrival toast only once on an idle map with a lister filter", async () => {
    getListerProfileById.mockResolvedValue(
      createListerProfile({
        _id: listerMapSearchAgentId,
        displayName: "Fetched Lister",
      }),
    )

    renderMapSearchPageAt(listerMapSearchUrl, { withToaster: true })

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith({
        title: "Search an area to see Fetched Lister's listings",
        variant: "search-hint",
      })
    })

    await waitForHydrationToSettle()

    expect(toastSpy).toHaveBeenCalledTimes(1)
  })

  it("does not loop lister hydration requests after selected listers catch up", async () => {
    getListerProfileById.mockResolvedValue(
      createListerProfile({
        _id: listerMapSearchAgentId,
        displayName: "Fetched Lister",
      }),
    )

    renderMapSearchPageAt(listerMapSearchUrl, { withToaster: true })

    await waitFor(() => {
      expect(getListerProfileById).toHaveBeenCalledTimes(1)
    })

    await waitForHydrationToSettle()
    await waitForHydrationToSettle()

    expect(getListerProfileById).toHaveBeenCalledTimes(1)
    expect(searchMocks.area).not.toHaveBeenCalled()
    expect(searchMocks.nearby).not.toHaveBeenCalled()
    expect(searchMocks.line).not.toHaveBeenCalled()
  })

  it("commits an area search with the lister filter preserved", async () => {
    mockAreaSearchResults({ data: [mockBuilding] })
    getListerProfileById.mockResolvedValue(
      createListerProfile({
        _id: listerMapSearchAgentId,
        displayName: "Fetched Lister",
      }),
    )

    const { user } = renderMapSearchPageAt(listerMapSearchUrl, {
      withToaster: true,
    })

    await waitFor(() => {
      expect(getListerProfileById).toHaveBeenCalledTimes(1)
    })

    const searchButton = await screen.findByRole("button", {
      name: "Search this area",
    })
    await user.click(searchButton)

    await waitFor(() => {
      expect(searchMocks.area).toHaveBeenCalledOnce()
    })

    expect(searchMocks.area).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          agentProfileIds: [listerMapSearchAgentId],
        }),
      }),
    )

    const mobilePanel = await screen.findByTestId("results-panel-mobile")
    await waitFor(() => {
      expect(
        within(mobilePanel).queryByRole("button", {
          name: "Remove Fetched Lister from search",
        }),
      ).not.toBeNull()
    })
  })

  it("clears the router seed from browser history after mount", async () => {
    const seedState = createListerMapSearchNavigationState({
      _id: listerMapSearchAgentId,
      displayName: "Smoke Lister",
      profilePhoto: null,
    })

    window.history.replaceState(
      {
        ...seedState,
        preserved: "keep-me",
      },
      "",
      listerMapSearchUrl,
    )

    renderMapSearchPageAt(listerMapSearchUrl, { withToaster: true })

    await waitFor(() => {
      expect(window.history.state).toEqual({ preserved: "keep-me" })
    })
  })
})
