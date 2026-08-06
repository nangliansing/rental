import { describe, expect, it } from "vitest"

import { listingBuildingToReadOnlyMapGeo } from "./listingLocationMapGeo"

describe("listingBuildingToReadOnlyMapGeo", () => {
  it("maps a valid building point to read-only map geo", () => {
    expect(
      listingBuildingToReadOnlyMapGeo({
        location: {
          type: "Point",
          coordinates: [100.6435, 13.7654],
        },
      }),
    ).toEqual({
      kind: "point",
      position: { lat: 13.7654, lng: 100.6435 },
    })
  })

  it("returns null when building or location is missing/invalid", () => {
    expect(listingBuildingToReadOnlyMapGeo(null)).toBeNull()
    expect(listingBuildingToReadOnlyMapGeo({})).toBeNull()
    expect(
      listingBuildingToReadOnlyMapGeo({
        location: { type: "Point", coordinates: [999, 999] },
      }),
    ).toBeNull()
    expect(
      listingBuildingToReadOnlyMapGeo({
        location: { type: "Point", coordinates: [100.5] as never },
      }),
    ).toBeNull()
  })
})
