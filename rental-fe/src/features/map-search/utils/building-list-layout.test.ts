import { describe, expect, it } from "vitest"

import {
  BUILDING_LIST_ITEM_GAP_CLASS,
  BUILDING_LIST_ITEM_GAP_PX,
  BUILDING_LIST_CONTAINER_CLASS,
  ESTIMATED_BUILDING_CARD_HEIGHT_PX,
  getBuildingAtIndex,
  getBuildingListItemGapClass,
  getEstimatedBuildingListItemHeightPx,
  RESULTS_PANEL_LISTING_GRID_CLASS,
} from "./building-list-layout"

describe("building-list-layout", () => {
  it("returns a gap class for every item except the last", () => {
    expect(getBuildingListItemGapClass(0, 3)).toBe(BUILDING_LIST_ITEM_GAP_CLASS)
    expect(getBuildingListItemGapClass(1, 3)).toBe(BUILDING_LIST_ITEM_GAP_CLASS)
    expect(getBuildingListItemGapClass(2, 3)).toBeUndefined()
  })

  it("does not return a gap for invalid indexes or empty lists", () => {
    expect(getBuildingListItemGapClass(-1, 3)).toBeUndefined()
    expect(getBuildingListItemGapClass(0, 0)).toBeUndefined()
    expect(getBuildingListItemGapClass(Number.NaN, 3)).toBeUndefined()
    expect(getBuildingListItemGapClass(0, Number.NaN)).toBeUndefined()
  })

  it("includes the list-item gap in virtualized height estimates", () => {
    expect(getEstimatedBuildingListItemHeightPx()).toBe(
      ESTIMATED_BUILDING_CARD_HEIGHT_PX + BUILDING_LIST_ITEM_GAP_PX,
    )
  })

  it("keeps listing grids aligned with panel edge breakout", () => {
    expect(RESULTS_PANEL_LISTING_GRID_CLASS).toBe("-mx-4")
  })

  it("derives the list container from shared panel layout helpers", () => {
    expect(BUILDING_LIST_CONTAINER_CLASS).toContain("bg-[#f1f3f4]")
    expect(BUILDING_LIST_CONTAINER_CLASS).toContain("-mx-4")
    expect(BUILDING_LIST_CONTAINER_CLASS).toContain("py-2")
  })

  it("safely resolves buildings by index", () => {
    const buildings = [{ _id: "a" }, { _id: "b" }]

    expect(getBuildingAtIndex(buildings, 0)?._id).toBe("a")
    expect(getBuildingAtIndex(buildings, 2)).toBeUndefined()
    expect(getBuildingAtIndex(buildings, -1)).toBeUndefined()
  })
})
