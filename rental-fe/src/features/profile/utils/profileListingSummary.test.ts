import { describe, expect, it } from "vitest"

import {
  decrementListingSummaryCounts,
  normalizeListingSummary,
  shouldShowFirstListingPrompt,
} from "./profileListingSummary"

describe("normalizeListingSummary", () => {
  it("returns zero counts for missing or null summary", () => {
    expect(normalizeListingSummary()).toEqual({
      activeCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
    })
    expect(normalizeListingSummary(null)).toEqual({
      activeCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
    })
  })

  it("clamps invalid and negative values to safe non-negative integers", () => {
    expect(
      normalizeListingSummary({
        activeCount: -3,
        pendingCount: 2.9,
        rejectedCount: Number.NaN,
      }),
    ).toEqual({
      activeCount: 0,
      pendingCount: 2,
      rejectedCount: 0,
    })
  })
})

describe("shouldShowFirstListingPrompt", () => {
  it("shows the prompt only when there are no active or pending listings", () => {
    expect(
      shouldShowFirstListingPrompt({
        activeCount: 0,
        pendingCount: 0,
        rejectedCount: 1,
      }),
    ).toBe(true)

    expect(
      shouldShowFirstListingPrompt({
        activeCount: 1,
        pendingCount: 0,
        rejectedCount: 0,
      }),
    ).toBe(false)

    expect(
      shouldShowFirstListingPrompt({
        activeCount: 0,
        pendingCount: 1,
        rejectedCount: 0,
      }),
    ).toBe(false)
  })
})

describe("decrementListingSummaryCounts", () => {
  it("decrements pending and rejected counts without going below zero", () => {
    expect(
      decrementListingSummaryCounts(
        { activeCount: 2, pendingCount: 1, rejectedCount: 2 },
        { pending: 1, rejected: 3 },
      ),
    ).toEqual({
      activeCount: 2,
      pendingCount: 0,
      rejectedCount: 0,
    })
  })

  it("normalizes missing summary before decrementing", () => {
    expect(decrementListingSummaryCounts(null, { pending: 1 })).toEqual({
      activeCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
    })
  })
})
