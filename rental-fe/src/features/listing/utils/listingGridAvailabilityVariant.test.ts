import { describe, expect, it } from "vitest"

import {
  getListingGridAvailabilityVariant,
  LISTING_GRID_AVAILABILITY_VARIANT,
} from "./listingGridAvailabilityVariant"

describe("listingGridAvailabilityVariant", () => {
  it("uses indicator for browse tabs and compact for Soon", () => {
    expect(getListingGridAvailabilityVariant("all")).toBe(
      LISTING_GRID_AVAILABILITY_VARIANT.browse,
    )
    expect(getListingGridAvailabilityVariant("now")).toBe(
      LISTING_GRID_AVAILABILITY_VARIANT.browse,
    )
    expect(getListingGridAvailabilityVariant("private")).toBe(
      LISTING_GRID_AVAILABILITY_VARIANT.browse,
    )
    expect(getListingGridAvailabilityVariant("soon")).toBe(
      LISTING_GRID_AVAILABILITY_VARIANT.timing,
    )
  })
})
