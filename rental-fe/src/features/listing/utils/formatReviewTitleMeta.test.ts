import { describe, expect, it } from "vitest"

import { formatReviewTitleMeta } from "./formatReviewTitleMeta"

describe("formatReviewTitleMeta", () => {
  it("returns null when there are no reviews", () => {
    expect(formatReviewTitleMeta(4.5, 0)).toBeNull()
    expect(formatReviewTitleMeta(4.5, null)).toBeNull()
    expect(formatReviewTitleMeta(4.5, undefined)).toBeNull()
    expect(formatReviewTitleMeta(4.5, Number.NaN)).toBeNull()
  })

  it("formats rating and plural count", () => {
    expect(formatReviewTitleMeta(4.5, 30)).toBe("4.5 (30 reviews)")
  })

  it("formats a singular review count", () => {
    expect(formatReviewTitleMeta(5, 1)).toBe("5.0 (1 review)")
  })

  it("omits rating when it is not a finite number", () => {
    expect(formatReviewTitleMeta(null, 3)).toBe("3 reviews")
    expect(formatReviewTitleMeta(Number.NaN, 3)).toBe("3 reviews")
  })

  it("truncates fractional counts", () => {
    expect(formatReviewTitleMeta(4, 2.9)).toBe("4.0 (2 reviews)")
  })
})
