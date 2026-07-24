import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import {
  createBuildingEditRequest,
  type BuildingEditRequestSnapshot,
} from "./createBuildingEditRequest"

const building: BuildingEditRequestSnapshot = {
  name: "Riverside Residence",
  buildingType: "APARTMENT",
  facilities: ["WIFI"],
  security: ["CCTV"],
  location: { type: "Point", coordinates: [100.5, 13.7] },
  address: "Bangkok",
}
const request = {
  _id: "request-1",
  status: "PENDING",
  buildingId: "building-1",
  requestedBy: "user-1",
  requestReason: "Correcting the building name",
  originalBuilding: building,
  proposedBuilding: building,
  reviewedBy: null,
  reviewedAt: null,
  reviewReason: null,
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}

describe("createBuildingEditRequest", () => {
  it("normalizes input and validates the canonical response", async () => {
    server.use(
      http.post("/api/v1/building-edit-requests", async ({ request: call }) => {
        await expect(call.json()).resolves.toEqual({
          buildingId: "building-1",
          proposedBuilding: building,
          requestReason: "Correcting the building name",
        })
        return HttpResponse.json({ success: true, data: request })
      }),
    )

    await expect(
      createBuildingEditRequest({
        buildingId: "  building-1  ",
        proposedBuilding: building,
        requestReason: "  Correcting the building name  ",
      }),
    ).resolves.toEqual(request)
  })

  it("rejects an empty building id before requesting", async () => {
    const handler = vi.fn()
    server.use(http.post("/api/v1/building-edit-requests", handler))

    await expect(
      createBuildingEditRequest({ buildingId: " ", proposedBuilding: building }),
    ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" })
    expect(handler).not.toHaveBeenCalled()
  })

  it("rejects malformed success responses", async () => {
    server.use(
      http.post("/api/v1/building-edit-requests", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )

    await expect(
      createBuildingEditRequest({
        buildingId: "building-1",
        proposedBuilding: building,
      }),
    ).rejects.toMatchObject({ status: 500 })
  })
})
