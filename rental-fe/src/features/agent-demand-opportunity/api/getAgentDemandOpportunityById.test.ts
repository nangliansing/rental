import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"

import { getAgentDemandOpportunityById } from "./getAgentDemandOpportunityById"

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

const opportunity = {
  _id: "6a70f2002c0e518d5b689200",
  status: "Waiting",
  geoSearch: {
    mode: "area",
    bounds: {
      northEast: { lat: 13.78, lng: 100.66 },
      southWest: { lat: 13.75, lng: 100.62 },
    },
    placeName: "Siam",
  },
  filters: {
    minRent: 15000,
    maxRent: 30000,
    bedroomCount: 1,
  },
  createdAt: "2026-08-04T07:30:00.000Z",
  updatedAt: "2026-08-06T07:30:00.000Z",
  lastConfirmedAt: "2026-08-04T07:30:00.000Z",
  myMatchingBuildingCount: 1,
  platformMatchingBuildingCount: 0,
  matchingBuildingCountCapped: false,
}

describe("getAgentDemandOpportunityById", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("requests the detail path with abort signal options", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: true, data: opportunity },
    })
    const controller = new AbortController()

    await getAgentDemandOpportunityById(opportunity._id, controller.signal)

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      `/agent-demand-opportunities/${opportunity._id}`,
      { signal: controller.signal },
    )
  })

  it("allows omitting the abort signal", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: true, data: opportunity },
    })

    await getAgentDemandOpportunityById(opportunity._id)

    expect(apiClientMocks.get).toHaveBeenCalledWith(
      `/agent-demand-opportunities/${opportunity._id}`,
      { signal: undefined },
    )
  })

  it.each([
    ["  spaced-id  ", "/agent-demand-opportunities/spaced-id"],
    ["req/1", "/agent-demand-opportunities/req%2F1"],
    ["a b", "/agent-demand-opportunities/a%20b"],
    ["id?x=1", "/agent-demand-opportunities/id%3Fx%3D1"],
    ["id#hash", "/agent-demand-opportunities/id%23hash"],
  ])("trims/encodes id %j to %s", async (input, path) => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: { ...opportunity, _id: input.trim() },
      },
    })

    await getAgentDemandOpportunityById(input)

    expect(apiClientMocks.get).toHaveBeenCalledWith(path, {
      signal: undefined,
    })
  })

  it("returns the unwrapped public opportunity and treats missing ranking as null", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...opportunity,
          name: "Private name",
          description: "Private note",
          createdBy: "user-1",
        },
      },
    })

    const result = await getAgentDemandOpportunityById(opportunity._id)

    expect(result).toMatchObject({
      _id: opportunity._id,
      status: "Waiting",
      geoSearch: { mode: "area", placeName: "Siam" },
      filters: { minRent: 15000, bedroomCount: 1 },
      myMatchingBuildingCount: 1,
      platformMatchingBuildingCount: 0,
      matchingBuildingCountCapped: false,
      opportunityRanking: null,
    })
    expect(result).not.toHaveProperty("name")
    expect(result).not.toHaveProperty("description")
    expect(result).not.toHaveProperty("createdBy")
  })

  it.each(["", "   ", "\n\t"])(
    "rejects empty opportunity ids before calling the API (%j)",
    async opportunityId => {
      await expect(
        getAgentDemandOpportunityById(opportunityId),
      ).rejects.toMatchObject({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Demand opportunity id is required.",
      })

      expect(apiClientMocks.get).not.toHaveBeenCalled()
    },
  )

  it.each([
    [{ success: false }],
    [{ success: "true", data: opportunity }],
    [null],
    ["body"],
  ])("rejects malformed envelopes (%j)", async body => {
    apiClientMocks.get.mockResolvedValueOnce({ data: body })

    await expect(
      getAgentDemandOpportunityById(opportunity._id),
    ).rejects.toMatchObject({
      status: 500,
      code: "INVALID_AGENT_DEMAND_OPPORTUNITY_RESPONSE",
    })
  })

  it("rejects malformed opportunity payloads", async () => {
    apiClientMocks.get.mockResolvedValueOnce({
      data: { success: true, data: { _id: "broken" } },
    })

    await expect(
      getAgentDemandOpportunityById(opportunity._id),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it.each([
    [401, "ACCESS_TOKEN_REQUIRED", "Please log in to continue."],
    [403, "AGENT_PROFILE_REQUIRED", "An agent profile is required."],
    [
      404,
      "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND",
      "Agent demand opportunity not found",
    ],
    [422, "VALIDATION_ERROR", "opportunityId must be a valid id"],
  ] as const)(
    "propagates %s %s from apiClient",
    async (status, code, message) => {
      apiClientMocks.get.mockRejectedValueOnce(
        new ApiError(message, status, code),
      )

      await expect(
        getAgentDemandOpportunityById(opportunity._id),
      ).rejects.toMatchObject({ status, code, message })
    },
  )

  it("propagates abort rejections from apiClient", async () => {
    const abortError = new DOMException("Aborted", "AbortError")
    apiClientMocks.get.mockRejectedValueOnce(abortError)

    await expect(
      getAgentDemandOpportunityById(
        opportunity._id,
        new AbortController().signal,
      ),
    ).rejects.toBe(abortError)
  })
})
