import type { PropsWithChildren } from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  loadState: {
    status: "ready" as "loading" | "ready" | "error",
    markReady: vi.fn(),
    markFailed: vi.fn(),
  },
  hasKey: true,
  lastMapProps: null as null | Record<string, unknown>,
  mapMountCount: 0,
}))

vi.mock("@/features/map-search/hooks/useGoogleMapsLoadState", () => ({
  useGoogleMapsLoadState: () => mocks.loadState,
}))

vi.mock("@/shared/google-maps/googleMapsConfig", async importOriginal => {
  const actual =
    await importOriginal<typeof import("@/shared/google-maps/googleMapsConfig")>()
  return {
    ...actual,
    hasGoogleMapsApiKey: () => mocks.hasKey,
    GOOGLE_MAPS_API_KEY: "test-key",
    GOOGLE_MAPS_MAP_ID: "test-map-id",
  }
})

vi.mock("@/shared/google-maps/GoogleMapsApiProvider", () => ({
  GoogleMapsApiProvider: ({ children }: PropsWithChildren) => (
    <div data-testid="maps-provider">{children}</div>
  ),
}))

vi.mock("@vis.gl/react-google-maps", () => ({
  Map: (props: PropsWithChildren & Record<string, unknown>) => {
    mocks.lastMapProps = props
    mocks.mapMountCount += 1
    return (
      <div
        data-testid="google-map"
        data-map-id={String(props.id ?? "")}
        data-gesture-handling={String(props.gestureHandling ?? "")}
      >
        {props.children}
      </div>
    )
  },
  useMap: () => null,
  AdvancedMarker: ({ children }: PropsWithChildren) => (
    <div data-testid="marker">{children}</div>
  ),
  Circle: () => <div data-testid="circle" />,
  Polygon: () => <div data-testid="polygon" />,
  Polyline: () => <div data-testid="polyline" />,
}))

import { ReadOnlyMap } from "./ReadOnlyMap"

const pointGeo = {
  kind: "point" as const,
  position: { lat: 13.73, lng: 100.54 },
}

describe("ReadOnlyMap", () => {
  beforeEach(() => {
    mocks.hasKey = true
    mocks.loadState.status = "ready"
    mocks.lastMapProps = null
    mocks.mapMountCount = 0
  })

  it.each([
    [null],
    [undefined],
    [{ kind: "point", position: { lat: 999, lng: 0 } }],
    [{ kind: "circle", center: { lat: 13, lng: 100 }, radiusMeters: 0 }],
  ])("renders empty state for invalid geo %j", geo => {
    render(<ReadOnlyMap geo={geo as never} emptyMessage="No location" />)

    expect(screen.getByText("No location")).toBeInTheDocument()
    expect(screen.queryByTestId("google-map")).not.toBeInTheDocument()
  })

  it("uses the default empty message", () => {
    render(<ReadOnlyMap geo={null} />)
    expect(
      screen.getByText("Map location is unavailable."),
    ).toBeInTheDocument()
  })

  it("renders missing-key state without mounting the provider", () => {
    mocks.hasKey = false
    render(<ReadOnlyMap geo={pointGeo} />)

    expect(
      screen.getByText("Map configuration is missing."),
    ).toBeInTheDocument()
    expect(screen.queryByTestId("maps-provider")).not.toBeInTheDocument()
  })

  it("shows the loading overlay while maps boot", () => {
    mocks.loadState.status = "loading"
    render(<ReadOnlyMap geo={pointGeo} />)

    expect(screen.getByRole("status")).toHaveTextContent("Loading map...")
    expect(screen.getByTestId("google-map")).toBeInTheDocument()
  })

  it("shows the load error panel", () => {
    mocks.loadState.status = "error"
    render(<ReadOnlyMap geo={pointGeo} />)

    expect(screen.getByText("Map could not be loaded.")).toBeInTheDocument()
    expect(screen.queryByTestId("google-map")).not.toBeInTheDocument()
  })

  it("locks gestures by default and accepts className", () => {
    const { container } = render(
      <ReadOnlyMap className="h-64 preview" geo={pointGeo} />,
    )

    expect(container.firstChild).toHaveClass("h-64", "preview")
    expect(screen.getByTestId("google-map")).toHaveAttribute(
      "data-gesture-handling",
      "none",
    )
    expect(mocks.lastMapProps).toMatchObject({
      gestureHandling: "none",
      disableDefaultUI: true,
      clickableIcons: false,
      reuseMaps: false,
      mapId: "test-map-id",
    })
  })

  it("enables pan/zoom when navigable is true", () => {
    render(<ReadOnlyMap navigable geo={pointGeo} />)

    expect(screen.getByTestId("google-map")).toHaveAttribute(
      "data-gesture-handling",
      "cooperative",
    )
  })

  it("sanitizes mapInstanceId for the Google Map id", () => {
    render(
      <ReadOnlyMap
        mapInstanceId=" preview/map #1 "
        geo={pointGeo}
      />,
    )

    expect(screen.getByTestId("google-map")).toHaveAttribute(
      "data-map-id",
      "preview-map--1",
    )
  })

  it("renders point marker overlays", () => {
    render(<ReadOnlyMap geo={pointGeo} />)
    expect(screen.getByTestId("marker")).toBeInTheDocument()
  })

  it("renders circle coverage + center marker", () => {
    render(
      <ReadOnlyMap
        mapInstanceId="preview-circle"
        geo={{
          kind: "circle",
          center: { lat: 13.73, lng: 100.54 },
          radiusMeters: 800,
        }}
      />,
    )

    expect(screen.getByTestId("circle")).toBeInTheDocument()
    expect(screen.getByTestId("marker")).toBeInTheDocument()
  })

  it("renders area polygon overlays", () => {
    render(
      <ReadOnlyMap
        geo={{
          kind: "area",
          bounds: {
            northEast: { lat: 13.78, lng: 100.66 },
            southWest: { lat: 13.75, lng: 100.62 },
          },
        }}
      />,
    )

    expect(screen.getByTestId("polygon")).toBeInTheDocument()
  })

  it("renders line coverage overlays for single and multi paths", () => {
    const { rerender } = render(
      <ReadOnlyMap
        geo={{
          kind: "line",
          distanceMeters: 400,
          paths: [
            [
              { lat: 13.75, lng: 100.5 },
              { lat: 13.76, lng: 100.52 },
            ],
          ],
        }}
      />,
    )

    expect(screen.getByTestId("polyline")).toBeInTheDocument()
    expect(screen.getAllByTestId("circle").length).toBeGreaterThan(0)

    rerender(
      <ReadOnlyMap
        geo={{
          kind: "line",
          distanceMeters: 400,
          paths: [
            [
              { lat: 13.75, lng: 100.5 },
              { lat: 13.76, lng: 100.52 },
            ],
            [
              { lat: 13.7, lng: 100.6 },
              { lat: 13.71, lng: 100.61 },
            ],
          ],
        }}
      />,
    )

    expect(screen.getAllByTestId("polyline")).toHaveLength(2)
  })

  it("keeps the fitted default camera when equivalent geo objects reappear", () => {
    const { rerender } = render(
      <ReadOnlyMap
        geo={{
          kind: "point",
          position: { lat: 13.73, lng: 100.54 },
        }}
      />,
    )
    const firstCenter = mocks.lastMapProps?.defaultCenter
    const firstZoom = mocks.lastMapProps?.defaultZoom

    rerender(
      <ReadOnlyMap
        geo={{
          kind: "point",
          position: { lat: 13.73, lng: 100.54 },
        }}
      />,
    )

    expect(mocks.lastMapProps?.defaultCenter).toBe(firstCenter)
    expect(mocks.lastMapProps?.defaultZoom).toBe(firstZoom)
  })

  it("updates the map when the geo scene meaningfully changes", () => {
    const { rerender } = render(
      <ReadOnlyMap
        geo={{
          kind: "circle",
          center: { lat: 13.73, lng: 100.54 },
          radiusMeters: 400,
        }}
      />,
    )
    expect(mocks.lastMapProps?.defaultZoom).toBe(16)

    rerender(
      <ReadOnlyMap
        geo={{
          kind: "circle",
          center: { lat: 13.73, lng: 100.54 },
          radiusMeters: 1600,
        }}
      />,
    )
    expect(mocks.lastMapProps?.defaultZoom).toBe(14)
  })
})
