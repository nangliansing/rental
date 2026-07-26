import { http, HttpResponse } from "msw"
import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-client"
import { server } from "@/test/server"

import { getBuildingNeighbourhood } from "./getBuildingNeighbourhood"

const sampleNeighbourhoodResponse = {
  success: true,
  data: {
    buildingId: "6a595fd9e0608be2e4255f63",
    origin: {
      lat: 13.765,
      lng: 100.641,
    },
    radiusMeters: 1000,
    fetchRadiusMeters: 2000,
    fetchedAt: "2026-07-26T19:17:15.805Z",
    cacheStatus: "hit",
    source: "openstreetmap",
    summary: {
      all: 2,
      truncated: false,
      totalWithinRadius: 2,
      public_transport: 0,
      convenience: 1,
      supermarket: 0,
      restaurant: 1,
      cafe: 0,
      pharmacy: 0,
      market: 0,
      shopping_mall: 0,
      gym: 0,
      hospital: 0,
    },
    categories: [
      {
        key: "convenience",
        label: "Convenience Stores",
        priority: 2,
        count: 1,
      },
      {
        key: "restaurant",
        label: "Restaurants",
        priority: 4,
        count: 1,
      },
    ],
    places: [
      {
        id: "osm-node-1",
        name: "7-Eleven",
        lat: 13.761819,
        lng: 100.640989,
        category: "convenience",
        distanceMeters: 354,
      },
      {
        id: "bts-bang-chak",
        name: "BTS Bang Chak",
        lat: 13.6963,
        lng: 100.6051,
        category: "public_transport",
        mode: "bts",
        line: "Sukhumvit Line",
        distanceMeters: 8200,
      },
    ],
  },
}

describe("getBuildingNeighbourhood", () => {
  it("requests the neighbourhood endpoint with radius params and parses the response", async () => {
    server.use(
      http.get(
        "/api/v1/buildings/:buildingId/neighbourhood",
        ({ params, request }) => {
          expect(params.buildingId).toBe("building-1")
          expect(new URL(request.url).searchParams.get("radiusM")).toBe("500")
          expect(new URL(request.url).searchParams.get("fetchRadiusM")).toBe(
            "2000",
          )

          return HttpResponse.json(sampleNeighbourhoodResponse)
        },
      ),
    )

    const result = await getBuildingNeighbourhood({
      buildingId: "building-1",
      radiusM: 500,
      fetchRadiusM: 2000,
    })

    expect(result).toEqual(
      expect.objectContaining({
        buildingId: "6a595fd9e0608be2e4255f63",
        radiusMeters: 1000,
        fetchRadiusMeters: 2000,
        cacheStatus: "hit",
        summary: expect.objectContaining({
          all: 2,
          totalWithinRadius: 2,
          convenience: 1,
        }),
        categories: [
          expect.objectContaining({ key: "convenience", count: 1 }),
          expect.objectContaining({ key: "restaurant", count: 1 }),
        ],
        places: [
          expect.objectContaining({
            id: "osm-node-1",
            name: "7-Eleven",
            category: "convenience",
            distanceMeters: 354,
          }),
          expect.objectContaining({
            id: "bts-bang-chak",
            mode: "bts",
            line: "Sukhumvit Line",
          }),
        ],
      }),
    )
  })

  it("parses truncation metadata when present", async () => {
    server.use(
      http.get("/api/v1/buildings/:buildingId/neighbourhood", () =>
        HttpResponse.json({
          success: true,
          data: {
            ...sampleNeighbourhoodResponse.data,
            summary: {
              ...sampleNeighbourhoodResponse.data.summary,
              all: 215,
              truncated: true,
              totalWithinRadius: 347,
            },
          },
        }),
      ),
    )

    const result = await getBuildingNeighbourhood({ buildingId: "building-1" })

    expect(result.summary).toEqual(
      expect.objectContaining({
        all: 215,
        truncated: true,
        totalWithinRadius: 347,
      }),
    )
  })

  it("rejects malformed success responses", async () => {
    server.use(
      http.get("/api/v1/buildings/:buildingId/neighbourhood", () =>
        HttpResponse.json({ success: true, data: {} }),
      ),
    )

    await expect(
      getBuildingNeighbourhood({ buildingId: "building-1" }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_GET_BUILDING_NEIGHBOURHOOD_RESPONSE",
    })
  })

  it("propagates API errors", async () => {
    server.use(
      http.get("/api/v1/buildings/:buildingId/neighbourhood", () =>
        HttpResponse.json(
          {
            success: false,
            code: "BUILDING_NOT_FOUND",
            message: "Building not found",
          },
          { status: 404 },
        ),
      ),
    )

    await expect(
      getBuildingNeighbourhood({ buildingId: "missing-building" }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
