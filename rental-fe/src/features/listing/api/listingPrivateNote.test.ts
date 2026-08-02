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
  describe("parseOwnerListing", () => {
    it("preserves owner-only privateNote on detail payloads", () => {
      const parsed = parseOwnerListing({
        ...baseListingPayload,
        privateNote: "Gate code 1234",
      })

      expect(parsed.privateNote).toBe("Gate code 1234")
    })

    it("omits privateNote when the API redacts it", () => {
      const parsed = parseOwnerListing(baseListingPayload)

      expect(parsed.privateNote).toBeUndefined()
    })

    it("preserves explicit null privateNote when the API includes it", () => {
      const parsed = parseOwnerListing({
        ...baseListingPayload,
        privateNote: null,
      })

      expect(parsed.privateNote).toBeNull()
    })

    it("coerces malformed privateNote types to null", () => {
      const parsed = parseOwnerListing({
        ...baseListingPayload,
        privateNote: 123,
      })

      expect(parsed.privateNote).toBeNull()
    })

    it("preserves multiline private notes without trimming", () => {
      const parsed = parseOwnerListing({
        ...baseListingPayload,
        privateNote: "  Gate code 1234\nCall before viewing  ",
      })

      expect(parsed.privateNote).toBe("  Gate code 1234\nCall before viewing  ")
    })
  })

  describe("parseSearchListing", () => {
    it("omits privateNote when the API redacts it", () => {
      const parsed = parseSearchListing(baseListingPayload)

      expect(parsed.privateNote).toBeUndefined()
    })

    it("keeps privateNote when the owner detail API includes it", () => {
      const parsed = parseSearchListing({
        ...baseListingPayload,
        privateNote: "  Call before viewing  ",
      })

      expect(parsed.privateNote).toBe("  Call before viewing  ")
    })

    it("preserves explicit null privateNote when the API includes it", () => {
      const parsed = parseSearchListing({
        ...baseListingPayload,
        privateNote: null,
      })

      expect(parsed.privateNote).toBeNull()
    })

    it("coerces malformed privateNote types to null", () => {
      const parsed = parseSearchListing({
        ...baseListingPayload,
        privateNote: 123,
      })

      expect(parsed.privateNote).toBeNull()
    })
  })
})
