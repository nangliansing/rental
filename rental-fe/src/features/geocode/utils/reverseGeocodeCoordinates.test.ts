import { describe, expect, it } from "vitest"

import {
  normalizeReverseGeocodeCoordinates,
  readReverseGeocodeCoordinates,
  roundReverseGeocodeCoordinate,
} from "./reverseGeocodeCoordinates"

describe("reverseGeocodeCoordinates", () => {
  it("rounds coordinates to five decimal places", () => {
    expect(roundReverseGeocodeCoordinate(13.7563312)).toBe(13.75633)
    expect(roundReverseGeocodeCoordinate(100.5017654)).toBe(100.50177)
  })

  it("normalizes nearby coordinates to the same rounded cache key", () => {
    expect(
      normalizeReverseGeocodeCoordinates(13.756331, 100.501765),
    ).toEqual({
      lat: 13.75633,
      lng: 100.50177,
    })
    expect(
      normalizeReverseGeocodeCoordinates(13.756329, 100.501769),
    ).toEqual({
      lat: 13.75633,
      lng: 100.50177,
    })
  })

  it("accepts valid boundary coordinates", () => {
    expect(readReverseGeocodeCoordinates(90, 180)).toEqual({
      lat: 90,
      lng: 180,
    })
    expect(readReverseGeocodeCoordinates(-90, -180)).toEqual({
      lat: -90,
      lng: -180,
    })
  })

  it("rejects invalid coordinates", () => {
    expect(readReverseGeocodeCoordinates(undefined, 100)).toBeNull()
    expect(readReverseGeocodeCoordinates(13.756331, null)).toBeNull()
    expect(readReverseGeocodeCoordinates(Number.NaN, 100)).toBeNull()
    expect(readReverseGeocodeCoordinates(91, 100)).toBeNull()
    expect(readReverseGeocodeCoordinates(13.756331, 181)).toBeNull()
  })
})
