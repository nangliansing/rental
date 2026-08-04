import { describe, expect, it } from "vitest"

import {
  getDefaultMapCenter,
  getReadOnlyMapCameraTarget,
  getReadOnlyMapInitialCamera,
  searchBoundsToPolygonPath,
} from "./camera"
import { normalizeReadOnlyMapGeo } from "./normalizeReadOnlyMapGeo"

describe("read-only map camera helpers", () => {
  it("exposes the default Bangkok-ish center", () => {
    expect(getDefaultMapCenter()).toEqual({ lat: 13.7653, lng: 100.642 })
  })

  it("centers point cameras at zoom 15", () => {
    const point = normalizeReadOnlyMapGeo({
      kind: "point",
      position: { lat: 13.73, lng: 100.54 },
    })!

    expect(getReadOnlyMapCameraTarget(point)).toEqual({
      mode: "center",
      center: { lat: 13.73, lng: 100.54 },
      zoom: 15,
    })
    expect(getReadOnlyMapInitialCamera(point)).toEqual({
      center: { lat: 13.73, lng: 100.54 },
      zoom: 15,
    })
  })

  it.each([
    [500, 16],
    [501, 15],
    [1000, 15],
    [1001, 14.5],
    [1500, 14.5],
    [1501, 14],
  ] as const)(
    "uses getNearbyZoom for circle radius %s -> zoom %s",
    (radiusMeters, zoom) => {
      const circle = normalizeReadOnlyMapGeo({
        kind: "circle",
        center: { lat: 13.73, lng: 100.54 },
        radiusMeters,
      })!

      expect(getReadOnlyMapCameraTarget(circle)).toEqual({
        mode: "center",
        center: { lat: 13.73, lng: 100.54 },
        zoom,
      })
      expect(getReadOnlyMapInitialCamera(circle).zoom).toBe(zoom)
    },
  )

  it("fits area bounds exactly and centers the initial camera", () => {
    const area = normalizeReadOnlyMapGeo({
      kind: "area",
      bounds: {
        northEast: { lat: 13.78, lng: 100.66 },
        southWest: { lat: 13.75, lng: 100.62 },
      },
    })!

    expect(getReadOnlyMapCameraTarget(area)).toEqual({
      mode: "bounds",
      bounds: {
        north: 13.78,
        south: 13.75,
        east: 100.66,
        west: 100.62,
      },
    })
    expect(getReadOnlyMapInitialCamera(area)).toEqual({
      center: { lat: 13.765, lng: 100.64 },
      zoom: 14,
    })
  })

  it("expands line bounds by coverage distance", () => {
    const line = normalizeReadOnlyMapGeo({
      kind: "line",
      distanceMeters: 400,
      paths: [
        [
          { lat: 13.75, lng: 100.5 },
          { lat: 13.76, lng: 100.52 },
        ],
      ],
    })!

    const target = getReadOnlyMapCameraTarget(line)
    expect(target.mode).toBe("bounds")
    if (target.mode !== "bounds") return

    expect(target.bounds.north).toBeGreaterThan(13.76)
    expect(target.bounds.south).toBeLessThan(13.75)
    expect(target.bounds.east).toBeGreaterThan(100.52)
    expect(target.bounds.west).toBeLessThan(100.5)
  })

  it("fits MultiLine paths across all segments", () => {
    const line = normalizeReadOnlyMapGeo({
      kind: "line",
      distanceMeters: 100,
      paths: [
        [
          { lat: 13.75, lng: 100.5 },
          { lat: 13.76, lng: 100.52 },
        ],
        [
          { lat: 13.8, lng: 100.4 },
          { lat: 13.81, lng: 100.41 },
        ],
      ],
    })!

    const target = getReadOnlyMapCameraTarget(line)
    expect(target.mode).toBe("bounds")
    if (target.mode !== "bounds") return

    expect(target.bounds.north).toBeGreaterThan(13.81)
    expect(target.bounds.south).toBeLessThan(13.75)
    expect(target.bounds.east).toBeGreaterThan(100.52)
    expect(target.bounds.west).toBeLessThan(100.4)
  })

  it("clamps expanded bounds near the poles", () => {
    const line = normalizeReadOnlyMapGeo({
      kind: "line",
      distanceMeters: 5000,
      paths: [
        [
          { lat: 89.9, lng: 10 },
          { lat: 89.91, lng: 10.01 },
        ],
      ],
    })!

    const target = getReadOnlyMapCameraTarget(line)
    expect(target.mode).toBe("bounds")
    if (target.mode !== "bounds") return

    expect(target.bounds.north).toBeLessThanOrEqual(90)
    expect(target.bounds.south).toBeGreaterThanOrEqual(-90)
  })

  it("centers initial line camera on path average", () => {
    const line = normalizeReadOnlyMapGeo({
      kind: "line",
      distanceMeters: 400,
      paths: [
        [
          { lat: 13.7, lng: 100.5 },
          { lat: 13.8, lng: 100.7 },
        ],
      ],
    })!

    expect(getReadOnlyMapInitialCamera(line)).toEqual({
      center: { lat: 13.75, lng: 100.6 },
      zoom: 16,
    })
  })

  it("builds a closed rectangle path from search bounds", () => {
    expect(
      searchBoundsToPolygonPath({
        northEast: { lat: 13.78, lng: 100.66 },
        southWest: { lat: 13.75, lng: 100.62 },
      }),
    ).toEqual([
      { lat: 13.78, lng: 100.62 },
      { lat: 13.78, lng: 100.66 },
      { lat: 13.75, lng: 100.66 },
      { lat: 13.75, lng: 100.62 },
    ])
  })
})
