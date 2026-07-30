import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"

import { searchOwnerListings } from "./searchOwnerListings"

const apiClientMocks = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>()

  return {
    ...actual,
    apiClient: {
      get: apiClientMocks.get,
    },
  }
})

const ownerListingResponse = {
  _id: "listing-1",
  visibility: "PUBLIC",
  listedBy: "user-1",
  buildingId: "building-1",
  rent: 14000,
  availableAt: null,
  building: {
    _id: "building-1",
    name: "Sample Residence",
    location: {
      coordinates: [100.5, 13.7],
    },
  },
}

const validSearchResponse = {
  success: true,
  data: {
    agentProfile: null,
    listings: [ownerListingResponse],
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
  },
}

describe("searchOwnerListings", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ["all", "latest"],
    ["now", "latest"],
    ["soon", "latest"],
    ["private", "oldest"],
  ] as const)(
    "requests owner listings with filter=%s and sort=%s",
    async (filter, sort) => {
      apiClientMocks.get.mockResolvedValueOnce({
        data: {
          ...validSearchResponse,
          pagination: { page: 2, limit: 10, total: 1 },
        },
      })

      await searchOwnerListings({ filter, sort, page: 2, limit: 10 })

      expect(apiClientMocks.get).toHaveBeenCalledWith(
        `/listings?filter=${filter}&sort=${sort}&page=2&limit=10`,
        true,
        undefined,
      )
    },
  )

  it("forwards abort signals to the API client", async () => {
    apiClientMocks.get.mockResolvedValueOnce({ data: validSearchResponse })
    const controller = new AbortController()

    await searchOwnerListings({ signal: controller.signal })

    expect(apiClientMocks.get.mock.calls[0]?.[2]).toBe(controller.signal)
  })

  it("parses a valid owner listings response", async () => {
    apiClientMocks.get.mockResolvedValueOnce({ data: validSearchResponse })

    const result = await searchOwnerListings({ filter: "now" })

    expect(result.data.listings).toHaveLength(1)
    expect(result.data.listings[0]?._id).toBe("listing-1")
    expect(result.data.agentProfile).toBeNull()
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
    })
  })

  it.each([
    ["filter", "bad"],
    ["sort", "bad"],
  ] as const)("rejects invalid %s before calling the API", async (field, value) => {
    await expect(
      searchOwnerListings(
        field === "filter"
          ? { filter: value as never }
          : { sort: value as never },
      ),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })

    expect(apiClientMocks.get).not.toHaveBeenCalled()
  })

  it.each([
    ["page", 0],
    ["limit", 101],
  ] as const)("rejects invalid %s before calling the API", async (field, value) => {
    await expect(
      searchOwnerListings(
        field === "page"
          ? { page: value }
          : { limit: value },
      ),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })

    expect(apiClientMocks.get).not.toHaveBeenCalled()
  })

  it("rejects malformed API responses", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          agentProfile: null,
          listings: "not-an-array",
        },
        pagination: validSearchResponse.pagination,
      },
    })

    await expect(searchOwnerListings()).rejects.toMatchObject({
      status: 500,
      code: "INVALID_OWNER_LISTINGS_RESPONSE",
    })
  })

  it("rejects pagination that does not match the request", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        ...validSearchResponse,
        pagination: {
          page: 2,
          limit: 20,
          total: 1,
        },
      },
    })

    await expect(searchOwnerListings({ page: 1, limit: 20 })).rejects.toBeInstanceOf(
      ApiError,
    )
  })
})
