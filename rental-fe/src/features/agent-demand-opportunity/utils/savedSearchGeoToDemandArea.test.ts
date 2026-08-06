import { describe, expect, it } from "vitest"

import { savedSearchGeoToDemandArea } from "./savedSearchGeoToDemandArea"

describe("savedSearchGeoToDemandArea", () => {
  it("converts nearby search into a Point coverage area", () => {
    expect(
      savedSearchGeoToDemandArea({
        mode: "nearby",
        position: { lat: 13.7563, lng: 100.5018 },
        radiusMeters: 1000,
      }),
    ).toEqual({
      type: "Point",
      coordinates: [100.5018, 13.7563],
      coverageMeters: 1000,
    })
  })

  it("converts line search into a LineString coverage area", () => {
    expect(
      savedSearchGeoToDemandArea({
        mode: "line",
        geometry: {
          type: "LineString",
          coordinates: [
            [100.5, 13.75],
            [100.52, 13.76],
          ],
        },
        distanceMeters: 500,
      }),
    ).toEqual({
      type: "LineString",
      coordinates: [
        [100.5, 13.75],
        [100.52, 13.76],
      ],
      coverageMeters: 500,
    })
  })

  it("converts area bounds into a closed Polygon ring", () => {
    expect(
      savedSearchGeoToDemandArea({
        mode: "area",
        bounds: {
          northEast: { lat: 13.8, lng: 100.6 },
          southWest: { lat: 13.7, lng: 100.5 },
        },
      }),
    ).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [100.5, 13.7],
          [100.6, 13.7],
          [100.6, 13.8],
          [100.5, 13.8],
          [100.5, 13.7],
        ],
      ],
    })
  })

  it("rejects incomplete payloads", () => {
    expect(savedSearchGeoToDemandArea({ mode: "nearby" })).toBeNull()
    expect(
      savedSearchGeoToDemandArea({
        mode: "line",
        geometry: { type: "LineString", coordinates: [[100.5, 13.75]] },
        distanceMeters: 500,
      }),
    ).toBeNull()
  })
})
