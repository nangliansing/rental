import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import type { ListerReview } from "./createListerReview"
import {
  addReviewToSummary,
  listerReviewRefetchQueryKeys,
  patchReviewInQueries,
  patchReviewSummaryInQueries,
  removeReviewFromListerReviewData,
  removeReviewFromSummary,
  replaceReviewInListerReviewData,
  replaceReviewInSummary,
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

const otherReview = {
  ...review,
  _id: "review-2",
  rating: 3,
  comment: "Okay",
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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

describe("listerReviewRefetchQueryKeys", () => {
  it("covers both the infinite lists and the teaser caches", () => {
    expect(listerReviewRefetchQueryKeys("profile-1")).toEqual([
      queryKeys.listerReviews.byLister("profile-1"),
      queryKeys.listerReviewTeasers.byLister("profile-1"),
    ])
  })
})

describe("removeReviewFromListerReviewData", () => {
  it("removes a review and fixes pagination on infinite data", () => {
    expect(
      removeReviewFromListerReviewData(infiniteData, "review-1"),
    ).toMatchObject({
      pages: [{ data: { myReview: null, reviews: [] }, pagination: { total: 0 } }],
    })
  })

  it("removes only the targeted review across multi-page data", () => {
    const current: ListerReviewsCacheData = {
      pageParams: [1, 2],
      pages: [
        {
          success: true,
          data: { myReview: null, reviews: [review, otherReview] },
          pagination: { page: 1, limit: 2, total: 3 },
        },
        {
          success: true,
          data: { myReview: null, reviews: [otherReview] },
          pagination: { page: 2, limit: 2, total: 3 },
        },
      ],
    }

    const result = removeReviewFromListerReviewData(current, "review-1")

    expect(result?.pages.map((page) => page.data.reviews.map((item) => item._id))).toEqual([
      ["review-2"],
      ["review-2"],
    ])
    expect(result?.pages.map((page) => page.pagination.total)).toEqual([2, 2])
  })

  it("clears myReview even when the review is not present in reviews", () => {
    const current: ListerReviewsCacheData = {
      pageParams: [1],
      pages: [
        {
          success: true,
          data: { myReview: review, reviews: [otherReview] },
          pagination: { page: 1, limit: 10, total: 1 },
        },
      ],
    }

    const result = removeReviewFromListerReviewData(current, "review-1")

    expect(result?.pages[0].data.myReview).toBeNull()
    expect(result?.pages[0].data.reviews.map((item) => item._id)).toEqual([
      "review-2",
    ])
    expect(result?.pages[0].pagination.total).toBe(1)
  })

  it("preserves sibling review references", () => {
    const keep = otherReview
    const current: ListerReviewsCacheData = {
      pageParams: [1],
      pages: [
        {
          success: true,
          data: { myReview: null, reviews: [review, keep] },
          pagination: { page: 1, limit: 10, total: 2 },
        },
      ],
    }

    const result = removeReviewFromListerReviewData(current, "review-1")

    expect(result?.pages[0].data.reviews[0]).toBe(keep)
  })

  it("leaves non-infinite caches untouched instead of throwing", () => {
    expect(removeReviewFromListerReviewData(flatPage, "review-1")).toBe(flatPage)
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
  })

  it("leaves cache values unchanged when nested access throws", () => {
    const throwingPage = {
      get data() {
        throw new Error("data failed")
      },
      pagination: { total: 1 },
    }
    const current = {
      pageParams: [1],
      pages: [throwingPage],
    } as unknown as ListerReviewsCacheData

    expect(removeReviewFromListerReviewData(current, "review-1")).toBe(current)
  })
})

describe("setMyReviewInListerReviewData", () => {
  it("writes myReview on every loaded page", () => {
    const nextReview = { ...review, comment: "Updated" }
    const current: ListerReviewsCacheData = {
      pageParams: [1, 2],
      pages: [
        {
          success: true,
          data: { myReview: null, reviews: [] },
          pagination: { page: 1, limit: 10, total: 0 },
        },
        {
          success: true,
          data: { myReview: null, reviews: [] },
          pagination: { page: 2, limit: 10, total: 0 },
        },
      ],
    }

    const result = setMyReviewInListerReviewData(current, nextReview)

    expect(result?.pages.every((page) => page.data.myReview === nextReview)).toBe(
      true,
    )
  })

  it("leaves non-infinite caches untouched instead of throwing", () => {
    expect(setMyReviewInListerReviewData(flatPage, review)).toBe(flatPage)
  })

  it.each([
    { pages: [{ data: null }] },
    { pages: [{ data: { reviews: null }, pagination: { total: 1 } }] },
  ])("leaves malformed infinite data untouched: %#", (malformed) => {
    const current = malformed as unknown as ListerReviewsCacheData

    expect(setMyReviewInListerReviewData(current, review)).toBe(current)
  })
})

describe("replaceReviewInListerReviewData", () => {
  it("replaces the optimistic review in reviews and myReview", () => {
    const optimistic = { ...review, _id: "optimistic-review", comment: "Draft" }
    const serverReview = { ...review, _id: "review-1", comment: "Final" }
    const current: ListerReviewsCacheData = {
      pageParams: [1],
      pages: [
        {
          success: true,
          data: { myReview: optimistic, reviews: [optimistic, otherReview] },
          pagination: { page: 1, limit: 10, total: 2 },
        },
      ],
    }

    const result = replaceReviewInListerReviewData(
      current,
      "optimistic-review",
      serverReview,
    )

    expect(result?.pages[0].data.myReview).toBe(serverReview)
    expect(result?.pages[0].data.reviews[0]).toBe(serverReview)
    expect(result?.pages[0].data.reviews[1]).toBe(otherReview)
  })

  it("leaves non-infinite caches untouched instead of throwing", () => {
    expect(replaceReviewInListerReviewData(flatPage, "review-1", review)).toBe(
      flatPage,
    )
  })

  it.each([
    { pages: [{ data: null }] },
    { pages: [{ data: { reviews: null }, pagination: { total: 1 } }] },
  ])("leaves malformed infinite data untouched: %#", (malformed) => {
    const current = malformed as unknown as ListerReviewsCacheData

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

describe("replaceReviewInSummary", () => {
  it("moves rating and tag counts when a review is edited", () => {
    const current = {
      averageRating: 4,
      reviewCount: 1,
      ratingCounts: {
        oneStar: 0,
        twoStars: 0,
        threeStars: 0,
        fourStars: 1,
        fiveStars: 0,
      },
      tagCounts: [{ tag: "RESPONSIVE" as const, count: 1 }],
    }

    expect(
      replaceReviewInSummary(
        current,
        { rating: 4, tags: ["RESPONSIVE"] },
        { rating: 5, tags: ["HELPFUL"] },
      ),
    ).toEqual({
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

  it("ignores invalid ratings instead of corrupting counters", () => {
    const current = {
      averageRating: 4,
      reviewCount: 2,
      ratingCounts: {
        oneStar: 0,
        twoStars: 0,
        threeStars: 0,
        fourStars: 2,
        fiveStars: 0,
      },
      tagCounts: [],
    }

    expect(
      replaceReviewInSummary(
        current,
        { rating: Number.NaN, tags: [] },
        { rating: 6, tags: [] },
      ),
    ).toMatchObject({
      averageRating: 4,
      reviewCount: 2,
      ratingCounts: {
        fourStars: 2,
      },
    })
  })
})

describe("removeReviewFromSummary", () => {
  it("decrements counters and recomputes the average", () => {
    const current = {
      averageRating: 4,
      reviewCount: 2,
      ratingCounts: {
        oneStar: 0,
        twoStars: 0,
        threeStars: 0,
        fourStars: 1,
        fiveStars: 1,
      },
      tagCounts: [
        { tag: "RESPONSIVE" as const, count: 1 },
        { tag: "HELPFUL" as const, count: 1 },
      ],
    }

    expect(removeReviewFromSummary(current, { rating: 5, tags: ["HELPFUL"] })).toEqual({
      averageRating: 3,
      reviewCount: 1,
      ratingCounts: {
        oneStar: 0,
        twoStars: 0,
        threeStars: 0,
        fourStars: 1,
        fiveStars: 0,
      },
      tagCounts: [{ tag: "RESPONSIVE", count: 1 }],
    })
  })

  it("returns a zeroed summary when the last review is removed", () => {
    expect(
      removeReviewFromSummary(
        {
          averageRating: 5,
          reviewCount: 1,
          ratingCounts: {
            oneStar: 0,
            twoStars: 0,
            threeStars: 0,
            fourStars: 0,
            fiveStars: 1,
          },
          tagCounts: [{ tag: "HELPFUL" as const, count: 1 }],
        },
        { rating: 5, tags: ["HELPFUL"] },
      ),
    ).toEqual({
      averageRating: 0,
      reviewCount: 0,
      ratingCounts: {
        oneStar: 0,
        twoStars: 0,
        threeStars: 0,
        fourStars: 0,
        fiveStars: 0,
      },
      tagCounts: [],
    })
  })
})

describe("patchReviewInQueries", () => {
  it("patches nested review records without touching unrelated caches", () => {
    const queryClient = createQueryClient()
    const reportKey = queryKeys.admin.reviewReports.detail("report-1")
    const unrelatedKey = queryKeys.listings.publicDetail("listing-1", "user-1")
    const patched = { ...review, comment: "Updated" }
    queryClient.setQueryData(reportKey, { _id: "report-1", review })
    queryClient.setQueryData(unrelatedKey, {
      listing: { _id: "listing-1", agentProfile: { _id: "profile-1" } },
    })

    patchReviewInQueries(queryClient, [reportKey, unrelatedKey], review._id, patched)

    expect(queryClient.getQueryData(reportKey)).toMatchObject({
      review: { _id: "review-1", comment: "Updated" },
    })
    expect(queryClient.getQueryData(unrelatedKey)).toEqual({
      listing: { _id: "listing-1", agentProfile: { _id: "profile-1" } },
    })
  })
})

describe("patchReviewSummaryInQueries", () => {
  it("writes reviewSummary onto every matching lister profile projection", () => {
    const queryClient = createQueryClient()
    const profileKey = queryKeys.profiles.detail("profile-1")
    const agentKey = queryKeys.agentListings.list({
      agentProfileId: "profile-1",
      sort: "latest",
      limit: 20,
    })
    const nextSummary = {
      averageRating: 4.5,
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
    queryClient.setQueryData(profileKey, {
      _id: "profile-1",
      reviewSummary: { reviewCount: 1 },
    })
    queryClient.setQueryData(agentKey, {
      pages: [
        {
          data: {
            agentProfile: {
              _id: "profile-1",
              displayName: "Agent",
              reviewSummary: { reviewCount: 1 },
            },
            listings: [],
          },
        },
      ],
    })

    patchReviewSummaryInQueries(
      queryClient,
      [profileKey, agentKey],
      "profile-1",
      nextSummary,
    )

    expect(queryClient.getQueryData(profileKey)).toMatchObject({
      reviewSummary: nextSummary,
    })
    expect(queryClient.getQueryData(agentKey)).toMatchObject({
      pages: [{ data: { agentProfile: { reviewSummary: nextSummary } } }],
    })
  })
})
