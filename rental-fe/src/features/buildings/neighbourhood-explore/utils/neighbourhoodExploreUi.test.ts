import { describe, expect, it } from "vitest"

import {
  shouldShowNeighbourhoodCategoryBar,
  shouldShowNeighbourhoodCategoryDivider,
} from "./neighbourhoodExploreUi"

describe("neighbourhoodExploreUi", () => {
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
