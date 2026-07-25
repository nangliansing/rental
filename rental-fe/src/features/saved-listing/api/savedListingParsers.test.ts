import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-client"
import { listingPhoto } from "@/test/fixtures/listings"

import {
  parseSavedListingResponse,
  parseSearchSavedListing,
  parseSearchSavedListingsResponse,
} from "./savedListingParsers"

describe("savedListingParsers", () => {
  it("parseSearchSavedListing accepts null snapshot and listing", () => {
    const parsed = parseSearchSavedListing({
      _id: "saved-1",
      listingId: "listing-1",
      buildingId: "building-1",
      listedBy: "user-1",
      snapshot: null,
      listing: null,
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-21T00:00:00.000Z",
    })

    expect(parsed._id).toBe("saved-1")
    expect(parsed.snapshot).toBeNull()
    expect(parsed.listing).toBeNull()
  })

  it("parseSearchSavedListingsResponse throws when savedListings is missing", () => {
    expect(() =>
      parseSearchSavedListingsResponse(
        { success: true, data: {} },
        { page: 1, limit: 12 },
      ),
    ).toThrow(ApiError)
  })

  it("parseSearchSavedListingsResponse parses paginated saved listings", () => {
    const parsed = parseSearchSavedListingsResponse(
      {
        success: true,
        data: {
          savedListings: [
            {
              _id: "saved-1",
              listingId: "listing-1",
              buildingId: "building-1",
              listedBy: "user-1",
              snapshot: {
                rent: 14000,
                visibility: "PUBLIC",
                buildingName: "Bangkapi Residence",
                coverPhoto: listingPhoto,
              },
              listing: null,
              createdAt: "2026-07-20T00:00:00.000Z",
              updatedAt: "2026-07-21T00:00:00.000Z",
            },
          ],
        },
        pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
      },
      { page: 1, limit: 12 },
    )

    expect(parsed.data.savedListings).toHaveLength(1)
    expect(parsed.data.savedListings[0]?.snapshot?.buildingName).toBe(
      "Bangkapi Residence",
    )
  })

  it("parseSavedListingResponse throws when success is false", () => {
    expect(() => parseSavedListingResponse({ success: false })).toThrow(
      ApiError,
    )
  })
})
