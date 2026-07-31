import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"

import { searchBuildingFollowers } from "./searchBuildingFollowers"

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

const followerRow = {
  _id: "follow-1",
  userId: "user-1",
  buildingId: "building-1",
  createdAt: "2026-07-31T10:15:30.123Z",
  updatedAt: "2026-07-31T10:15:30.123Z",
  user: {
    _id: "user-1",
    name: "Jane Doe",
    displayName: "Fetch Agent",
    profilePhoto: null,
    isVerified: false,
  },
}

const validSearchResponse = {
  success: true,
  data: {
    followers: [followerRow],
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
  },
}

describe("searchBuildingFollowers", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("trims and encodes the building id and forwards pagination params", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        ...validSearchResponse,
        pagination: { page: 2, limit: 10, total: 1 },
      },
    })

    await searchBuildingFollowers({
      buildingId: "  building / 1  ",
      page: 2,
      limit: 10,
    })

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      "/building-follows/buildings/building%20%2F%201?page=2&limit=10",
      { signal: undefined },
    )
  })

  it("forwards abort signals to the API client", async () => {
    apiClientMocks.get.mockResolvedValueOnce({ data: validSearchResponse })
    const controller = new AbortController()

    await searchBuildingFollowers({
      buildingId: "building-1",
      signal: controller.signal,
    })

    expect(apiClientMocks.get.mock.calls[0]?.[1]).toEqual({
      signal: controller.signal,
    })
  })

  it("parses a valid followers response", async () => {
    apiClientMocks.get.mockResolvedValueOnce({ data: validSearchResponse })

    const result = await searchBuildingFollowers({ buildingId: "building-1" })

    expect(result.data.followers).toHaveLength(1)
    expect(result.data.followers[0]?.user?.displayName).toBe("Fetch Agent")
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
    })
  })

  it("accepts null user snapshots in follower rows", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          followers: [{ ...followerRow, user: null }],
        },
        pagination: validSearchResponse.pagination,
      },
    })

    const result = await searchBuildingFollowers({ buildingId: "building-1" })

    expect(result.data.followers[0]?.user).toBeNull()
  })

  it.each([
    ["page", 0, 1],
    ["limit", 101, 100],
  ] as const)("clamps invalid %s before requesting", async (field, input, expected) => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        ...validSearchResponse,
        pagination: {
          page: field === "page" ? expected : 1,
          limit: field === "limit" ? expected : 20,
          total: 1,
        },
      },
    })

    await searchBuildingFollowers({
      buildingId: "building-1",
      ...(field === "page" ? { page: input } : { limit: input }),
    })

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      expect.stringContaining(
        field === "page" ? `page=${expected}` : `limit=${expected}`,
      ),
      expect.any(Object),
    )
  })

  it("rejects malformed API responses", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          followers: "not-an-array",
        },
        pagination: validSearchResponse.pagination,
      },
    })

    await expect(
      searchBuildingFollowers({ buildingId: "building-1" }),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_BUILDING_FOLLOW_RESPONSE",
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

    await expect(
      searchBuildingFollowers({ buildingId: "building-1", page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
