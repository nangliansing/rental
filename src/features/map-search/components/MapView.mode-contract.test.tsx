import type { ReactNode } from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useMapInteraction } from "../context/MapInteractionContext"
import { useMapSearchCanvas } from "../context/MapSearchSessionContext"
import { MapView } from "./MapView"

const lineCoverageMocks = vi.hoisted(() => ({ build: vi.fn() }))

vi.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: ReactNode }) => children,
  Map: () => <div data-testid="map" />,
  AdvancedMarker: ({
    children,
    title,
  }: {
    children: ReactNode
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
  useMap: () => null,
}))
vi.mock("../context/MapInteractionContext")
vi.mock("../context/MapSearchSessionContext")
vi.mock("../hooks/useGoogleMapsLoadState", () => ({
  useGoogleMapsLoadState: () => ({
    status: "ready",
    markReady: vi.fn(),
    markFailed: vi.fn(),
  }),
}))
vi.mock("../hooks/useMapCameraTransition", () => ({
  useMapCameraTransition: () => ({ flyTo: vi.fn() }),
}))
vi.mock("../utils/line-coverage", () => ({
  buildLineCoveragePolygon: lineCoverageMocks.build,
}))
vi.mock("./BuildingMarkerLayer", () => ({
  BuildingMarkerLayer: () => <div data-testid="building-marker-layer" />,
}))
vi.mock("./SearchAreaButton", () => ({
  SearchAreaButton: () => <div data-testid="search-controls" />,
}))
vi.mock("./place-search/PlaceSearch", () => ({
  PlaceSearch: () => <div data-testid="place-search" />,
}))

const pin = { lat: 13.7, lng: 100.6 }
const linePoints = [
  { lat: 13.7, lng: 100.6 },
  { lat: 13.8, lng: 100.7 },
]

describe("MapView mode overlay contract", () => {
  beforeEach(() => {
    lineCoverageMocks.build.mockReset()
    lineCoverageMocks.build.mockReturnValue([
      { lat: 13.69, lng: 100.59 },
      { lat: 13.79, lng: 100.69 },
      { lat: 13.81, lng: 100.71 },
      { lat: 13.71, lng: 100.61 },
    ])
    vi.mocked(useMapSearchCanvas).mockReturnValue({
      searchedPlace: { name: "Bang Kapi", position: pin },
      buildings: [],
      selectedBuilding: null,
      nearbyRadiusMeters: 1_000,
      linePoints,
      lineDistanceMeters: 500,
      committedBounds: null,
      cameraRestoreVersion: 0,
      isPlaceSearchOpen: false,
      isListingSearch: false,
      onBuildingSelect: vi.fn(),
      onPinChange: vi.fn(),
      onAddLinePoint: vi.fn(),
      onMapMove: vi.fn(),
    } as never)
  })

  it("shows only place context in area mode", () => {
    vi.mocked(useMapInteraction).mockReturnValue({
      mode: "area",
      selectedPin: pin,
      currentLocation: null,
      pinSource: "manual",
    } as never)

    render(<MapView />)

    expect(screen.getAllByTestId("advanced-marker")).toHaveLength(1)
    expect(screen.queryByTestId("circle-overlay")).not.toBeInTheDocument()
    expect(screen.queryByTestId("polygon-overlay")).not.toBeInTheDocument()
    expect(screen.queryByTestId("polyline-overlay")).not.toBeInTheDocument()
    expect(lineCoverageMocks.build).not.toHaveBeenCalled()
  })

  it("shows only pin geometry in pin mode", () => {
    vi.mocked(useMapInteraction).mockReturnValue({
      mode: "pin",
      selectedPin: pin,
      currentLocation: null,
      pinSource: "manual",
    } as never)

    render(<MapView />)

    expect(screen.getAllByTestId("advanced-marker")).toHaveLength(1)
    expect(screen.getAllByTestId("circle-overlay")).toHaveLength(1)
    expect(screen.queryByTestId("polygon-overlay")).not.toBeInTheDocument()
    expect(screen.queryByTestId("polyline-overlay")).not.toBeInTheDocument()
    expect(lineCoverageMocks.build).not.toHaveBeenCalled()
  })

  it("shows only line geometry in line mode", () => {
    vi.mocked(useMapInteraction).mockReturnValue({
      mode: "line",
      selectedPin: pin,
      currentLocation: null,
      pinSource: "manual",
    } as never)

    render(<MapView />)

    expect(screen.getAllByTestId("advanced-marker")).toHaveLength(2)
    expect(screen.getAllByTestId("circle-overlay")).toHaveLength(2)
    expect(screen.getByTestId("polygon-overlay")).toBeVisible()
    expect(screen.getByTestId("polyline-overlay")).toBeVisible()
    expect(lineCoverageMocks.build).toHaveBeenCalledOnce()
  })
})
