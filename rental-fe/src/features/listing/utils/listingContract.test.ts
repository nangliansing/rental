import { describe, expect, it } from "vitest"

import {
  getListingContractOption,
  normalizeListingContractMonths,
} from "./listingContract"

describe("listingContract", () => {
  it("normalizes known contract lengths and falls back to 3 months", () => {
    expect(normalizeListingContractMonths(6)).toBe(6)
    expect(normalizeListingContractMonths("12")).toBe(12)
    expect(normalizeListingContractMonths(4)).toBe(3)
    expect(normalizeListingContractMonths("bad")).toBe(3)
    expect(normalizeListingContractMonths(null)).toBe(3)
  })

  it("resolves labels for the trigger", () => {
    expect(getListingContractOption(1).label).toBe("1 month")
    expect(getListingContractOption("6").label).toBe("6 months")
  })
})
