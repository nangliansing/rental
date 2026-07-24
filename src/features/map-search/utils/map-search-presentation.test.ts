import { describe, expect, it } from "vitest"

import {
  formatBuildingCount,
  formatBuildingResultsTitle,
  getSearchResultScopePhrase,
  getSearchScopeListingContext,
  getSearchScopeShortLabel,
  getSearchScopeVisualPhrase,
  getStaleSearchAnnouncement,
} from "./map-search-presentation"

const SOURCES = ["area", "nearby", "line"] as const

describe("map-search presentation selectors", () => {
  it.each(SOURCES)("returns distinct phrases for %s search", (source) => {
    expect(getSearchResultScopePhrase(source)).toMatch(/\S/)
    expect(getSearchScopeVisualPhrase(source)).toMatch(/\S/)
    expect(getSearchScopeShortLabel(source)).toMatch(/\S/)
    expect(getSearchScopeListingContext(source)).toMatch(/\S/)
    expect(getStaleSearchAnnouncement(source)).toContain("Search again")
  })

  it("formats singular and plural building counts", () => {
    expect(formatBuildingCount(1)).toBe("1 building")
    expect(formatBuildingCount(8)).toBe("8 buildings")
  })

  it.each([
    ["area", "3 buildings"],
    ["nearby", "3 buildings near pin"],
    ["line", "3 buildings along line"],
  ] as const)(
    "formats building result titles for %s search",
    (source, expected) => {
      expect(formatBuildingResultsTitle(3, source)).toBe(expected)
    },
  )
})
