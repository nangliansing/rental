import { describe, expect, it } from "vitest"

import { formatNeighbourhoodPlaceSubtitle } from "./formatNeighbourhoodPlaceSubtitle"
import { getNeighbourhoodRadiusLabel } from "./getNeighbourhoodRadiusLabel"

describe("getNeighbourhoodRadiusLabel", () => {
  it("returns configured labels for known radii", () => {
    expect(getNeighbourhoodRadiusLabel(1000)).toBe("1 km")
    expect(getNeighbourhoodRadiusLabel(1500)).toBe("1.5 km")
  })

  it("falls back to meters for unknown values", () => {
    expect(getNeighbourhoodRadiusLabel(750)).toBe("750 m")
  })
})

describe("formatNeighbourhoodPlaceSubtitle", () => {
  it("includes line metadata when available", () => {
    expect(
      formatNeighbourhoodPlaceSubtitle({
        id: "place-1",
        name: "MRT Bang Kapi",
        lat: 13.7692,
        lng: 100.6396,
        category: "public_transport",
        distanceMeters: 420,
        line: "Yellow Line",
      }),
    ).toContain("Yellow Line")
  })
})
