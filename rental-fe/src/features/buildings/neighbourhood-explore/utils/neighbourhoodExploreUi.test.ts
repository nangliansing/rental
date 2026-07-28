import { describe, expect, it } from "vitest"

import {
  getNeighbourhoodTruncationHint,
  NEIGHBOURHOOD_CATEGORY_BAR_CONTAINER_CLASS,
  shouldShowNeighbourhoodCategoryBar,
  shouldShowNeighbourhoodCategoryDivider,
} from "./neighbourhoodExploreUi"

describe("getNeighbourhoodTruncationHint", () => {
  it("returns null when results are not truncated", () => {
    expect(
      getNeighbourhoodTruncationHint({
        all: 12,
      }),
    ).toBeNull()
  })

  it("returns a count-based hint when totalWithinRadius exceeds the shown count", () => {
    expect(
      getNeighbourhoodTruncationHint({
        all: 20,
        truncated: true,
        totalWithinRadius: 48,
      }),
    ).toBe("Showing 20 of 48 nearby places")
  })

  it("falls back to a generic hint when truncated without a larger total", () => {
    expect(
      getNeighbourhoodTruncationHint({
        all: 20,
        truncated: true,
      }),
    ).toBe("Showing closest places only")
  })
})

describe("neighbourhoodExploreUi", () => {
  it("uses a padding-only category bar container without a map scrim", () => {
    expect(NEIGHBOURHOOD_CATEGORY_BAR_CONTAINER_CLASS).not.toMatch(/gradient|blur|white\//)
  })

  it("shows the category bar when tabs or refresh state are present", () => {
    expect(shouldShowNeighbourhoodCategoryBar(0, false)).toBe(false)
    expect(shouldShowNeighbourhoodCategoryBar(2, false)).toBe(true)
    expect(shouldShowNeighbourhoodCategoryBar(0, true)).toBe(true)
  })

  it("shows refresh spacing only when both tabs and refresh are visible", () => {
    expect(shouldShowNeighbourhoodCategoryDivider(0, true)).toBe(false)
    expect(shouldShowNeighbourhoodCategoryDivider(2, true)).toBe(true)
  })
})
