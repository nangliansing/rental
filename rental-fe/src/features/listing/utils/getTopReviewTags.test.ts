import { describe, expect, it } from "vitest"

import { getTopReviewTags } from "./getTopReviewTags"

describe("getTopReviewTags", () => {
  it("returns the top tags by count, capped at the limit", () => {
    expect(
      getTopReviewTags(
        [
          { tag: "FRIENDLY", count: 2 },
          { tag: "HELPFUL", count: 5 },
          { tag: "RESPONSIVE", count: 3 },
        ],
        2,
      ),
    ).toEqual([
      { tag: "HELPFUL", count: 5 },
      { tag: "RESPONSIVE", count: 3 },
    ])
  })

  it("breaks ties alphabetically and merges duplicate tags", () => {
    expect(
      getTopReviewTags([
        { tag: "RUDE", count: 2 },
        { tag: "HELPFUL", count: 2 },
        { tag: "helpful", count: 1 },
      ]),
    ).toEqual([
      { tag: "HELPFUL", count: 3 },
      { tag: "RUDE", count: 2 },
    ])
  })

  it("skips invalid or empty entries", () => {
    expect(
      getTopReviewTags([
        { tag: " ", count: 4 },
        { tag: "HELPFUL", count: 0 },
        { tag: "RESPONSIVE", count: Number.NaN },
        { tag: null, count: 3 },
        { tag: "FRIENDLY", count: 1.9 },
      ]),
    ).toEqual([{ tag: "FRIENDLY", count: 1 }])
  })

  it("returns an empty list for missing input or a non-positive limit", () => {
    expect(getTopReviewTags(null)).toEqual([])
    expect(getTopReviewTags(undefined)).toEqual([])
    expect(getTopReviewTags([{ tag: "HELPFUL", count: 1 }], 0)).toEqual([])
    expect(getTopReviewTags([{ tag: "HELPFUL", count: 1 }], -1)).toEqual([])
  })
})
