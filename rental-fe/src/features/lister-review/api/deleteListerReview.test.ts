import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { deleteListerReview } from "./deleteListerReview"

const review = {
  _id: "review / 1",
  reviewerId: "user-1",
  listerProfileId: "profile-1",
  rating: 4,
  tags: [],
  interaction: {},
  moderation: {},
  visibility: {},
  isDeleted: true,
  deletedAt: "2026-07-22T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}
const reviewSummary = {
  averageRating: 0,
  reviewCount: 0,
  ratingCounts: { oneStar: 0, twoStars: 0, threeStars: 0, fourStars: 0, fiveStars: 0 },
  tagCounts: [],
}

describe("deleteListerReview", () => {
  it("trims and encodes the review id and parses the response", async () => {
    server.use(
      http.delete("/api/v1/lister-reviews/:id", ({ params }) => {
        expect(params.id).toBe("review / 1")
        return HttpResponse.json({ success: true, data: { review, reviewSummary } })
      }),
    )
    await expect(
      deleteListerReview({ reviewId: "  review / 1  " }),
    ).resolves.toMatchObject({ review: { isDeleted: true }, reviewSummary })
  })

  it("rejects an empty id without requesting", async () => {
    const request = vi.fn()
    server.use(http.delete("/api/v1/lister-reviews/:id", request))
    await expect(deleteListerReview({ reviewId: " " })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects malformed success responses", async () => {
    server.use(
      http.delete("/api/v1/lister-reviews/:id", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )
    await expect(
      deleteListerReview({ reviewId: "review-1" }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
