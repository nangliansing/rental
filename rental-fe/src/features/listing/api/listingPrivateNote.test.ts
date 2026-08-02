import { describe, expect, it } from "vitest"

import { parseOwnerListing, parseSearchListing } from "./listingResponseParsers"

const baseListingPayload = {
  _id: "listing-1",
  listedBy: "owner-1",
  buildingId: "building-1",
  building: {
    _id: "building-1",
    name: "Sample Residence",
    location: { coordinates: [100.5, 13.7] },
  },
}

describe("privateNote listing detail parsing", () => {
  it("parseOwnerListing preserves owner-only privateNote on detail payloads", () => {
    const parsed = parseOwnerListing({
      ...baseListingPayload,
      privateNote: "Gate code 1234",
    })

    expect(parsed.privateNote).toBe("Gate code 1234")
  })

  it("parseSearchListing omits privateNote when the API redacts it", () => {
    const parsed = parseSearchListing(baseListingPayload)

    expect(parsed.privateNote).toBeUndefined()
  })

  it("parseSearchListing coerces malformed privateNote types to null", () => {
    const parsed = parseSearchListing({
      ...baseListingPayload,
      privateNote: 123,
    })

    expect(parsed.privateNote).toBeNull()
  })
})
