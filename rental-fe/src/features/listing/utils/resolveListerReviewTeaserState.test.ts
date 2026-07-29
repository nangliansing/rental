import { describe, expect, it } from "vitest"

import type { ListerReview } from "@/features/lister-review/api"
import type { SearchListerReviewsResponse } from "@/features/lister-review/api/searchListerReviews"

import {
  resolveListerReviewTeaserState,
  shouldFetchListerReviewTeasers,
} from "./resolveListerReviewTeaserState"

function createReview(overrides: Partial<ListerReview> = {}): ListerReview {
  return {
    _id: "review-1",
    reviewerId: "user-1",
    listerProfileId: "agent-1",
    relatedListingId: null,
    relatedBuildingId: null,
    rating: 5,
    tags: [],
    comment: "Great lister.",
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
    ...overrides,
  }
}

function createResponse(
  data: Partial<SearchListerReviewsResponse["data"]> = {},
  total = 0,
): SearchListerReviewsResponse {
  return {
    success: true,
    data: { myReview: null, reviews: [], ...data },
    pagination: { page: 1, limit: 3, total },
  }
}

describe("shouldFetchListerReviewTeasers", () => {
  it("fetches only with a profile id, a non-zero count, and enabled", () => {
    expect(
      shouldFetchListerReviewTeasers({
        listerProfileId: "agent-1",
        reviewCount: 2,
      }),
    ).toBe(true)
    expect(
      shouldFetchListerReviewTeasers({
        listerProfileId: "agent-1",
        reviewCount: 0,
      }),
    ).toBe(false)
    expect(
      shouldFetchListerReviewTeasers({
        listerProfileId: "  ",
        reviewCount: 2,
      }),
    ).toBe(false)
    expect(
      shouldFetchListerReviewTeasers({
        listerProfileId: "agent-1",
        reviewCount: 2,
        enabled: false,
      }),
    ).toBe(false)
  })

  it("fetches when the count is unknown", () => {
    expect(
      shouldFetchListerReviewTeasers({
        listerProfileId: "agent-1",
        reviewCount: undefined,
      }),
    ).toBe(true)
  })
})

describe("resolveListerReviewTeaserState", () => {
  it("shows the plain empty prompt without a profile or with a zero count", () => {
    expect(resolveListerReviewTeaserState({})).toEqual({
      kind: "empty",
      hasReviews: false,
    })
    expect(
      resolveListerReviewTeaserState({
        listerProfileId: "agent-1",
        reviewCount: 0,
      }),
    ).toEqual({ kind: "empty", hasReviews: false })
  })

  it("holds the skeleton until data arrives", () => {
    expect(
      resolveListerReviewTeaserState({
        listerProfileId: "agent-1",
        reviewCount: 3,
      }),
    ).toEqual({ kind: "skeleton" })
  })

  it("shows the error row only when the request failed with no data", () => {
    expect(
      resolveListerReviewTeaserState({
        listerProfileId: "agent-1",
        reviewCount: 3,
        isError: true,
      }),
    ).toEqual({ kind: "error" })

    expect(
      resolveListerReviewTeaserState({
        listerProfileId: "agent-1",
        reviewCount: 3,
        isError: true,
        response: createResponse({ reviews: [createReview()] }, 1),
      }),
    ).toMatchObject({ kind: "rotation" })
  })

  it("includes the viewer's own review, which the API returns separately", () => {
    const state = resolveListerReviewTeaserState({
      listerProfileId: "agent-1",
      reviewCount: 1,
      response: createResponse({ myReview: createReview({ _id: "mine" }) }, 0),
    })

    expect(state).toMatchObject({ kind: "rotation" })
    expect(state.kind === "rotation" && state.teasers.map(({ id }) => id)).toEqual(
      ["mine"],
    )
  })

  it("puts other people's reviews before the viewer's own", () => {
    const state = resolveListerReviewTeaserState({
      listerProfileId: "agent-1",
      reviewCount: 2,
      response: createResponse(
        {
          myReview: createReview({ _id: "mine" }),
          reviews: [createReview({ _id: "theirs" })],
        },
        1,
      ),
    })

    expect(state.kind === "rotation" && state.teasers.map(({ id }) => id)).toEqual(
      ["theirs", "mine"],
    )
  })

  it("keeps rating-only reviews as teasers", () => {
    const state = resolveListerReviewTeaserState({
      listerProfileId: "agent-1",
      reviewCount: 1,
      response: createResponse(
        { reviews: [createReview({ comment: null, rating: 4 })] },
        1,
      ),
    })

    expect(state.kind === "rotation" && state.teasers[0].text).toBe(
      "Rated 4 out of 5",
    )
  })

  it("says See all reviews when reviews exist but none can be shown", () => {
    expect(
      resolveListerReviewTeaserState({
        listerProfileId: "agent-1",
        reviewCount: 1,
        response: createResponse(
          { reviews: [createReview({ visibility: { isCollapsed: true, collapsedBy: null, collapsedAt: null, collapseReason: null } })] },
          1,
        ),
      }),
    ).toEqual({ kind: "empty", hasReviews: true })
  })

  it("trusts the summary count over pagination total, which excludes the viewer", () => {
    expect(
      resolveListerReviewTeaserState({
        listerProfileId: "agent-1",
        reviewCount: 1,
        response: createResponse({}, 0),
      }),
    ).toEqual({ kind: "empty", hasReviews: true })
  })

  it("survives malformed payloads", () => {
    expect(
      resolveListerReviewTeaserState({
        listerProfileId: "agent-1",
        reviewCount: Number.NaN,
        response: {
          success: true,
          data: undefined,
          pagination: undefined,
        } as unknown as SearchListerReviewsResponse,
      }),
    ).toEqual({ kind: "empty", hasReviews: false })
  })
})
