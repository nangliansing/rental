import { readFileSync } from "node:fs"
import { join } from "node:path"

import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import {
  SAVED_SEARCH_DESCRIPTION_MAX_LENGTH,
  SAVED_SEARCH_NAME_MAX_LENGTH,
  SAVED_SEARCH_PLACE_NAME_MAX_LENGTH,
  buildCreateOwnerSavedSearchGeoSearch,
  buildCreateOwnerSavedSearchPayload,
  createOwnerSavedSearch,
} from "./createOwnerSavedSearch"

const createdSavedSearch = {
  _id: "6a70f2002c0e518d5b689200",
  createdBy: "6a5638bafc6d6328c9e1b281",
  name: "Sukhumvit 2BR",
  description: "Near BTS",
  status: "Waiting",
  geoSearch: {
    mode: "area",
    bounds: {
      northEast: { lat: 13.78, lng: 100.66 },
      southWest: { lat: 13.75, lng: 100.62 },
    },
    placeName: "Phrom Phong",
  },
  filters: {
    minRent: 15000,
    maxRent: 35000,
  },
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-08-03T18:00:00.000Z",
  updatedAt: "2026-08-03T18:00:00.000Z",
}

const areaInput = {
  name: "  Sukhumvit 2BR  ",
  description: "  Near BTS  ",
  geoSearch: {
    mode: "area" as const,
    bounds: {
      northEast: { lat: 13.78, lng: 100.66 },
      southWest: { lat: 13.75, lng: 100.62 },
    },
    placeName: "  Phrom Phong  ",
  },
  filters: {
    minRent: 15000,
    maxRent: 35000,
    buildingFacilities: ["Parking", ""],
    unknown: "drop",
  } as never,
}

const expectValidationError = (run: () => unknown, message: string) => {
  try {
    run()
    expect.unreachable("expected validation error")
  } catch (error) {
    expect(error).toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message,
    })
  }
}

describe("buildCreateOwnerSavedSearchPayload", () => {
  it("normalizes area create payloads and strips unused geo fields", () => {
    expect(
      buildCreateOwnerSavedSearchPayload({
        ...areaInput,
        geoSearch: {
          ...areaInput.geoSearch,
          position: { lat: 13.75, lng: 100.5 },
          radiusMeters: 500,
          geometry: {
            type: "LineString",
            coordinates: [
              [100.5, 13.75],
              [100.52, 13.76],
            ],
          },
          distanceMeters: 400,
        },
      }),
    ).toEqual({
      name: "Sukhumvit 2BR",
      description: "Near BTS",
      geoSearch: {
        mode: "area",
        bounds: {
          northEast: { lat: 13.78, lng: 100.66 },
          southWest: { lat: 13.75, lng: 100.62 },
        },
        placeName: "Phrom Phong",
      },
      filters: {
        minRent: 15000,
        maxRent: 35000,
        buildingFacilities: ["Parking"],
      },
    })
  })

  it("accepts boundary-length name, description, and placeName", () => {
    const payload = buildCreateOwnerSavedSearchPayload({
      name: "n".repeat(SAVED_SEARCH_NAME_MAX_LENGTH),
      description: "d".repeat(SAVED_SEARCH_DESCRIPTION_MAX_LENGTH),
      geoSearch: {
        mode: "area",
        bounds: areaInput.geoSearch.bounds,
        placeName: "p".repeat(SAVED_SEARCH_PLACE_NAME_MAX_LENGTH),
      },
    })

    expect(payload.name).toHaveLength(SAVED_SEARCH_NAME_MAX_LENGTH)
    expect(payload.description).toHaveLength(
      SAVED_SEARCH_DESCRIPTION_MAX_LENGTH,
    )
    expect(payload.geoSearch).toMatchObject({
      placeName: "p".repeat(SAVED_SEARCH_PLACE_NAME_MAX_LENGTH),
    })
  })

  it("omits null/blank description, placeName, and empty filters", () => {
    expect(
      buildCreateOwnerSavedSearchPayload({
        name: "Request",
        description: null,
        geoSearch: {
          mode: "nearby",
          position: { lat: 13.75, lng: 100.5 },
          radiusMeters: 500,
          placeName: null,
        },
      }),
    ).toEqual({
      name: "Request",
      geoSearch: {
        mode: "nearby",
        position: { lat: 13.75, lng: 100.5 },
        radiusMeters: 500,
      },
    })

    expect(
      buildCreateOwnerSavedSearchPayload({
        name: "Request",
        description: "   ",
        geoSearch: {
          mode: "nearby",
          position: { lat: 13.75, lng: 100.5 },
          radiusMeters: 1,
          placeName: "   ",
        },
        filters: {
          buildingFacilities: [""],
          minRent: Number.NaN as never,
        },
      }),
    ).toEqual({
      name: "Request",
      geoSearch: {
        mode: "nearby",
        position: { lat: 13.75, lng: 100.5 },
        radiusMeters: 1,
      },
    })
  })

  it("keeps every supported filter shape", () => {
    expect(
      buildCreateOwnerSavedSearchPayload({
        name: "Filtered",
        geoSearch: areaInput.geoSearch,
        filters: {
          minRent: 10000,
          maxRent: 20000,
          bedroomCount: 2,
          bathroomCount: 1,
          contractMonths: 12,
          occupancy: 2,
          buildingType: "Apartment",
          kitchenType: "Separate",
          availableBy: "2026-09-01T17:00:00.000Z",
          isForeignerAccepted: true,
          isTM30Provided: false,
          isCookingAllowed: true,
          isPetAllowed: false,
          buildingFacilities: ["Parking"],
          security: ["CCTV"],
          listingFacilities: ["Aircon"],
          supportLanguages: ["en", "th"],
          agentProfileIds: ["agent-1"],
          listerIds: ["ignored"] as never,
        },
      }).filters,
    ).toEqual({
      minRent: 10000,
      maxRent: 20000,
      bedroomCount: 2,
      bathroomCount: 1,
      contractMonths: 12,
      occupancy: 2,
      buildingType: "Apartment",
      kitchenType: "Separate",
      availableBy: "2026-09-01T17:00:00.000Z",
      isForeignerAccepted: true,
      isTM30Provided: false,
      isCookingAllowed: true,
      isPetAllowed: false,
      buildingFacilities: ["Parking"],
      security: ["CCTV"],
      listingFacilities: ["Aircon"],
      supportLanguages: ["en", "th"],
      agentProfileIds: ["agent-1"],
    })
  })

  it("builds MultiLineString line payloads", () => {
    expect(
      buildCreateOwnerSavedSearchPayload({
        name: "Multi line",
        geoSearch: {
          mode: "line",
          geometry: {
            type: "MultiLineString",
            coordinates: [
              [
                [100.5, 13.75],
                [100.52, 13.76],
              ],
              [[100.6, 13.7]],
              "bad" as never,
            ],
          },
          distanceMeters: 2000,
        },
      }),
    ).toEqual({
      name: "Multi line",
      geoSearch: {
        mode: "line",
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [
              [100.5, 13.75],
              [100.52, 13.76],
            ],
          ],
        },
        distanceMeters: 2000,
      },
    })
  })

  it.each([
    ["empty name", { ...areaInput, name: "   " }, "name is required."],
    [
      "name too long",
      { ...areaInput, name: "x".repeat(SAVED_SEARCH_NAME_MAX_LENGTH + 1) },
      "name must be at most 120 characters.",
    ],
    [
      "description too long",
      {
        ...areaInput,
        description: "x".repeat(SAVED_SEARCH_DESCRIPTION_MAX_LENGTH + 1),
      },
      "description must be at most 2000 characters.",
    ],
    [
      "placeName too long",
      {
        ...areaInput,
        geoSearch: {
          ...areaInput.geoSearch,
          placeName: "p".repeat(SAVED_SEARCH_PLACE_NAME_MAX_LENGTH + 1),
        },
      },
      "placeName must be at most 200 characters.",
    ],
    [
      "invalid mode",
      { ...areaInput, geoSearch: { mode: "pin" as never } },
      "geoSearch.mode must be area, nearby, or line.",
    ],
    [
      "missing geoSearch",
      { ...areaInput, geoSearch: null as never },
      "geoSearch is required.",
    ],
    [
      "area missing bounds",
      { ...areaInput, geoSearch: { mode: "area" as const } },
      "geoSearch.bounds is required for area search.",
    ],
    [
      "area out-of-range lat",
      {
        ...areaInput,
        geoSearch: {
          mode: "area" as const,
          bounds: {
            northEast: { lat: 91, lng: 100.66 },
            southWest: { lat: 13.75, lng: 100.62 },
          },
        },
      },
      "geoSearch.bounds is required for area search.",
    ],
    [
      "invalid area bounds orientation",
      {
        ...areaInput,
        geoSearch: {
          mode: "area" as const,
          bounds: {
            northEast: { lat: 13.75, lng: 100.62 },
            southWest: { lat: 13.78, lng: 100.66 },
          },
        },
      },
      "geoSearch.bounds must form a valid area.",
    ],
    [
      "equal area bounds",
      {
        ...areaInput,
        geoSearch: {
          mode: "area" as const,
          bounds: {
            northEast: { lat: 13.75, lng: 100.5 },
            southWest: { lat: 13.75, lng: 100.5 },
          },
        },
      },
      "geoSearch.bounds must form a valid area.",
    ],
    [
      "nearby missing position",
      {
        ...areaInput,
        geoSearch: { mode: "nearby" as const, radiusMeters: 500 },
      },
      "geoSearch.position is required for nearby search.",
    ],
    [
      "nearby invalid longitude",
      {
        ...areaInput,
        geoSearch: {
          mode: "nearby" as const,
          position: { lat: 13.75, lng: 181 },
          radiusMeters: 500,
        },
      },
      "geoSearch.position is required for nearby search.",
    ],
    [
      "nearby radius below min",
      {
        ...areaInput,
        geoSearch: {
          mode: "nearby" as const,
          position: { lat: 13.75, lng: 100.5 },
          radiusMeters: 0,
        },
      },
      "geoSearch.radiusMeters must be an integer from 1 to 2000.",
    ],
    [
      "nearby radius above max",
      {
        ...areaInput,
        geoSearch: {
          mode: "nearby" as const,
          position: { lat: 13.75, lng: 100.5 },
          radiusMeters: 2001,
        },
      },
      "geoSearch.radiusMeters must be an integer from 1 to 2000.",
    ],
    [
      "nearby non-integer radius",
      {
        ...areaInput,
        geoSearch: {
          mode: "nearby" as const,
          position: { lat: 13.75, lng: 100.5 },
          radiusMeters: 12.5,
        },
      },
      "geoSearch.radiusMeters must be an integer from 1 to 2000.",
    ],
    [
      "line missing geometry",
      {
        ...areaInput,
        geoSearch: { mode: "line" as const, distanceMeters: 400 },
      },
      "geoSearch.geometry is required for line search.",
    ],
    [
      "line Point geometry",
      {
        ...areaInput,
        geoSearch: {
          mode: "line" as const,
          geometry: { type: "Point" as never, coordinates: [100.5, 13.75] },
          distanceMeters: 400,
        },
      },
      "geoSearch.geometry type must be LineString or MultiLineString.",
    ],
    [
      "line too few points",
      {
        ...areaInput,
        geoSearch: {
          mode: "line" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [[100.5, 13.75]],
          },
          distanceMeters: 400,
        },
      },
      "geoSearch.geometry LineString requires at least 2 coordinates.",
    ],
    [
      "line empty MultiLineString",
      {
        ...areaInput,
        geoSearch: {
          mode: "line" as const,
          geometry: {
            type: "MultiLineString" as const,
            coordinates: [[[100.5, 13.75]]],
          },
          distanceMeters: 400,
        },
      },
      "geoSearch.geometry MultiLineString requires at least one valid line.",
    ],
    [
      "line invalid distance",
      {
        ...areaInput,
        geoSearch: {
          mode: "line" as const,
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [100.5, 13.75],
              [100.52, 13.76],
            ],
          },
          distanceMeters: 0,
        },
      },
      "geoSearch.distanceMeters must be an integer from 1 to 2000.",
    ],
  ])("rejects %s before requesting", (_label, input, message) => {
    expectValidationError(
      () => buildCreateOwnerSavedSearchPayload(input),
      message,
    )
  })
})

describe("buildCreateOwnerSavedSearchGeoSearch", () => {
  it("accepts min/max meter distances", () => {
    expect(
      buildCreateOwnerSavedSearchGeoSearch({
        mode: "nearby",
        position: { lat: -90, lng: -180 },
        radiusMeters: 1,
      }),
    ).toMatchObject({ radiusMeters: 1 })

    expect(
      buildCreateOwnerSavedSearchGeoSearch({
        mode: "line",
        geometry: {
          type: "LineString",
          coordinates: [
            [180, 90],
            [-180, -90],
          ],
        },
        distanceMeters: 2000,
      }),
    ).toMatchObject({ distanceMeters: 2000 })
  })
})

describe("createOwnerSavedSearch", () => {
  it("posts a normalized area payload and returns the unwrapped SavedSearch", async () => {
    server.use(
      http.post("/api/v1/saved-searches", async ({ request }) => {
        await expect(request.json()).resolves.toEqual({
          name: "Sukhumvit 2BR",
          description: "Near BTS",
          geoSearch: {
            mode: "area",
            bounds: {
              northEast: { lat: 13.78, lng: 100.66 },
              southWest: { lat: 13.75, lng: 100.62 },
            },
            placeName: "Phrom Phong",
          },
          filters: {
            minRent: 15000,
            maxRent: 35000,
            buildingFacilities: ["Parking"],
          },
        })

        return HttpResponse.json({
          success: true,
          data: createdSavedSearch,
        })
      }),
    )

    await expect(createOwnerSavedSearch(areaInput)).resolves.toMatchObject({
      _id: createdSavedSearch._id,
      name: "Sukhumvit 2BR",
      status: "Waiting",
    })
  })

  it("posts nearby and line payloads without omitted blanks", async () => {
    const bodies: unknown[] = []
    server.use(
      http.post("/api/v1/saved-searches", async ({ request }) => {
        bodies.push(await request.json())
        return HttpResponse.json({
          success: true,
          data: createdSavedSearch,
        })
      }),
    )

    await createOwnerSavedSearch({
      name: "Nearby",
      description: null,
      geoSearch: {
        mode: "nearby",
        position: { lat: 13.75, lng: 100.5 },
        radiusMeters: 500,
        placeName: "   ",
      },
    })
    await createOwnerSavedSearch({
      name: "Line",
      geoSearch: {
        mode: "line",
        geometry: {
          type: "LineString",
          coordinates: [
            [100.5, 13.75],
            [100.52, 13.76],
          ],
        },
        distanceMeters: 400,
      },
    })

    expect(bodies).toEqual([
      {
        name: "Nearby",
        geoSearch: {
          mode: "nearby",
          position: { lat: 13.75, lng: 100.5 },
          radiusMeters: 500,
        },
      },
      {
        name: "Line",
        geoSearch: {
          mode: "line",
          geometry: {
            type: "LineString",
            coordinates: [
              [100.5, 13.75],
              [100.52, 13.76],
            ],
          },
          distanceMeters: 400,
        },
      },
    ])
  })

  it("rejects invalid input before requesting", async () => {
    const request = vi.fn()
    server.use(http.post("/api/v1/saved-searches", request))

    await expect(
      createOwnerSavedSearch({ ...areaInput, name: " " }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })
    expect(request).not.toHaveBeenCalled()
  })

  it.each([
    [{ success: true, data: { _id: "broken" } }],
    [{ success: false, data: createdSavedSearch }],
    [{ success: true }],
    [null],
  ])("rejects malformed success responses (%j)", async body => {
    server.use(
      http.post("/api/v1/saved-searches", () => HttpResponse.json(body)),
    )

    await expect(createOwnerSavedSearch(areaInput)).rejects.toMatchObject({
      status: 500,
      code: "INVALID_SAVED_SEARCH_RESPONSE",
    })
  })

  it.each([
    [403, "ACCOUNT_SUSPENDED"],
    [422, "VALIDATION_ERROR"],
  ] as const)("propagates API %s %s failures", async (status, code) => {
    server.use(
      http.post("/api/v1/saved-searches", () =>
        HttpResponse.json(
          {
            success: false,
            code,
            message: code,
          },
          { status },
        ),
      ),
    )

    await expect(createOwnerSavedSearch(areaInput)).rejects.toMatchObject({
      status,
      code,
    })
  })

  it("propagates auth failures after refresh is rejected", async () => {
    server.use(
      http.post("/api/v1/saved-searches", () =>
        HttpResponse.json(
          {
            success: false,
            code: "ACCESS_TOKEN_REQUIRED",
            message: "Access token is required",
          },
          { status: 401 },
        ),
      ),
      http.post("/api/v1/users/token/refresh", () =>
        HttpResponse.json(
          {
            success: false,
            code: "INVALID_REFRESH_TOKEN",
            message: "Your session expired. Please log in again.",
          },
          { status: 401 },
        ),
      ),
    )

    await expect(createOwnerSavedSearch(areaInput)).rejects.toMatchObject({
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
    })
  })
})

describe("createOwnerSavedSearch source contract", () => {
  it("keeps the mutation hook free of query-cache writes", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/features/saved-search/api/useCreateOwnerSavedSearch.ts",
      ),
      "utf8",
    )
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")

    expect(code).not.toMatch(/useQueryClient\s*\(/)
    expect(code).not.toMatch(/setQueryData\s*\(/)
    expect(code).not.toMatch(/invalidateQueries\s*\(/)
    expect(code).not.toMatch(/cancelQueries\s*\(/)
    expect(code).not.toMatch(/removeQueries\s*\(/)
    expect(code).toMatch(
      /scope:\s*\{\s*id:\s*CREATE_OWNER_SAVED_SEARCH_SCOPE_ID/,
    )
  })
})
