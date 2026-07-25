import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { updateListerReview } from "./updateListerReview"

const review = {
  _id: "review / 1",
  reviewerId: "user-1",
  listerProfileId: "profile-1",
  rating: 3,
  tags: ["HELPFUL"],
  comment: "Updated",
  interaction: {},
  moderation: {},
  visibility: {},
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}
const reviewSummary = {
  averageRating: 3,
  reviewCount: 1,
  ratingCounts: { oneStar: 0, twoStars: 0, threeStars: 1, fourStars: 0, fiveStars: 0 },
  tagCounts: [{ tag: "HELPFUL", count: 1 }],
}

describe("updateListerReview", () => {
  it("normalizes input, encodes the review id, and parses the response", async () => {
    server.use(
      http.patch("/api/v1/lister-reviews/:id", async ({ params, request }) => {
        expect(params.id).toBe("review / 1")
        await expect(request.json()).resolves.toEqual({
          rating: 3,
          tags: ["HELPFUL"],
          comment: "Updated",
          relatedListingId: null,
        })
        return HttpResponse.json({ success: true, data: { review, reviewSummary } })
      }),
    )

    await expect(
      updateListerReview({
        reviewId: "  review / 1  ",
        rating: 3,
        tags: ["HELPFUL"],
        comment: "  Updated  ",
        relatedListingId: " ",
      }),
    ).resolves.toMatchObject({ review: { _id: "review / 1" }, reviewSummary })
  })

  it("rejects empty ids and invalid ratings before requesting", async () => {
    const request = vi.fn()
    server.use(http.patch("/api/v1/lister-reviews/:id", request))

    await expect(updateListerReview({ reviewId: " " })).rejects.toMatchObject({ status: 422 })
    await expect(
      updateListerReview({ reviewId: "review-1", rating: 0 }),
    ).rejects.toMatchObject({ status: 422 })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects malformed success responses", async () => {
    server.use(
      http.patch("/api/v1/lister-reviews/:id", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )
    await expect(
      updateListerReview({ reviewId: "review-1", rating: 4 }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
