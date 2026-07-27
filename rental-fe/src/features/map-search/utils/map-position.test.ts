import { describe, expect, it } from "vitest"

import {
  areMapPositionsEqual,
  getPositionFromBuildingLocation,
  getPositionFromMapEvent,
  getSearchBoundsCenter,
  isValidLineStringGeometry,
  isValidMapPosition,
  isValidSearchBounds,
} from "./map-position"

describe("areMapPositionsEqual", () => {
  it("matches ordered coordinates without serialization", () => {
    const points = [
      { lat: 13.7, lng: 100.6 },
      { lat: 13.8, lng: 100.7 },
    ]

    expect(areMapPositionsEqual(points, points)).toBe(true)
    expect(areMapPositionsEqual(points, [...points])).toBe(true)
    expect(
      areMapPositionsEqual(points, [points[1], points[0]]),
    ).toBe(false)
    expect(areMapPositionsEqual(points, points.slice(0, 1))).toBe(false)
  })
})

describe("map position validation", () => {
  it("rejects non-finite and out-of-range coordinates", () => {
    expect(isValidMapPosition({ lat: 13.7, lng: 100.6 })).toBe(true)
    expect(isValidMapPosition({ lat: Number.NaN, lng: 100.6 })).toBe(false)
    expect(isValidMapPosition({ lat: 91, lng: 100.6 })).toBe(false)
    expect(isValidMapPosition({ lat: 13.7, lng: 181 })).toBe(false)
  })

  it("requires ordered finite bounds and a usable line", () => {
    expect(
      isValidSearchBounds({
        northEast: { lat: 14, lng: 101 },
        southWest: { lat: 13, lng: 100 },
      }),
    ).toBe(true)
    expect(
      isValidSearchBounds({
        northEast: { lat: 13, lng: 101 },
        southWest: { lat: 14, lng: 100 },
      }),
    ).toBe(false)
    expect(
      isValidLineStringGeometry({
        type: "LineString",
        coordinates: [
          [100.6, 13.7],
          [100.7, 13.8],
        ],
      }),
    ).toBe(true)
    expect(
      isValidLineStringGeometry({
        type: "LineString",
        coordinates: [[100.6, 13.7]],
      }),
    ).toBe(false)
  })

  it("returns null for malformed building locations", () => {
    expect(getPositionFromBuildingLocation(undefined)).toBeNull()
    expect(
      getPositionFromBuildingLocation({
        type: "Point",
        coordinates: [200, 13.7],
      }),
    ).toBeNull()
  })

  it("extracts valid positions from map events", () => {
    expect(
      getPositionFromMapEvent({
        detail: { latLng: { lat: 13.7, lng: 100.6 } },
      }),
    ).toEqual({ lat: 13.7, lng: 100.6 })
    expect(
      getPositionFromMapEvent({
        latLng: { lat: () => 13.7, lng: () => 100.6 },
      }),
    ).toEqual({ lat: 13.7, lng: 100.6 })
    expect(getPositionFromMapEvent({})).toBeNull()
  })

  it("returns the center of valid search bounds", () => {
    expect(
      getSearchBoundsCenter({
        northEast: { lat: 14, lng: 101 },
        southWest: { lat: 13, lng: 100 },
      }),
    ).toEqual({ lat: 13.5, lng: 100.5 })
  })
})
