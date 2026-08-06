import { readFileSync } from "node:fs"
import { join } from "node:path"

import { http, HttpResponse } from "msw"
import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { server } from "@/test/server"

import {
  deleteOwnerSavedSearch,
  isOwnerSavedSearchNotFoundError,
  parseDeleteOwnerSavedSearchResponse,
} from "./deleteOwnerSavedSearch"

const deletedSavedSearch = {
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
  isDeleted: true,
  deletedAt: "2026-08-03T21:30:00.000Z",
  createdAt: "2026-08-03T18:00:00.000Z",
  updatedAt: "2026-08-03T21:30:00.000Z",
}

describe("parseDeleteOwnerSavedSearchResponse", () => {
  it.each([
    ["Waiting", "Waiting"],
    ["Closed", "Closed"],
  ] as const)("accepts soft-deleted %s payloads", (status, expected) => {
    expect(
      parseDeleteOwnerSavedSearchResponse({
        success: true,
        data: { ...deletedSavedSearch, status },
      }),
    ).toEqual({
      success: true,
      data: expect.objectContaining({
        _id: deletedSavedSearch._id,
        isDeleted: true,
        deletedAt: deletedSavedSearch.deletedAt,
        status: expected,
      }),
    })
  })

  it.each([
    [{ success: true, data: { ...deletedSavedSearch, isDeleted: false } }],
    [{ success: true, data: { ...deletedSavedSearch, deletedAt: null } }],
    [{ success: true, data: { ...deletedSavedSearch, deletedAt: "" } }],
    [{ success: true, data: { ...deletedSavedSearch, isDeleted: "true" } }],
    [{ success: true, data: { _id: "broken" } }],
    [{ success: false, data: deletedSavedSearch }],
    [{ success: true }],
    [null],
  ])("rejects incomplete delete responses (%j)", body => {
    expect(() => parseDeleteOwnerSavedSearchResponse(body)).toThrow(
      expect.objectContaining({
        status: 500,
        code: "INVALID_SAVED_SEARCH_RESPONSE",
      }),
    )
  })
})

describe("isOwnerSavedSearchNotFoundError", () => {
  it("matches SAVED_SEARCH_NOT_FOUND only", () => {
    expect(
      isOwnerSavedSearchNotFoundError(
        new ApiError("missing", 404, "SAVED_SEARCH_NOT_FOUND"),
      ),
    ).toBe(true)
    expect(
      isOwnerSavedSearchNotFoundError(new ApiError("missing", 404)),
    ).toBe(false)
    expect(
      isOwnerSavedSearchNotFoundError(
        new ApiError("missing", 404, "LISTING_NOT_FOUND"),
      ),
    ).toBe(false)
    expect(
      isOwnerSavedSearchNotFoundError(
        new ApiError("closed", 409, "SAVED_SEARCH_CLOSED"),
      ),
    ).toBe(false)
    expect(isOwnerSavedSearchNotFoundError(new Error("network"))).toBe(false)
  })
})

describe("deleteOwnerSavedSearch", () => {
  it("deletes by trimmed id and returns the soft-deleted SavedSearch", async () => {
    server.use(
      http.delete(
        "/api/v1/saved-searches/:savedSearchId",
        ({ params }) => {
          expect(params.savedSearchId).toBe(deletedSavedSearch._id)
          return HttpResponse.json({
            success: true,
            data: deletedSavedSearch,
          })
        },
      ),
    )

    await expect(
      deleteOwnerSavedSearch({
        savedSearchId: `  ${deletedSavedSearch._id}  `,
      }),
    ).resolves.toMatchObject({
      _id: deletedSavedSearch._id,
      isDeleted: true,
      deletedAt: deletedSavedSearch.deletedAt,
      status: "Waiting",
    })
  })

  it("accepts soft-deleted Closed responses", async () => {
    server.use(
      http.delete("/api/v1/saved-searches/:savedSearchId", () =>
        HttpResponse.json({
          success: true,
          data: { ...deletedSavedSearch, status: "Closed" },
        }),
      ),
    )

    await expect(
      deleteOwnerSavedSearch({
        savedSearchId: deletedSavedSearch._id,
      }),
    ).resolves.toMatchObject({
      status: "Closed",
      isDeleted: true,
    })
  })

  it("encodes saved search ids in the request path", async () => {
    const id = "id/with spaces"
    server.use(
      http.delete("/api/v1/saved-searches/:savedSearchId", ({ request }) => {
        expect(new URL(request.url).pathname).toBe(
          `/api/v1/saved-searches/${encodeURIComponent(id)}`,
        )
        return HttpResponse.json({
          success: true,
          data: { ...deletedSavedSearch, _id: id },
        })
      }),
    )

    await expect(
      deleteOwnerSavedSearch({ savedSearchId: id }),
    ).resolves.toMatchObject({ _id: id, isDeleted: true })
  })

  it("rejects empty ids before requesting", async () => {
    const request = vi.fn()
    server.use(http.delete("/api/v1/saved-searches/:savedSearchId", request))

    await expect(
      deleteOwnerSavedSearch({ savedSearchId: " " }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Saved search id is required.",
    })
    expect(request).not.toHaveBeenCalled()
  })

  it.each([
    [{ success: true, data: { ...deletedSavedSearch, isDeleted: false } }],
    [{ success: true, data: { ...deletedSavedSearch, deletedAt: null } }],
    [{ success: true, data: { _id: "broken" } }],
    [{ success: true }],
    [null],
  ])("rejects malformed success responses (%j)", async body => {
    server.use(
      http.delete("/api/v1/saved-searches/:savedSearchId", () =>
        HttpResponse.json(body),
      ),
    )

    await expect(
      deleteOwnerSavedSearch({
        savedSearchId: deletedSavedSearch._id,
      }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_SAVED_SEARCH_RESPONSE",
    })
  })

  it.each([
    [404, "SAVED_SEARCH_NOT_FOUND"],
    [422, "VALIDATION_ERROR"],
    [403, "ACCOUNT_SUSPENDED"],
  ] as const)("propagates API %s %s failures", async (status, code) => {
    server.use(
      http.delete("/api/v1/saved-searches/:savedSearchId", () =>
        HttpResponse.json(
          { success: false, code, message: code },
          { status },
        ),
      ),
    )

    await expect(
      deleteOwnerSavedSearch({
        savedSearchId: deletedSavedSearch._id,
      }),
    ).rejects.toMatchObject({ status, code })
  })

  it("propagates auth failures after refresh is rejected", async () => {
    server.use(
      http.delete("/api/v1/saved-searches/:savedSearchId", () =>
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
      deleteOwnerSavedSearch({
        savedSearchId: deletedSavedSearch._id,
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: "INVALID_REFRESH_TOKEN",
    })
  })
})

describe("useDeleteOwnerSavedSearch source contract", () => {
  it("uses optimistic transactions, shared write scope, and 404 idempotency", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src/features/saved-search/api/useDeleteOwnerSavedSearch.ts",
      ),
      "utf8",
    )
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")

    expect(code).toContain("createOptimisticTransaction")
    expect(code).toContain("OWNER_SAVED_SEARCH_WRITE_SCOPE_ID")
    expect(code).toContain("isOwnerSavedSearchNotFoundError")
    expect(code).toContain("removeOwnerSavedSearchFromLists")
    expect(code).toContain("createOptimisticDeletedSavedSearch")
    expect(code).toContain("shouldInvalidate: ({ error }) => error === null")
    expect(code).not.toContain("updateOwnerSavedSearchCache")
    expect(code).not.toContain("updateStatusCache")
  })
})
