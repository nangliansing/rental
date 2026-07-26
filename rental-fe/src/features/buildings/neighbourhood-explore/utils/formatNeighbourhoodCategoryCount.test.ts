import { describe, expect, it } from "vitest"

import { formatNeighbourhoodCategoryCount } from "./formatNeighbourhoodCategoryCount"

describe("formatNeighbourhoodCategoryCount", () => {
  it("returns the count as a string by default", () => {
    expect(formatNeighbourhoodCategoryCount(35)).toBe("35")
  })

  it("appends a plus sign when truncated", () => {
    expect(formatNeighbourhoodCategoryCount(215, { truncated: true })).toBe(
      "215+",
    )
  })
})
