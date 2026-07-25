import { describe, expect, it } from "vitest"

import { buildListingDirectionsDestination } from "./buildListingDirectionsDestination"

describe("buildListingDirectionsDestination", () => {
  it("builds a destination from building location data", () => {
    expect(
      buildListingDirectionsDestination({
        name: "Bangkapi Residence",
        location: {
          coordinates: [100.6435, 13.7654],
        },
      }),
    ).toEqual({
      name: "Bangkapi Residence",
      coordinates: [100.6435, 13.7654],
    })
  })

  it("returns null when building location is missing or invalid", () => {
    expect(buildListingDirectionsDestination(null)).toBeNull()
    expect(buildListingDirectionsDestination({ name: "Tower" })).toBeNull()
    expect(
      buildListingDirectionsDestination({
        name: "Tower",
        location: { coordinates: [999, 999] },
      }),
    ).toBeNull()
  })
})
