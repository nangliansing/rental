import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { updateAdminReportStatus } from "./updateAdminReportStatus"

const report = {
  _id: "report / 1",
  targetType: "LISTING",
  listingId: "listing-1",
  reportedBy: {
    _id: "user-1",
    name: "Reporter",
    email: "reporter@example.com",
    role: "USER",
    status: "ACTIVE",
  },
  reason: "WRONG_PRICE",
  status: "DISMISSED",
  reviewNote: "Not a violation",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
}

describe("updateAdminReportStatus", () => {
  it("trims and encodes input and parses the updated report", async () => {
    server.use(
      http.patch(
        "/api/v1/admin/reports/:id/status",
        async ({ params, request }) => {
          expect(params.id).toBe("report / 1")
          await expect(request.json()).resolves.toEqual({
            status: "DISMISSED",
            reviewNote: "Not a violation",
          })
          return HttpResponse.json({ success: true, data: report })
        },
      ),
    )

    await expect(
      updateAdminReportStatus({
        reportId: "  report / 1  ",
        status: "DISMISSED",
        reviewNote: "  Not a violation  ",
      }),
    ).resolves.toMatchObject({
      _id: "report / 1",
      status: "DISMISSED",
      reviewNote: "Not a violation",
    })
  })

  it("rejects empty ids and invalid runtime statuses before requesting", async () => {
    const request = vi.fn()
    server.use(http.patch("/api/v1/admin/reports/:id/status", request))

    await expect(
      updateAdminReportStatus({ reportId: " ", status: "REVIEWED" }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    await expect(
      updateAdminReportStatus({
        reportId: "report-1",
        status: "OPEN" as "REVIEWED",
      }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects a malformed success response", async () => {
    server.use(
      http.patch("/api/v1/admin/reports/:id/status", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )

    await expect(
      updateAdminReportStatus({ reportId: "report-1", status: "REVIEWED" }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
