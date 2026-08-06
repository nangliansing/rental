import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"

import { searchOwnerSavedSearches } from "./searchOwnerSavedSearches"

const apiClientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock("@/lib/api-client", async importOriginal => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>()

  return {
    ...actual,
    apiClient: {
      get: apiClientMocks.get,
    },
  }
})

const savedSearch = {
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

const emptyResponse = {
  success: true,
  data: [],
  pagination: { page: 1, limit: 20, total: 0 },
}

const validResponse = {
  success: true,
  data: [savedSearch],
  pagination: { page: 1, limit: 20, total: 1 },
}

describe("searchOwnerSavedSearches", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("defaults to page 1 and shared page size without status", async () => {
    apiClientMocks.get.mockResolvedValueOnce({ data: emptyResponse })

    await searchOwnerSavedSearches()

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      "/saved-searches?page=1&limit=20",
      true,
      undefined,
    )
  })

  it.each([
    ["Waiting", "/saved-searches?page=1&limit=20&status=Waiting"],
    ["Closed", "/saved-searches?page=1&limit=20&status=Closed"],
  ] as const)("includes status=%s when provided", async (status, path) => {
    apiClientMocks.get.mockResolvedValueOnce({ data: emptyResponse })

    await searchOwnerSavedSearches({ status })

    expect(apiClientMocks.get).toHaveBeenCalledWith(path, true, undefined)
  })

  it("forwards abort signals and auth-retry flag", async () => {
    apiClientMocks.get.mockResolvedValueOnce({ data: emptyResponse })
    const controller = new AbortController()

    await searchOwnerSavedSearches({
      page: 2,
      limit: 10,
      signal: controller.signal,
    })

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      "/saved-searches?page=2&limit=10",
      true,
      controller.signal,
    )
  })

  it("parses a valid owner saved-search page", async () => {
    apiClientMocks.get.mockResolvedValueOnce({ data: validResponse })

    const result = await searchOwnerSavedSearches({ status: "Waiting" })

    expect(result.data).toHaveLength(1)
    expect(result.data[0]?._id).toBe("6a70f2002c0e518d5b689200")
    expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1 })
  })

  it.each([
    [{ page: 0, limit: 20 }, "page=1&limit=20"],
    [{ page: -3, limit: 20 }, "page=1&limit=20"],
    [{ page: 1.5, limit: 20 }, "page=1&limit=20"],
    [{ page: Number.NaN, limit: 20 }, "page=1&limit=20"],
    [{ page: "2", limit: "10" }, "page=2&limit=10"],
    [{ page: 10001, limit: 20 }, "page=10000&limit=20"],
    [{ page: 1, limit: 0 }, "page=1&limit=20"],
    [{ page: 1, limit: 101 }, "page=1&limit=100"],
    [{ page: 1, limit: 500 }, "page=1&limit=100"],
  ] as const)(
    "normalizes page/limit %# to %s",
    async (input, query) => {
      apiClientMocks.get.mockResolvedValueOnce({
        data: {
          ...emptyResponse,
          pagination: {
            page: Number(new URLSearchParams(query).get("page")),
            limit: Number(new URLSearchParams(query).get("limit")),
            total: 0,
          },
        },
      })

      await searchOwnerSavedSearches(input as never)

      expect(apiClientMocks.get).toHaveBeenCalledWith(
        `/saved-searches?${query}`,
        true,
        undefined,
      )
    },
  )

  it("rejects malformed API responses", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: [{ _id: "broken" }],
        pagination: emptyResponse.pagination,
      },
    })

    await expect(searchOwnerSavedSearches()).rejects.toMatchObject({
      status: 500,
      code: "INVALID_SAVED_SEARCH_RESPONSE",
    })
  })

  it("rejects unsuccessful envelopes", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: false, message: "nope" },
    })

    await expect(searchOwnerSavedSearches()).rejects.toBeInstanceOf(ApiError)
  })

  it("propagates transport failures from apiClient", async () => {
    apiClientMocks.get.mockRejectedValueOnce(
      new ApiError("Access token is required", 401, "ACCESS_TOKEN_REQUIRED"),
    )

    await expect(searchOwnerSavedSearches()).rejects.toMatchObject({
      status: 401,
      code: "ACCESS_TOKEN_REQUIRED",
    })
  })
})
