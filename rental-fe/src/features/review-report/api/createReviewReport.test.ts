import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { createReviewReport } from "./createReviewReport"

const report = {
  _id: "report-1",
  reviewId: "review-1",
  listerProfileId: "profile-1",
  reviewOwnerId: "owner-1",
  reportedBy: "reporter-1",
  reason: "SPAM",
  note: "Repeated message",
  status: "OPEN",
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  actionTakenBy: null,
  actionTakenAt: null,
  actionReason: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}

describe("createReviewReport", () => {
  it("normalizes input and validates the response", async () => {
    server.use(
      http.post("/api/v1/review-reports", async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          reviewId: "review-1",
          reason: "SPAM",
          note: "Repeated message",
        })
        return HttpResponse.json({ success: true, data: report })
      }),
    )
    await expect(
      createReviewReport({
        reviewId: "  review-1  ",
        reason: "SPAM",
        note: "  Repeated message  ",
      }),
    ).resolves.toEqual(report)
  })

  it("rejects empty ids and invalid runtime reasons before requesting", async () => {
    const request = vi.fn()
    server.use(http.post("/api/v1/review-reports", request))
    await expect(
      createReviewReport({ reviewId: " ", reason: "SPAM" }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    await expect(
      createReviewReport({
        reviewId: "review-1",
        reason: "INVALID" as "SPAM",
      }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects malformed success responses", async () => {
    server.use(
      http.post("/api/v1/review-reports", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )
    await expect(
      createReviewReport({ reviewId: "review-1", reason: "SPAM" }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
