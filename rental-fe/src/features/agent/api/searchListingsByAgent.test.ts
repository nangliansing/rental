import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"

import { searchListingsByAgent } from "./searchListingsByAgent"

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

const agentListingResponse = {
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
    agentProfile: {
      _id: "agent-1",
      displayName: "Smoke Agent",
      isOnline: true,
      isVerified: false,
      createdAt: "2026-07-20T00:00:00.000Z",
    },
    listings: [agentListingResponse],
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
  },
}

describe("searchListingsByAgent", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ["all", "latest"],
    ["now", "latest"],
    ["soon", "latest"],
  ] as const)(
    "requests agent listings with filter=%s and sort=%s",
    async (filter, sort) => {
      apiClientMocks.get.mockResolvedValueOnce({
        data: {
          ...validSearchResponse,
          pagination: { page: 2, limit: 10, total: 1 },
        },
      })

      await searchListingsByAgent({
        agentProfileId: "agent-1",
        filter,
        sort,
        page: 2,
        limit: 10,
      })

      expect(apiClientMocks.get).toHaveBeenCalledWith(
        `/search/agents/agent-1/listings?page=2&limit=10&filter=${filter}&sort=${sort}`,
        true,
        undefined,
      )
    },
  )

  it("rejects invalid filter values before calling the API", async () => {
    await expect(
      searchListingsByAgent({
        agentProfileId: "agent-1",
        filter: "private" as "all",
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })

    expect(apiClientMocks.get).not.toHaveBeenCalled()
  })

  it("rejects invalid sort values before calling the API", async () => {
    await expect(
      searchListingsByAgent({
        agentProfileId: "agent-1",
        sort: "random" as "latest",
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })

    expect(apiClientMocks.get).not.toHaveBeenCalled()
  })

  it("forwards abort signals to the API client", async () => {
    const controller = new AbortController()
    apiClientMocks.get.mockResolvedValueOnce({ data: validSearchResponse })

    await searchListingsByAgent({
      agentProfileId: "agent-1",
      signal: controller.signal,
    })

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      "/search/agents/agent-1/listings?page=1&limit=20&filter=all&sort=latest",
      true,
      controller.signal,
    )
  })

  it("throws when the response shape is invalid", async () => {
    apiClientMocks.get.mockResolvedValueOnce({ data: { success: true, data: {} } })

    await expect(searchListingsByAgent({ agentProfileId: "agent-1" })).rejects.toBeInstanceOf(
      ApiError,
    )
  })
})
