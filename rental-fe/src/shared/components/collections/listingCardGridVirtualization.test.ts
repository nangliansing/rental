import { describe, expect, it } from "vitest"

import {
  LISTING_CARD_GRID_OVERSCAN,
  LISTING_CARD_GRID_RESPONSIVE_BREAKPOINT_PX,
  LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD,
  estimateListingGridRowHeightPx,
  getListingGridColumnCount,
  getListingGridRowKey,
  groupListingGridRows,
} from "./listingCardGridVirtualization"

describe("listingCardGridVirtualization constants", () => {
  it("uses a stable threshold aligned with one listing page plus buffer", () => {
    expect(LISTING_CARD_GRID_VIRTUALIZATION_THRESHOLD).toBe(24)
  })

  it("keeps virtualizer overscan minimal for lighter scroll work", () => {
    expect(LISTING_CARD_GRID_OVERSCAN).toBe(1)
  })

  it("matches the responsive sm breakpoint used by the grid layout", () => {
    expect(LISTING_CARD_GRID_RESPONSIVE_BREAKPOINT_PX).toBe(640)
  })
})

describe("groupListingGridRows", () => {
  it("groups items into fixed-width rows", () => {
    expect(groupListingGridRows(["a", "b", "c", "d", "e"], 2)).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e"],
    ])
  })

  it("returns an empty list for empty input", () => {
    expect(groupListingGridRows([], 3)).toEqual([])
  })

  it("returns an empty list when column count is invalid", () => {
    expect(groupListingGridRows(["a", "b"], 0)).toEqual([])
    expect(groupListingGridRows(["a", "b"], -1)).toEqual([])
  })

  it("keeps a single-item row when the count does not divide evenly", () => {
    expect(groupListingGridRows([1, 2, 3, 4, 5], 3)).toEqual([[1, 2, 3], [4, 5]])
  })

  it("preserves item order across rows", () => {
    const items = Array.from({ length: 7 }, (_, index) => index)
    expect(groupListingGridRows(items, 2)).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
      [6],
    ])
  })
})

describe("getListingGridColumnCount", () => {
  it("always uses two columns for building-detail grids", () => {
    expect(getListingGridColumnCount("two", 320)).toBe(2)
    expect(getListingGridColumnCount("two", 1200)).toBe(2)
  })

  it("derives responsive column counts from container width", () => {
    expect(getListingGridColumnCount("responsive", 500)).toBe(2)
    expect(getListingGridColumnCount("responsive", 640)).toBe(3)
    expect(getListingGridColumnCount("responsive", 768)).toBe(3)
  })

  it("treats sub-breakpoint widths as two columns", () => {
    expect(getListingGridColumnCount("responsive", 639)).toBe(2)
  })
})

describe("estimateListingGridRowHeightPx", () => {
  it("estimates square row height from container width and gaps", () => {
    expect(estimateListingGridRowHeightPx(390, 2, 2)).toBe(196)
  })

  it("includes inter-column gaps for three-column rows", () => {
    expect(estimateListingGridRowHeightPx(900, 3, 2)).toBeCloseTo(300.67, 2)
  })

  it("falls back defensively for invalid measurements", () => {
    expect(estimateListingGridRowHeightPx(0, 2)).toBe(180)
    expect(estimateListingGridRowHeightPx(400, 0)).toBe(180)
    expect(estimateListingGridRowHeightPx(-10, 2)).toBe(180)
  })
})

describe("getListingGridRowKey", () => {
  it("builds stable row keys from the first item", () => {
    expect(
      getListingGridRowKey(
        [{ _id: "listing-1" }, { _id: "listing-2" }],
        4,
        (item) => item._id,
      ),
    ).toBe("4-listing-1")
  })

  it("falls back to the row index when the row is empty", () => {
    expect(getListingGridRowKey([], 7, () => "unused")).toBe(
      "listing-grid-row-7",
    )
  })
})
