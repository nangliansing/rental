import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { updateAdminReviewReportStatus } from "./updateAdminReviewReportStatus"

describe("updateAdminReviewReportStatus", () => {
  it("normalizes input and validates the updated report", async () => {
    server.use(
      http.patch(
        "/api/v1/admin/review-reports/:id/status",
        async ({ params, request }) => {
          expect(params.id).toBe("review report / 1")
          await expect(request.json()).resolves.toEqual({
            status: "DISMISSED",
            reviewNote: "Not a violation",
          })
          return HttpResponse.json({
            success: true,
            data: {
              _id: "review report / 1",
              status: "DISMISSED",
              reviewNote: "Not a violation",
            },
          })
        },
      ),
    )

    await expect(
      updateAdminReviewReportStatus({
        reviewReportId: "  review report / 1  ",
        status: "DISMISSED",
        reviewNote: "  Not a violation  ",
      }),
    ).resolves.toMatchObject({
      _id: "review report / 1",
      status: "DISMISSED",
      reviewNote: "Not a violation",
    })
  })

  it("rejects empty ids and invalid runtime statuses before requesting", async () => {
    const request = vi.fn()
    server.use(http.patch("/api/v1/admin/review-reports/:id/status", request))

    await expect(
      updateAdminReviewReportStatus({
        reviewReportId: " ",
        status: "REVIEWED",
      }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    await expect(
      updateAdminReviewReportStatus({
        reviewReportId: "report-1",
        status: "OPEN" as "REVIEWED",
      }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects malformed response data", async () => {
    server.use(
      http.patch("/api/v1/admin/review-reports/:id/status", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )

    await expect(
      updateAdminReviewReportStatus({
        reviewReportId: "report-1",
        status: "REVIEWED",
      }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_ADMIN_REVIEW_REPORT_RESPONSE",
    })
  })
})
