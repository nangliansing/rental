import { describe, expect, it } from "vitest"

import type { ListingMedia } from "@/features/map-search/types"

import {
  formatBathroom,
  formatBedroom,
  formatCompactMoney,
  formatContract,
  formatMoney,
  formatRate,
  getListingDetailPath,
  getSortedListingPhotos,
} from "./listingDisplay"

describe("listing display formatters", () => {
  it("formats valid zero and singular values", () => {
    expect(formatMoney(0)).toBe("฿0")
    expect(formatCompactMoney(1500)).toBe("฿1.5k")
    expect(formatRate(8)).toBe("฿8")
    expect(formatBedroom(0)).toBe("Studio")
    expect(formatBedroom(1)).toBe("1 bed")
    expect(formatBathroom(1)).toBe("1 bath")
    expect(formatContract(1)).toBe("1 mo")
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5])(
    "rejects invalid numeric display input %s",
    (value) => {
      if (value === 1.5) {
        expect(formatMoney(value)).toBe("฿1.5")
        expect(formatCompactMoney(value)).toBe("฿1.5")
        expect(formatRate(value)).toBe("฿1.5")
      } else {
        expect(formatMoney(value)).toBe("฿--")
        expect(formatCompactMoney(value)).toBe("฿--")
        expect(formatRate(value)).toBe("฿--")
      }
      expect(formatBedroom(value)).toBe("Room")
      expect(formatBathroom(value)).toBe("Bath")
      expect(formatContract(value)).toBe("Contract")
    },
  )
})

describe("getSortedListingPhotos", () => {
  it("filters malformed media, prioritizes the cover, and does not mutate input", () => {
    const first: ListingMedia = {
      publicId: "first",
      secureUrl: "https://example.com/first.jpg",
      position: 0,
    }
    const cover: ListingMedia = {
      publicId: "cover",
      secureUrl: "https://example.com/cover.jpg",
      position: 4,
      isCover: true,
    }
    const media = [first, null, { secureUrl: " " }, cover] as unknown as ListingMedia[]

    expect(getSortedListingPhotos(media)).toEqual([cover, first])
    expect(media).toEqual([first, null, { secureUrl: " " }, cover])
  })

  it.each([null, undefined, []] as const)(
    "returns an empty array for absent media: %s",
    (media) => {
      expect(getSortedListingPhotos(media)).toEqual([])
    },
  )

  it("builds listing detail paths defensively", () => {
    expect(getListingDetailPath("listing-1")).toBe("/listings/listing-1")
    expect(getListingDetailPath("  listing 2  ")).toBe("/listings/listing%202")
    expect(getListingDetailPath("")).toBeNull()
    expect(getListingDetailPath("   ")).toBeNull()
    expect(getListingDetailPath(null)).toBeNull()
  })
})
