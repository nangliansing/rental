import { describe, expect, it } from "vitest"

import type { ListerReviewSummary } from "../api"
import { getPopularReviewTags } from "./getPopularReviewTags"

const summary = (
  tagCounts: ListerReviewSummary["tagCounts"],
): ListerReviewSummary => ({
  averageRating: 4.5,
  reviewCount: 10,
  ratingCounts: {
    oneStar: 0,
    twoStars: 0,
    threeStars: 0,
    fourStars: 5,
    fiveStars: 5,
  },
  tagCounts,
})

describe("getPopularReviewTags", () => {
  it("returns the top tags by count with a stable name tie-break", () => {
    expect(
      getPopularReviewTags(
        summary([
          { tag: "RUDE", count: 1 },
          { tag: "HELPFUL", count: 4 },
          { tag: "RESPONSIVE", count: 4 },
          { tag: "PROFESSIONAL", count: 2 },
        ]),
        2,
      ),
    ).toEqual([
      { tag: "HELPFUL", count: 4 },
      { tag: "RESPONSIVE", count: 4 },
    ])
  })

  it("ignores zero-count tags and empty summaries", () => {
    expect(
      getPopularReviewTags(
        summary([
          { tag: "HELPFUL", count: 0 },
          { tag: "RESPONSIVE", count: 3 },
        ]),
      ),
    ).toEqual([{ tag: "RESPONSIVE", count: 3 }])
    expect(getPopularReviewTags(null)).toEqual([])
    expect(getPopularReviewTags(undefined, 2)).toEqual([])
  })
})
