import { describe, expect, it } from "vitest"

import { listingPhoto, createSearchBuilding, createSearchListing } from "@/test/fixtures/listings"

import type { SearchSavedListing } from "../api"
import type { SavedListingLiveListing } from "../api/searchSavedListings"
import {
  getSavedListingBuildingName,
  getSavedListingCover,
  getSavedListingTitle,
  isSavedListingAvailable,
} from "./savedListingDisplay"

function createSavedListing(
  overrides: Partial<SearchSavedListing> = {},
): SearchSavedListing {
  return {
    _id: "saved-1",
    listingId: "listing-1",
    buildingId: "building-1",
    listedBy: "user-1",
    snapshot: {
      rent: 14000,
      visibility: "PUBLIC",
      buildingName: "Snapshot Building",
      coverPhoto: listingPhoto,
    },
    listing: null,
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
    ...overrides,
  }
}

describe("savedListingDisplay", () => {
  it("prefers live listing media and rent over snapshot values", () => {
    const liveListing: SavedListingLiveListing = {
      ...createSearchListing({ rent: 16000 }),
      media: [{ ...listingPhoto, secureUrl: "https://example.com/live.jpg" }],
      building: createSearchBuilding({ name: "Live Building" }),
    }

    const savedListing = createSavedListing({
      listing: liveListing,
    })

    expect(getSavedListingCover(savedListing)?.secureUrl).toBe(
      "https://example.com/live.jpg",
    )
    expect(getSavedListingTitle(savedListing)).toBe("฿16k")
    expect(getSavedListingBuildingName(savedListing)).toBe("Live Building")
    expect(isSavedListingAvailable(savedListing)).toBe(true)
  })

  it("falls back to snapshot values when live listing is absent", () => {
    const savedListing = createSavedListing()

    expect(getSavedListingCover(savedListing)?.secureUrl).toBe(
      listingPhoto.secureUrl,
    )
    expect(getSavedListingTitle(savedListing)).toBe("฿14k")
    expect(getSavedListingBuildingName(savedListing)).toBe("Snapshot Building")
    expect(isSavedListingAvailable(savedListing)).toBe(false)
  })
})
