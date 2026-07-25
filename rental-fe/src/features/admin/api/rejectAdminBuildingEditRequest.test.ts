import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { rejectAdminBuildingEditRequest } from "./rejectAdminBuildingEditRequest"

const snapshot = {
  name: "Building",
  buildingType: "CONDO",
  facilities: [],
  security: [],
  address: "Bangkok",
  location: { type: "Point", coordinates: [100.5, 13.7] },
}

const responseRequest = {
  _id: "request / 1",
  status: "REJECTED",
  buildingId: "building-1",
  requestedBy: {
    _id: "user-1",
    name: "Owner",
    email: "owner@example.com",
    role: "USER",
    status: "ACTIVE",
  },
  originalBuilding: snapshot,
  proposedBuilding: snapshot,
  reviewReason: "Incorrect address",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
}

describe("rejectAdminBuildingEditRequest", () => {
  it("trims input, encodes the id, and parses the response", async () => {
    server.use(
      http.patch(
        "/api/v1/admin/building-edit-requests/:id/reject",
        async ({ params, request }) => {
          expect(params.id).toBe("request / 1")
          await expect(request.json()).resolves.toEqual({
            reviewReason: "Incorrect address",
          })
          return HttpResponse.json({ success: true, data: responseRequest })
        },
      ),
    )

    await expect(
      rejectAdminBuildingEditRequest({
        buildingEditRequestId: "  request / 1  ",
        reviewReason: "  Incorrect address  ",
      }),
    ).resolves.toMatchObject({
      _id: "request / 1",
      status: "REJECTED",
      buildingId: "building-1",
    })
  })

  it("rejects empty input without sending a request", async () => {
    const request = vi.fn()
    server.use(
      http.patch("/api/v1/admin/building-edit-requests/:id/reject", request),
    )

    await expect(
      rejectAdminBuildingEditRequest({
        buildingEditRequestId: " ",
        reviewReason: "Reason",
      }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    await expect(
      rejectAdminBuildingEditRequest({
        buildingEditRequestId: "request-1",
        reviewReason: " ",
      }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    expect(request).not.toHaveBeenCalled()
  })

  it("rejects a malformed success response", async () => {
    server.use(
      http.patch("/api/v1/admin/building-edit-requests/:id/reject", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )

    await expect(
      rejectAdminBuildingEditRequest({
        buildingEditRequestId: "request-1",
        reviewReason: "Reason",
      }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
