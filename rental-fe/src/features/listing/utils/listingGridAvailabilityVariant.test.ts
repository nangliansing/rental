import { describe, expect, it } from "vitest"

import { LISTING_GRID_CARD_AVAILABILITY_VARIANT } from "./listingGridAvailabilityVariant"

describe("listingGridAvailabilityVariant", () => {
  it("uses compact availability on grid-like surfaces", () => {
    expect(LISTING_GRID_CARD_AVAILABILITY_VARIANT).toBe("compact")
  })
})
