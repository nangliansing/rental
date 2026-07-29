import { describe, expect, it } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import type { ListerReview } from "./createListerReview"
import {
  addReviewToSummary,
  listerReviewRefetchQueryKeys,
  removeReviewFromListerReviewData,
  replaceReviewInListerReviewData,
  setMyReviewInListerReviewData,
  type ListerReviewsCacheData,
} from "./reviewMutationCache"

const review = {
  _id: "review-1",
  reviewerId: "user-1",
  listerProfileId: "profile-1",
  relatedListingId: null,
  relatedBuildingId: null,
  rating: 5,
  tags: [],
  comment: "Nice",
  interaction: {
    isVerified: false,
    verifiedBy: null,
    contactEventId: null,
    verifiedAt: null,
  },
  moderation: {
    hiddenBy: null,
    hiddenAt: null,
    hiddenReason: null,
    removedBy: null,
    removedAt: null,
    removedReason: null,
  },
  visibility: {
    isCollapsed: false,
    collapsedBy: null,
    collapsedAt: null,
    collapseReason: null,
  },
  editedAt: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
} satisfies ListerReview

const infiniteData: ListerReviewsCacheData = {
  pageParams: [1],
  pages: [
    {
      success: true,
      data: { myReview: review, reviews: [review] },
      pagination: { page: 1, limit: 10, total: 1 },
    },
  ],
}

/** A flat `useQuery` page, i.e. the teaser cache shape. */
const flatPage = {
  success: true,
  data: { myReview: review, reviews: [] },
  pagination: { page: 1, limit: 3, total: 0 },
} as unknown as ListerReviewsCacheData

describe("listerReviewRefetchQueryKeys", () => {
  it("covers both the infinite lists and the teaser caches", () => {
    expect(listerReviewRefetchQueryKeys("profile-1")).toEqual([
      queryKeys.listerReviews.byLister("profile-1"),
      queryKeys.listerReviewTeasers.byLister("profile-1"),
    ])
  })
})

describe("lister review cache helpers", () => {
  it("removes a review and fixes pagination on infinite data", () => {
    expect(
      removeReviewFromListerReviewData(infiniteData, "review-1"),
    ).toMatchObject({
      pages: [{ data: { myReview: null, reviews: [] }, pagination: { total: 0 } }],
    })
  })

  it("leaves non-infinite caches untouched instead of throwing", () => {
    expect(removeReviewFromListerReviewData(flatPage, "review-1")).toBe(flatPage)
    expect(setMyReviewInListerReviewData(flatPage, review)).toBe(flatPage)
    expect(replaceReviewInListerReviewData(flatPage, "review-1", review)).toBe(
      flatPage,
    )
  })

  it("returns undefined input unchanged", () => {
    expect(removeReviewFromListerReviewData(undefined, "review-1")).toBeUndefined()
  })

  it.each([
    { pages: [{ data: null }] },
    { pages: [{ data: { reviews: null }, pagination: { total: 1 } }] },
    { pages: [{ data: { reviews: [] }, pagination: null }] },
    {
      pages: [
        { data: { reviews: [] }, pagination: { total: Number.NaN } },
      ],
    },
  ])("leaves malformed infinite data untouched: %#", (malformed) => {
    const current = malformed as unknown as ListerReviewsCacheData

    expect(removeReviewFromListerReviewData(current, "review-1")).toBe(current)
    expect(setMyReviewInListerReviewData(current, review)).toBe(current)
    expect(replaceReviewInListerReviewData(current, "review-1", review)).toBe(
      current,
    )
  })
})

describe("addReviewToSummary", () => {
  it("creates a finite summary when no previous summary exists", () => {
    expect(addReviewToSummary(undefined, 5, ["HELPFUL"])).toEqual({
      averageRating: 5,
      reviewCount: 1,
      ratingCounts: {
        oneStar: 0,
        twoStars: 0,
        threeStars: 0,
        fourStars: 0,
        fiveStars: 1,
      },
      tagCounts: [{ tag: "HELPFUL", count: 1 }],
    })
  })

  it("normalizes corrupt counters and counts duplicate tags once", () => {
    const result = addReviewToSummary(
      {
        averageRating: Number.NaN,
        reviewCount: Number.POSITIVE_INFINITY,
        ratingCounts: {
          oneStar: -2,
          twoStars: 1.9,
          threeStars: Number.NaN,
          fourStars: 0,
          fiveStars: 0,
        },
        tagCounts: [
          { tag: "HELPFUL", count: 2 },
          { tag: "HELPFUL", count: 3 },
          { tag: "RESPONSIVE", count: Number.NaN },
        ],
      },
      5,
      ["HELPFUL", "HELPFUL"],
    )

    expect(result).toEqual({
      averageRating: 5,
      reviewCount: 1,
      ratingCounts: {
        oneStar: 0,
        twoStars: 1,
        threeStars: 0,
        fourStars: 0,
        fiveStars: 1,
      },
      tagCounts: [
        { tag: "HELPFUL", count: 6 },
        { tag: "RESPONSIVE", count: 0 },
      ],
    })
    expect(Number.isFinite(result.averageRating)).toBe(true)
  })

  it.each([Number.NaN, 0, 1.5, 6])(
    "does not increment the summary for invalid rating %s",
    (rating) => {
      const result = addReviewToSummary(
        {
          averageRating: 4,
          reviewCount: 2,
          ratingCounts: {
            oneStar: 0,
            twoStars: 0,
            threeStars: 0,
            fourStars: 2,
            fiveStars: 0,
          },
          tagCounts: [{ tag: "HELPFUL", count: 2 }],
        },
        rating,
        ["HELPFUL"],
      )

      expect(result).toEqual({
        averageRating: 4,
        reviewCount: 2,
        ratingCounts: {
          oneStar: 0,
          twoStars: 0,
          threeStars: 0,
          fourStars: 2,
          fiveStars: 0,
        },
        tagCounts: [{ tag: "HELPFUL", count: 2 }],
      })
    },
  )
})
