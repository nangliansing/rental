import { describe, expect, it } from "vitest"

import { formatOpportunityMatchingNote } from "./formatOpportunityMatchingNote"

describe("formatOpportunityMatchingNote", () => {
  it("returns null when there is no caller match count", () => {
    expect(formatOpportunityMatchingNote(null)).toBeNull()
    expect(formatOpportunityMatchingNote(0)).toBeNull()
    expect(formatOpportunityMatchingNote(undefined)).toBeNull()
  })

  it("uses singular copy for one building", () => {
    expect(formatOpportunityMatchingNote(1)).toBe(
      "Your 1 building is visible to this demand",
    )
  })

  it("uses plural copy for multiple buildings", () => {
    expect(formatOpportunityMatchingNote(2)).toBe(
      "Your 2 buildings are visible to this demand",
    )
  })

  it("marks capped counts with a plus", () => {
    expect(formatOpportunityMatchingNote(20, true)).toBe(
      "Your 20+ buildings are visible to this demand",
    )
  })
})
