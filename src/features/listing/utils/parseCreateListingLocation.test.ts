import { describe, expect, it } from "vitest"

import { parseCreateListingLocation } from "./parseCreateListingLocation"

describe("parseCreateListingLocation", () => {
  it("returns null when coordinates are missing", () => {
    expect(parseCreateListingLocation(null, null)).toBeNull()
    expect(parseCreateListingLocation("13.7", null)).toBeNull()
    expect(parseCreateListingLocation("", "100.5")).toBeNull()
  })

  it("returns null for invalid numeric coordinates", () => {
    expect(parseCreateListingLocation("abc", "100.5")).toBeNull()
    expect(parseCreateListingLocation("13.7", "xyz")).toBeNull()
    expect(parseCreateListingLocation("999", "999")).toBeNull()
  })

  it("returns GeoJSON point for valid coordinates", () => {
    expect(parseCreateListingLocation("13.7", "100.5")).toEqual({
      type: "Point",
      coordinates: [100.5, 13.7],
    })
  })
})
