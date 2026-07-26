import { describe, expect, it } from "vitest"

import {
  buildListerProfileStatItems,
  buildOwnerProfileStatRows,
} from "./profileStatItems"

const reviewSummary = {
  averageRating: 4.567,
  reviewCount: 2,
  ratingCounts: {
    oneStar: 0,
    twoStars: 0,
    threeStars: 0,
    fourStars: 1,
    fiveStars: 1,
  },
  tagCounts: [],
}

describe("buildOwnerProfileStatRows", () => {
  it("builds primary and secondary stat rows with hidden rating when there are no reviews", () => {
    const { primary, secondary } = buildOwnerProfileStatRows({
      listingSummary: {
        activeCount: 2,
        pendingCount: 1,
        rejectedCount: 0,
      },
      reviewSummary: {
        ...reviewSummary,
        reviewCount: 0,
        averageRating: 0,
      },
    })

    expect(primary).toEqual([
      { id: "listings", value: 2, label: "Listings" },
      { id: "reviews", value: 0, label: "Reviews" },
      { id: "rating", value: "0.0", label: "Rating", hidden: true },
    ])
    expect(secondary).toEqual([
      { id: "pending", value: 1, label: "Pending" },
      { id: "rejected", value: 0, label: "Rejected", hidden: true },
    ])
  })

  it("shows rejected count only when it is greater than zero", () => {
    const { secondary } = buildOwnerProfileStatRows({
      listingSummary: {
        activeCount: 0,
        pendingCount: 0,
        rejectedCount: 3,
      },
    })

    expect(secondary).toEqual([
      { id: "pending", value: 0, label: "Pending" },
      { id: "rejected", value: 3, label: "Rejected", hidden: false },
    ])
  })
})

describe("buildListerProfileStatItems", () => {
  it("formats rating and hides it when there are no reviews", () => {
    expect(
      buildListerProfileStatItems({
        activeCount: 3,
        reviewSummary,
      }),
    ).toEqual([
      { id: "listings", value: 3, label: "Listings" },
      { id: "reviews", value: 2, label: "Reviews" },
      { id: "rating", value: "4.6", label: "Rating", hidden: false },
    ])

    expect(
      buildListerProfileStatItems({
        activeCount: 3,
        reviewSummary: {
          ...reviewSummary,
          reviewCount: 0,
          averageRating: 0,
        },
      }),
    ).toEqual([
      { id: "listings", value: 3, label: "Listings" },
      { id: "reviews", value: 0, label: "Reviews" },
      { id: "rating", value: "0.0", label: "Rating", hidden: true },
    ])
  })
})
