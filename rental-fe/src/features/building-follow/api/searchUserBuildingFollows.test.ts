import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { createSearchBuilding } from "@/test/fixtures/listings"

import { searchUserBuildingFollows } from "./searchUserBuildingFollows"

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

const followingRow = {
  _id: "follow-1",
  buildingId: "building-1",
  createdAt: "2026-07-31T10:15:30.123Z",
  updatedAt: "2026-07-31T10:15:30.123Z",
  building: createSearchBuilding(),
}

const validSearchResponse = {
  success: true,
  data: {
    followings: [followingRow],
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
  },
}

describe("searchUserBuildingFollows", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("trims and encodes the user id and forwards pagination params", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        ...validSearchResponse,
        pagination: { page: 2, limit: 10, total: 1 },
      },
    })

    await searchUserBuildingFollows({
      userId: "  user / 1  ",
      page: 2,
      limit: 10,
    })

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      "/building-follows/users/user%20%2F%201?page=2&limit=10",
      true,
      undefined,
    )
  })

  it("forwards abort signals to the API client", async () => {
    apiClientMocks.get.mockResolvedValueOnce({ data: validSearchResponse })
    const controller = new AbortController()

    await searchUserBuildingFollows({
      userId: "user-1",
      signal: controller.signal,
    })

    expect(apiClientMocks.get.mock.calls[0]?.[2]).toBe(controller.signal)
  })

  it("parses a valid followings response", async () => {
    apiClientMocks.get.mockResolvedValueOnce({ data: validSearchResponse })

    const result = await searchUserBuildingFollows({ userId: "user-1" })

    expect(result.data.followings).toHaveLength(1)
    expect(result.data.followings[0]?.building?.name).toBe("Bangkapi Residence")
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
    })
  })

  it("accepts null building snapshots in follow rows", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          followings: [
            {
              ...followingRow,
              building: null,
            },
          ],
        },
        pagination: validSearchResponse.pagination,
      },
    })

    const result = await searchUserBuildingFollows({ userId: "user-1" })

    expect(result.data.followings[0]?.building).toBeNull()
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

    await searchUserBuildingFollows({
      userId: "user-1",
      ...(field === "page" ? { page: input } : { limit: input }),
    })

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      expect.stringContaining(
        field === "page" ? `page=${expected}` : `limit=${expected}`,
      ),
      true,
      undefined,
    )
  })

  it("rejects malformed API responses", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          followings: "not-an-array",
        },
        pagination: validSearchResponse.pagination,
      },
    })

    await expect(
      searchUserBuildingFollows({ userId: "user-1" }),
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
      searchUserBuildingFollows({ userId: "user-1", page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(ApiError)
  })
})
