import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { createListerReview } from "./createListerReview"

const review = {
  _id: "review-1",
  reviewerId: "user-1",
  listerProfileId: "profile / 1",
  rating: 5,
  tags: ["HELPFUL"],
  comment: "Excellent",
  interaction: {},
  moderation: {},
  visibility: {},
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}
const reviewSummary = {
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
}

describe("createListerReview", () => {
  it("normalizes input, encodes the profile id, and parses the response", async () => {
    server.use(
      http.post("/api/v1/lister-reviews/:id", async ({ params, request }) => {
        expect(params.id).toBe("profile / 1")
        await expect(request.json()).resolves.toEqual({
          rating: 5,
          tags: ["HELPFUL"],
          comment: "Excellent",
          relatedListingId: "listing-1",
          relatedBuildingId: null,
        })
        return HttpResponse.json({
          success: true,
          data: { review, reviewSummary },
        })
      }),
    )

    await expect(
      createListerReview({
        listerProfileId: "  profile / 1  ",
        rating: 5,
        tags: ["HELPFUL"],
        comment: "  Excellent  ",
        relatedListingId: "  listing-1  ",
      }),
    ).resolves.toMatchObject({ review: { _id: "review-1" }, reviewSummary })
  })

  it("rejects an empty profile id or invalid rating before requesting", async () => {
    const request = vi.fn()
    server.use(http.post("/api/v1/lister-reviews/:id", request))

    await expect(
      createListerReview({ listerProfileId: " ", rating: 5 }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    await expect(
      createListerReview({ listerProfileId: "profile-1", rating: 6 }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects malformed success responses", async () => {
    server.use(
      http.post("/api/v1/lister-reviews/:id", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )

    await expect(
      createListerReview({ listerProfileId: "profile-1", rating: 4 }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
