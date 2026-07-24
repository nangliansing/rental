import { describe, expect, it } from "vitest"

import {
  extendMapCameraBounds,
  getBuildingSelectionCameraBounds,
  getBoundsFromSearchArea,
} from "./map-camera"

describe("getBuildingSelectionCameraBounds", () => {
  const buildingPosition = { lat: 13.75, lng: 100.64 }

  it("returns null when there is no search context to preserve", () => {
    expect(
      getBuildingSelectionCameraBounds({
        buildingPosition,
        pin: null,
        searchBounds: null,
      }),
    ).toBeNull()
  })

  it("includes the search pin and selected building", () => {
    expect(
      getBuildingSelectionCameraBounds({
        buildingPosition,
        pin: { lat: 13.74, lng: 100.63 },
        searchBounds: null,
      }),
    ).toEqual({
      north: 13.75,
      south: 13.74,
      east: 100.64,
      west: 100.63,
    })
  })

  it("includes committed area bounds and the selected building", () => {
    const searchBounds = {
      northEast: { lat: 13.8, lng: 100.7 },
      southWest: { lat: 13.7, lng: 100.6 },
    }

    expect(
      getBuildingSelectionCameraBounds({
        buildingPosition,
        pin: null,
        searchBounds,
      }),
    ).toEqual(getBoundsFromSearchArea(searchBounds))
  })

  it("enforces a minimum span when the pin and building are very close", () => {
    const bounds = getBuildingSelectionCameraBounds({
      buildingPosition,
      pin: { lat: 13.7501, lng: 100.6401 },
      searchBounds: null,
    })

    expect(bounds).not.toBeNull()
    expect(bounds!.north - bounds!.south).toBeCloseTo(0.0008, 5)
    expect(bounds!.east - bounds!.west).toBeCloseTo(0.0008, 5)
  })
})

describe("extendMapCameraBounds", () => {
  it("expands bounds to include a new position", () => {
    expect(
      extendMapCameraBounds(
        { north: 13.8, south: 13.7, east: 100.7, west: 100.6 },
        { lat: 13.65, lng: 100.55 },
      ),
    ).toEqual({
      north: 13.8,
      south: 13.65,
      east: 100.7,
      west: 100.55,
    })
  })
})
