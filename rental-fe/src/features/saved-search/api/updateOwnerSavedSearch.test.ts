import { readFileSync } from "node:fs"
import { join } from "node:path"

import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { server } from "@/test/server"

import {
  SAVED_SEARCH_DESCRIPTION_MAX_LENGTH,
  SAVED_SEARCH_NAME_MAX_LENGTH,
  SAVED_SEARCH_PLACE_NAME_MAX_LENGTH,
} from "./createOwnerSavedSearch"
import {
  buildUpdateOwnerSavedSearchPayload,
  updateOwnerSavedSearch,
} from "./updateOwnerSavedSearch"

const updatedSavedSearch = {
  _id: "6a70f2002c0e518d5b689200",
  createdBy: "6a5638bafc6d6328c9e1b281",
  name: "Sukhumvit 2BR updated",
  description: "Updated notes",
  status: "Waiting",
  geoSearch: {
    mode: "nearby",
    position: { lat: 13.7308, lng: 100.5418 },
    radiusMeters: 800,
    placeName: "Siam",
  },
  filters: {
    minRent: 18000,
    maxRent: 40000,
  },
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-08-03T18:00:00.000Z",
  updatedAt: "2026-08-03T18:10:00.000Z",
}

const areaBounds = {
  northEast: { lat: 13.78, lng: 100.66 },
  southWest: { lat: 13.75, lng: 100.62 },
}

const lineGeometry = {
  type: "LineString" as const,
  coordinates: [
    [100.5, 13.75],
    [100.52, 13.76],
  ] as [number, number][],
}

describe("buildUpdateOwnerSavedSearchPayload", () => {
  it("builds a full partial payload with normalized fields", () => {
    expect(
      buildUpdateOwnerSavedSearchPayload({
        name: "  Updated  ",
        description: "  Notes  ",
        geoSearch: {
          mode: "nearby",
          position: { lat: 13.7308, lng: 100.5418 },
          radiusMeters: 800,
          placeName: "  Siam  ",
          bounds: areaBounds,
          geometry: lineGeometry,
          distanceMeters: 400,
        },
        filters: {
          minRent: 18000,
          buildingFacilities: ["Parking", ""],
          unknown: "drop",
        } as never,
      }),
    ).toEqual({
      name: "Updated",
      description: "Notes",
      geoSearch: {
        mode: "nearby",
        position: { lat: 13.7308, lng: 100.5418 },
        radiusMeters: 800,
        placeName: "Siam",
      },
      filters: {
        minRent: 18000,
        buildingFacilities: ["Parking"],
      },
    })
  })

  it.each([
    [{ name: "Only name" }, { name: "Only name" }],
    [{ description: "Only desc" }, { description: "Only desc" }],
    [{ description: null }, { description: null }],
    [{ description: "   " }, { description: null }],
    [{ filters: {} }, { filters: {} }],
    [
      {
        geoSearch: {
          mode: "area" as const,
          bounds: areaBounds,
          placeName: "  Area  ",
        },
      },
      {
        geoSearch: {
          mode: "area",
          bounds: areaBounds,
          placeName: "Area",
        },
      },
    ],
    [
      {
        geoSearch: {
          mode: "line" as const,
          geometry: lineGeometry,
          distanceMeters: 400,
          placeName: null,
        },
      },
      {
        geoSearch: {
          mode: "line",
          geometry: lineGeometry,
          distanceMeters: 400,
        },
      },
    ],
  ])("accepts single-field updates %#", (input, expected) => {
    expect(buildUpdateOwnerSavedSearchPayload(input)).toEqual(expected)
  })

  it("accepts boundary-length name, description, and placeName", () => {
    const payload = buildUpdateOwnerSavedSearchPayload({
      name: "n".repeat(SAVED_SEARCH_NAME_MAX_LENGTH),
      description: "d".repeat(SAVED_SEARCH_DESCRIPTION_MAX_LENGTH),
      geoSearch: {
        mode: "area",
        bounds: areaBounds,
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

  it("rejects empty updates", () => {
    expect(() => buildUpdateOwnerSavedSearchPayload({})).toThrow(
      expect.objectContaining({
        status: 422,
        code: "NO_VALID_CHANGE",
        message: "Make at least one change before saving.",
      }),
    )
  })

  it.each([
    ["status", { name: "Ok", status: "Closed" }],
    ["createdBy", { name: "Ok", createdBy: "user-1" }],
    ["isDeleted", { name: "Ok", isDeleted: true }],
    ["deletedAt", { name: "Ok", deletedAt: "2026-08-04T00:00:00.000Z" }],
    ["_id", { name: "Ok", _id: "other" }],
    ["createdAt", { name: "Ok", createdAt: "2026-08-04T00:00:00.000Z" }],
    ["updatedAt", { name: "Ok", updatedAt: "2026-08-04T00:00:00.000Z" }],
  ] as const)("rejects immutable field %s", (field, input) => {
    expect(() =>
      buildUpdateOwnerSavedSearchPayload(input as never),
    ).toThrow(
      expect.objectContaining({
        status: 422,
        code: "VALIDATION_ERROR",
        message: `Unknown fields: ${field}`,
      }),
    )
  })

  it.each([
    [{ name: "   " }, "name is required."],
    [{ name: "x".repeat(121) }, "name must be at most 120 characters."],
    [
      { description: "x".repeat(2001) },
      "description must be at most 2000 characters.",
    ],
    [
      {
        geoSearch: {
          mode: "area" as const,
          bounds: areaBounds,
          placeName: "p".repeat(201),
        },
      },
      "placeName must be at most 200 characters.",
    ],
    [
      { geoSearch: { mode: "area" as const } },
      "geoSearch.bounds is required for area search.",
    ],
    [
      {
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
      { geoSearch: { mode: "nearby" as const, radiusMeters: 500 } },
      "geoSearch.position is required for nearby search.",
    ],
    [
      {
        geoSearch: {
          mode: "nearby" as const,
          position: { lat: 13.73, lng: 100.54 },
          radiusMeters: 0,
        },
      },
      "geoSearch.radiusMeters must be an integer from 1 to 2000.",
    ],
    [
      {
        geoSearch: {
          mode: "nearby" as const,
          position: { lat: 13.73, lng: 100.54 },
          radiusMeters: 2001,
        },
      },
      "geoSearch.radiusMeters must be an integer from 1 to 2000.",
    ],
    [
      { geoSearch: { mode: "line" as const, distanceMeters: 400 } },
      "geoSearch.geometry is required for line search.",
    ],
    [
      {
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
      {
        geoSearch: {
          mode: "line" as const,
          geometry: lineGeometry,
          distanceMeters: 0.5,
        },
      },
      "geoSearch.distanceMeters must be an integer from 1 to 2000.",
    ],
    [
      { geoSearch: { mode: "radius" as never } },
      "geoSearch.mode must be area, nearby, or line.",
    ],
  ])("rejects invalid values %#", (input, message) => {
    expect(() => buildUpdateOwnerSavedSearchPayload(input)).toThrow(
      expect.objectContaining({
        status: 422,
        code: "VALIDATION_ERROR",
        message,
      }),
    )
  })
})

describe("updateOwnerSavedSearch", () => {
  it("patches normalized values and returns the unwrapped SavedSearch", async () => {
    server.use(
      http.patch(
        "/api/v1/saved-searches/:savedSearchId",
        async ({ params, request }) => {
          expect(params.savedSearchId).toBe(updatedSavedSearch._id)
          await expect(request.json()).resolves.toEqual({
            name: "Sukhumvit 2BR updated",
            description: "Updated notes",
          })
          return HttpResponse.json({
            success: true,
            data: updatedSavedSearch,
          })
        },
      ),
    )

    await expect(
      updateOwnerSavedSearch({
        savedSearchId: `  ${updatedSavedSearch._id}  `,
        name: "  Sukhumvit 2BR updated  ",
        description: "  Updated notes  ",
      }),
    ).resolves.toMatchObject({
      _id: updatedSavedSearch._id,
      name: "Sukhumvit 2BR updated",
      status: "Waiting",
      filters: { minRent: 18000, maxRent: 40000 },
    })
  })

  it("sends full geo + filters replace and clears description with null", async () => {
    server.use(
      http.patch(
        "/api/v1/saved-searches/:savedSearchId",
        async ({ request }) => {
          await expect(request.json()).resolves.toEqual({
            description: null,
            geoSearch: {
              mode: "area",
              bounds: areaBounds,
            },
            filters: {
              maxRent: 50000,
              bedroomCount: 2,
            },
          })
          return HttpResponse.json({
            success: true,
            data: {
              ...updatedSavedSearch,
              description: null,
              geoSearch: {
                mode: "area",
                bounds: areaBounds,
              },
              filters: {
                maxRent: 50000,
                bedroomCount: 2,
              },
            },
          })
        },
      ),
    )

    await expect(
      updateOwnerSavedSearch({
        savedSearchId: updatedSavedSearch._id,
        description: null,
        geoSearch: {
          mode: "area",
          bounds: areaBounds,
          placeName: "   ",
        },
        filters: {
          maxRent: 50000,
          bedroomCount: 2,
        },
      }),
    ).resolves.toMatchObject({
      description: null,
      geoSearch: { mode: "area" },
      filters: { maxRent: 50000, bedroomCount: 2 },
    })
  })

  it("encodes saved search ids in the request path", async () => {
    const id = "id/with spaces"
    server.use(
      http.patch(
        "/api/v1/saved-searches/:savedSearchId",
        ({ request }) => {
          expect(new URL(request.url).pathname).toBe(
            `/api/v1/saved-searches/${encodeURIComponent(id)}`,
          )
          return HttpResponse.json({
            success: true,
            data: { ...updatedSavedSearch, _id: id },
          })
        },
      ),
    )

    await expect(
      updateOwnerSavedSearch({
        savedSearchId: id,
        name: "Encoded",
      }),
    ).resolves.toMatchObject({ _id: id, name: "Sukhumvit 2BR updated" })
  })

  it("rejects empty ids and empty bodies before requesting", async () => {
    const request = vi.fn()
    server.use(http.patch("/api/v1/saved-searches/:savedSearchId", request))

    await expect(
      updateOwnerSavedSearch({
        savedSearchId: " ",
        name: "Updated",
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Saved search id is required.",
    })
    await expect(
      updateOwnerSavedSearch({
        savedSearchId: updatedSavedSearch._id,
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "NO_VALID_CHANGE",
    })
    await expect(
      updateOwnerSavedSearch({
        savedSearchId: updatedSavedSearch._id,
        name: " ",
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })
    expect(request).not.toHaveBeenCalled()
  })

  it.each([
    [{ success: true, data: { _id: "broken" } }],
    [{ success: false, data: updatedSavedSearch }],
    [{ success: true }],
    [null],
  ])("rejects malformed success responses (%j)", async body => {
    server.use(
      http.patch("/api/v1/saved-searches/:savedSearchId", () =>
        HttpResponse.json(body),
      ),
    )

    await expect(
      updateOwnerSavedSearch({
        savedSearchId: updatedSavedSearch._id,
        name: "Updated",
      }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_SAVED_SEARCH_RESPONSE",
    })
  })

  it.each([
    [404, "SAVED_SEARCH_NOT_FOUND"],
    [409, "SAVED_SEARCH_CLOSED"],
    [422, "NO_VALID_CHANGE"],
    [422, "VALIDATION_ERROR"],
    [403, "ACCOUNT_SUSPENDED"],
  ] as const)("propagates API %s %s failures", async (status, code) => {
    server.use(
      http.patch("/api/v1/saved-searches/:savedSearchId", () =>
        HttpResponse.json(
          { success: false, code, message: code },
          { status },
        ),
      ),
    )

    await expect(
      updateOwnerSavedSearch({
        savedSearchId: updatedSavedSearch._id,
        name: "Updated",
      }),
    ).rejects.toMatchObject({ status, code })
  })

  it("propagates auth failures after refresh is rejected", async () => {
    server.use(
      http.patch("/api/v1/saved-searches/:savedSearchId", () =>
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

    await expect(
      updateOwnerSavedSearch({
        savedSearchId: updatedSavedSearch._id,
        name: "Updated",
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
    })
  })
})

describe("useUpdateOwnerSavedSearch source contract", () => {
  it("uses optimistic transactions and the shared owner write scope", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/features/saved-search/api/useUpdateOwnerSavedSearch.ts",
      ),
      "utf8",
    )
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")

    expect(code).toContain("createOptimisticTransaction")
    expect(code).toContain("OWNER_SAVED_SEARCH_WRITE_SCOPE_ID")
    expect(code).toContain("shouldInvalidate: ({ error }) => error === null")
    expect(code).toContain("createOptimisticUpdatedSavedSearch")
    expect(code).not.toContain('status: "Closed"')
  })
})
