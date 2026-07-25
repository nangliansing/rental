import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { toggleListerReviewCollapse } from "./toggleListerReviewCollapse"

const review = {
  _id: "review / 1",
  reviewerId: "user-1",
  listerProfileId: "profile-1",
  rating: 4,
  tags: [],
  interaction: {},
  moderation: {},
  visibility: {
    isCollapsed: true,
    collapsedBy: "owner-1",
    collapsedAt: "2026-07-22T00:00:00.000Z",
    collapseReason: null,
  },
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}

describe("toggleListerReviewCollapse", () => {
  it("trims and encodes the review id and parses the response", async () => {
    server.use(
      http.patch(
        "/api/v1/lister-reviews/:id/toggle-collapse",
        ({ params }) => {
          expect(params.id).toBe("review / 1")
          return HttpResponse.json({ success: true, data: review })
        },
      ),
    )
    await expect(
      toggleListerReviewCollapse({ reviewId: "  review / 1  " }),
    ).resolves.toMatchObject({ _id: "review / 1", visibility: { isCollapsed: true } })
  })

  it("rejects an empty id without requesting", async () => {
    const request = vi.fn()
    server.use(
      http.patch("/api/v1/lister-reviews/:id/toggle-collapse", request),
    )
    await expect(
      toggleListerReviewCollapse({ reviewId: " " }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects malformed success responses", async () => {
    server.use(
      http.patch("/api/v1/lister-reviews/:id/toggle-collapse", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )
    await expect(
      toggleListerReviewCollapse({ reviewId: "review-1" }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
