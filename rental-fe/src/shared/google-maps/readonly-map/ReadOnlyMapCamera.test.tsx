import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  map: null as null | {
    setCenter: ReturnType<typeof vi.fn>
    setZoom: ReturnType<typeof vi.fn>
    fitBounds: ReturnType<typeof vi.fn>
  },
}))

vi.mock("@vis.gl/react-google-maps", () => ({
  useMap: () => mocks.map,
}))

import { ReadOnlyMapCamera } from "./ReadOnlyMapCamera"
import { normalizeReadOnlyMapGeo } from "./normalizeReadOnlyMapGeo"

function createMap() {
  return {
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    fitBounds: vi.fn(),
  }
}

describe("ReadOnlyMapCamera", () => {
  beforeEach(() => {
    mocks.map = createMap()
  })

  it("centers once for a point scene", () => {
    const scene = normalizeReadOnlyMapGeo({
      kind: "point",
      position: { lat: 13.73, lng: 100.54 },
    })!

    const { rerender } = render(
      <ReadOnlyMapCamera scene={scene} fitPadding={32} />,
    )

    expect(mocks.map?.setCenter).toHaveBeenCalledTimes(1)
    expect(mocks.map?.setCenter).toHaveBeenCalledWith({
      lat: 13.73,
      lng: 100.54,
    })
    expect(mocks.map?.setZoom).toHaveBeenCalledWith(15)
    expect(mocks.map?.fitBounds).not.toHaveBeenCalled()

    rerender(
      <ReadOnlyMapCamera
        scene={{ ...scene }}
        fitPadding={64}
      />,
    )
    expect(mocks.map?.setCenter).toHaveBeenCalledTimes(1)
    expect(mocks.map?.setZoom).toHaveBeenCalledTimes(1)
  })

  it("fitBounds once for an area scene with padding", () => {
    const scene = normalizeReadOnlyMapGeo({
      kind: "area",
      bounds: {
        northEast: { lat: 13.78, lng: 100.66 },
        southWest: { lat: 13.75, lng: 100.62 },
      },
    })!

    render(<ReadOnlyMapCamera scene={scene} fitPadding={24} />)

    expect(mocks.map?.fitBounds).toHaveBeenCalledTimes(1)
    expect(mocks.map?.fitBounds).toHaveBeenCalledWith(
      {
        north: 13.78,
        south: 13.75,
        east: 100.66,
        west: 100.62,
      },
      24,
    )
    expect(mocks.map?.setCenter).not.toHaveBeenCalled()
  })

  it("refits only when the sceneKey changes", () => {
    const first = normalizeReadOnlyMapGeo({
      kind: "circle",
      center: { lat: 13.73, lng: 100.54 },
      radiusMeters: 400,
    })!
    const second = normalizeReadOnlyMapGeo({
      kind: "circle",
      center: { lat: 13.73, lng: 100.54 },
      radiusMeters: 800,
    })!

    const { rerender } = render(<ReadOnlyMapCamera scene={first} />)
    expect(mocks.map?.setCenter).toHaveBeenCalledTimes(1)

    rerender(<ReadOnlyMapCamera scene={first} />)
    expect(mocks.map?.setCenter).toHaveBeenCalledTimes(1)

    rerender(<ReadOnlyMapCamera scene={second} />)
    expect(mocks.map?.setCenter).toHaveBeenCalledTimes(2)
    expect(mocks.map?.setZoom).toHaveBeenLastCalledWith(15)
  })

  it("does nothing while the map instance is unavailable", () => {
    mocks.map = null
    const scene = normalizeReadOnlyMapGeo({
      kind: "point",
      position: { lat: 13.73, lng: 100.54 },
    })!

    render(<ReadOnlyMapCamera scene={scene} />)
    // No throw and no map calls.
  })
})
