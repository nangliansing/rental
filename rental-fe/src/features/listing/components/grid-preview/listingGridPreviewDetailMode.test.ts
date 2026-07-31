import { describe, expect, it } from "vitest"

import { createSearchListing } from "@/test/fixtures/listings"

import {
  isListingGridPreviewLinkDetailMode,
  isListingGridPreviewModalDetailMode,
  readListingGridPreviewListingId,
} from "./listingGridPreviewDetailMode"

describe("listingGridPreviewDetailMode", () => {
  it("reads listing ids from preview listings", () => {
    expect(readListingGridPreviewListingId(createSearchListing())).toBe("listing-1")
    expect(
      readListingGridPreviewListingId(createSearchListing({ _id: "  listing-2  " })),
    ).toBe("listing-2")
    expect(
      readListingGridPreviewListingId(createSearchListing({ _id: "   " as never })),
    ).toBe("")
  })

  it("identifies modal and link detail modes", () => {
    const modalMode = {
      mode: "modal" as const,
      onOpenDetail: () => undefined,
    }
    const linkMode = {
      mode: "link" as const,
      link: { to: "/listings/listing-1" },
    }

    expect(isListingGridPreviewModalDetailMode(modalMode)).toBe(true)
    expect(isListingGridPreviewLinkDetailMode(modalMode)).toBe(false)
    expect(isListingGridPreviewModalDetailMode(linkMode)).toBe(false)
    expect(isListingGridPreviewLinkDetailMode(linkMode)).toBe(true)
  })
})
