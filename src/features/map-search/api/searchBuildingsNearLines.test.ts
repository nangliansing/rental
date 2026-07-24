import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { server } from "@/test/server"

import { searchBuildingsNearLines } from "./searchBuildingsNearLines"

const lineGeometry = {
  type: "LineString" as const,
  coordinates: [
    [100.6, 13.7] as [number, number],
    [100.7, 13.8] as [number, number],
  ],
}

const geometry = {
  type: "MultiLineString" as const,
  coordinates: [
    [
      [100.6, 13.7] as [number, number],
      [100.7, 13.8] as [number, number],
    ],
    [
      [100.7, 13.8] as [number, number],
      [100.8, 13.75] as [number, number],
    ],
  ],
}

describe("searchBuildingsNearLines", () => {
  it("sends geometry, distance, shared filters, pagination, and inclusion mode", async () => {
    server.use(
      http.post(
        "/api/v1/search/buildings/near-lines",
        async ({ request }) => {
          await expect(request.json()).resolves.toEqual({
            geometry,
            distanceMeters: 750,
            minRent: 10_000,
            maxRent: 20_000,
            buildingType: "Condo",
            buildingFacilities: ["Parking", "Gym"],
            security: ["Security Guard"],
            listingFacilities: ["Air Conditioner"],
            bedroomCount: 1,
            bathroomCount: 1,
            kitchenType: "Kitchen",
            contractMonths: 6,
            occupancy: 2,
            isForeignerAccepted: true,
            isTM30Provided: true,
            isCookingAllowed: true,
            isPetAllowed: true,
            supportLanguages: ["English", "Thai"],
            agentProfileIds: ["agent-1"],
            includeBuildingsWithoutMatchingListings: true,
            page: 2,
            limit: 10,
          })

          return HttpResponse.json({
            success: true,
            data: [],
            pagination: { page: 2, limit: 10, total: 11 },
          })
        },
      ),
    )

    await expect(
      searchBuildingsNearLines({
        geometry,
        distanceMeters: 750,
        filters: {
          minRent: 10_000,
          maxRent: 20_000,
          buildingType: "Condo",
          buildingFacilities: ["Parking", "Gym"],
          security: ["Security Guard"],
          listingFacilities: ["Air Conditioner"],
          bedroomCount: 1,
          bathroomCount: 1,
          kitchenType: "Kitchen",
          contractMonths: 6,
          occupancy: 2,
          isForeignerAccepted: true,
          isTM30Provided: true,
          isCookingAllowed: true,
          isPetAllowed: true,
          supportLanguages: ["English", "Thai"],
          agentProfileIds: ["agent-1"],
        },
        includeBuildingsWithoutMatchingListings: true,
        page: 2,
        limit: 10,
      }),
    ).resolves.toEqual({
      success: true,
      data: [],
      pagination: { page: 2, limit: 10, total: 11 },
    })
  })

  it("uses the backend defaults explicitly when optional values are omitted", async () => {
    server.use(
      http.post(
        "/api/v1/search/buildings/near-lines",
        async ({ request }) => {
          await expect(request.json()).resolves.toEqual({
            geometry: lineGeometry,
            distanceMeters: 500,
            page: 1,
            limit: 20,
          })

          return HttpResponse.json({
            success: true,
            data: [],
            pagination: { page: 1, limit: 20, total: 0 },
          })
        },
      ),
    )

    await expect(
      searchBuildingsNearLines({ geometry: lineGeometry }),
    ).resolves.toMatchObject({
      pagination: { page: 1, limit: 20, total: 0 },
    })
  })

  it("preserves an explicit false inclusion mode and legacy lister filter", async () => {
    server.use(
      http.post(
        "/api/v1/search/buildings/near-lines",
        async ({ request }) => {
          await expect(request.json()).resolves.toMatchObject({
            geometry: lineGeometry,
            listerIds: ["agent-1"],
            includeBuildingsWithoutMatchingListings: false,
          })

          return HttpResponse.json({
            success: true,
            data: [],
            pagination: { page: 1, limit: 20, total: 0 },
          })
        },
      ),
    )

    await searchBuildingsNearLines({
      geometry: lineGeometry,
      filters: { listerIds: ["agent-1"] },
      includeBuildingsWithoutMatchingListings: false,
    })
  })

  it("propagates backend validation errors without rewriting their message", async () => {
    server.use(
      http.post("/api/v1/search/buildings/near-lines", () =>
        HttpResponse.json(
          {
            success: false,
            code: "VALIDATION_ERROR",
            message: "distanceMeters must be between 1 and 1000",
          },
          { status: 422 },
        ),
      ),
    )

    await expect(
      searchBuildingsNearLines({
        geometry: lineGeometry,
        distanceMeters: 1001,
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "distanceMeters must be between 1 and 1000",
    })
  })

  it("maps rate limiting to the shared friendly API error", async () => {
    server.use(
      http.post("/api/v1/search/buildings/near-lines", () =>
        HttpResponse.json(
          {
            success: false,
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
          },
          { status: 429 },
        ),
      ),
    )

    await expect(
      searchBuildingsNearLines({ geometry: lineGeometry }),
    ).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many attempts. Please wait and try again.",
    })
  })
})
