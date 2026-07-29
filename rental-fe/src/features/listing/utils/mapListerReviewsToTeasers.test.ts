import { describe, expect, it } from "vitest"

import type { ListerReview } from "@/features/lister-review/api"

import { mapListerReviewsToTeasers } from "./mapListerReviewsToTeasers"

function createReview(
  overrides: Partial<ListerReview> & Pick<ListerReview, "_id">,
): ListerReview {
  return {
    reviewerId: "user-1",
    listerProfileId: "agent-1",
    relatedListingId: null,
    relatedBuildingId: null,
    rating: 5,
    tags: [],
    comment: null,
    interaction: {
      isVerified: true,
      verifiedBy: "CONTACT_CLICK",
      contactEventId: "event-1",
      verifiedAt: "2026-01-01T00:00:00.000Z",
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("mapListerReviewsToTeasers", () => {
  it("maps reviews with comments to teasers", () => {
    expect(
      mapListerReviewsToTeasers([
        createReview({
          _id: "r1",
          comment: "  Great host.  ",
          reviewer: {
            userId: "u1",
            name: "Alex Rivera",
            displayName: "Alex",
            profilePhoto: null,
            isVerified: true,
          },
        }),
      ]),
    ).toEqual([
      {
        id: "r1",
        displayName: "Alex",
        text: "Great host.",
        photo: null,
        colorKey: "u1",
      },
    ])
  })

  it("falls back to name then Anonymous for the display name", () => {
    expect(
      mapListerReviewsToTeasers([
        createReview({
          _id: "named",
          comment: "Clear answers.",
          reviewer: {
            userId: "u2",
            name: "Mina Chen",
            displayName: null,
            profilePhoto: null,
            isVerified: false,
          },
        }),
        createReview({
          _id: "anon",
          comment: "Smooth process.",
        }),
      ]),
    ).toEqual([
      {
        id: "named",
        displayName: "Mina Chen",
        text: "Clear answers.",
        photo: null,
        colorKey: "u2",
      },
      {
        id: "anon",
        displayName: "Anonymous",
        text: "Smooth process.",
        photo: null,
        colorKey: "user-1",
      },
    ])
  })

  it("uses a rating line for rating-only reviews", () => {
    expect(
      mapListerReviewsToTeasers([
        createReview({ _id: "blank", comment: "   ", rating: 4 }),
        createReview({ _id: "none", comment: null, rating: 5 }),
      ]),
    ).toEqual([
      {
        id: "blank",
        displayName: "Anonymous",
        text: "Rated 4 out of 5",
        photo: null,
        colorKey: "user-1",
      },
      {
        id: "none",
        displayName: "Anonymous",
        text: "Rated 5 out of 5",
        photo: null,
        colorKey: "user-1",
      },
    ])
  })

  it("clamps and rounds out-of-range ratings", () => {
    expect(
      mapListerReviewsToTeasers([
        createReview({ _id: "low", comment: null, rating: -2 }),
        createReview({ _id: "high", comment: null, rating: 9 }),
        createReview({ _id: "fraction", comment: null, rating: 3.6 }),
      ]).map((teaser) => teaser.text),
    ).toEqual(["Rated 1 out of 5", "Rated 5 out of 5", "Rated 4 out of 5"])
  })

  it("keeps the first entry when the same review appears twice", () => {
    expect(
      mapListerReviewsToTeasers([
        createReview({ _id: "dup", comment: "Original." }),
        createReview({ _id: "dup", comment: "Duplicate." }),
      ]).map((teaser) => teaser.text),
    ).toEqual(["Original."])
  })

  it("skips reviews with neither a comment nor a usable rating", () => {
    expect(
      mapListerReviewsToTeasers([
        createReview({
          _id: "broken",
          comment: null,
          rating: Number.NaN,
        }),
      ]),
    ).toEqual([])
  })
})
