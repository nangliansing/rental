import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import { approveAdminBuildingEditRequest } from "./approveAdminBuildingEditRequest"

const snapshot = {
  name: "Updated Building",
  buildingType: "CONDO",
  facilities: ["POOL"],
  security: ["CCTV"],
  address: "Bangkok",
  location: { type: "Point", coordinates: [100.5, 13.7] },
}

const request = {
  _id: "request / 1",
  status: "APPROVED",
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
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
}

const building = {
  _id: "building-1",
  ...snapshot,
  isActive: true,
  minRent: 10_000,
  maxRent: 20_000,
}

describe("approveAdminBuildingEditRequest", () => {
  it("trims and encodes the id and parses request plus building", async () => {
    server.use(
      http.patch(
        "/api/v1/admin/building-edit-requests/:id/approve",
        async ({ params, request: httpRequest }) => {
          expect(params.id).toBe("request / 1")
          await expect(httpRequest.json()).resolves.toEqual({
            reviewReason: "Verified",
          })
          return HttpResponse.json({
            success: true,
            data: { request, building },
          })
        },
      ),
    )

    await expect(
      approveAdminBuildingEditRequest({
        buildingEditRequestId: "  request / 1  ",
        reviewReason: "  Verified  ",
      }),
    ).resolves.toMatchObject({
      request: { _id: "request / 1", status: "APPROVED" },
      building: { _id: "building-1", name: "Updated Building" },
    })
  })

  it("rejects an empty id without sending a request", async () => {
    const handler = vi.fn()
    server.use(
      http.patch("/api/v1/admin/building-edit-requests/:id/approve", handler),
    )

    await expect(
      approveAdminBuildingEditRequest({
        buildingEditRequestId: " ",
        reviewReason: "Verified",
      }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    expect(handler).not.toHaveBeenCalled()
  })

  it("rejects a malformed success response", async () => {
    server.use(
      http.patch("/api/v1/admin/building-edit-requests/:id/approve", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )

    await expect(
      approveAdminBuildingEditRequest({ buildingEditRequestId: "request-1" }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
