import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { createReport } from "./createReport"

const report = {
  _id: "report-1",
  targetType: "LISTING",
  listingId: "listing-1",
  reportedBy: "reporter-1",
  reason: "WRONG_PRICE",
  note: "The displayed price is outdated.",
  status: "OPEN",
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}

describe("createReport", () => {
  it("normalizes input and validates the response", async () => {
    server.use(
      http.post("/api/v1/reports", async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          listingId: "listing-1",
          reason: "WRONG_PRICE",
          note: "The displayed price is outdated.",
        })
        return HttpResponse.json({ success: true, data: report })
      }),
    )

    await expect(
      createReport({
        listingId: "  listing-1  ",
        reason: "WRONG_PRICE",
        note: "  The displayed price is outdated.  ",
      }),
    ).resolves.toEqual(report)
  })

  it("rejects empty ids and invalid runtime reasons before requesting", async () => {
    const request = vi.fn()
    server.use(http.post("/api/v1/reports", request))

    await expect(
      createReport({ listingId: " ", reason: "WRONG_PRICE" }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    await expect(
      createReport({
        listingId: "listing-1",
        reason: "INVALID" as "WRONG_PRICE",
      }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects malformed success responses", async () => {
    server.use(
      http.post("/api/v1/reports", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )

    await expect(
      createReport({ listingId: "listing-1", reason: "WRONG_PRICE" }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
