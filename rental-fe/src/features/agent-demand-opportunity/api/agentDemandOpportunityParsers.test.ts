import { describe, expect, it, vi, beforeEach } from "vitest"

import { ApiError } from "@/lib/api-client"

import {
  isDemandOpportunityArea,
  parseAgentDemandOpportunity,
  parseDemandOpportunityMatchStatus,
  parseGetAgentDemandOpportunityByIdResponse,
  parseSearchAgentDemandOpportunitiesResponse,
} from "./agentDemandOpportunityParsers"
import { searchAgentDemandOpportunities } from "./searchAgentDemandOpportunities"

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>(
    "@/lib/api-client",
  )

  return {
    ...actual,
    apiClient: {
      post: vi.fn(),
    },
  }
})

import { apiClient } from "@/lib/api-client"

const mockedPost = vi.mocked(apiClient.post)

beforeEach(() => {
  mockedPost.mockReset()
})

const sampleOpportunity = {
  _id: "opportunity-1",
  status: "Waiting",
  geoSearch: {
    mode: "area",
    bounds: {
      northEast: { lat: 13.751, lng: 100.541 },
      southWest: { lat: 13.743, lng: 100.532 },
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
  myMatchingBuildingCount: 0,
  platformMatchingBuildingCount: 1,
  matchingBuildingCountCapped: false,
  opportunityRanking: {
    score: 0.835,
    inventoryGapScore: 0.8,
    freshnessScore: 0.9,
    policyVersion: "v1",
  },
}

const pointArea = {
  type: "Point" as const,
  coordinates: [100.5018, 13.7563] as const,
  coverageMeters: 3000,
}

describe("agentDemandOpportunityParsers", () => {
  it("parses an opportunity allowlist row", () => {
    expect(parseAgentDemandOpportunity(sampleOpportunity)).toEqual({
      _id: "opportunity-1",
      status: "Waiting",
      geoSearch: {
        mode: "area",
        bounds: {
          northEast: { lat: 13.751, lng: 100.541 },
          southWest: { lat: 13.743, lng: 100.532 },
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
      myMatchingBuildingCount: 0,
      platformMatchingBuildingCount: 1,
      matchingBuildingCountCapped: false,
      opportunityRanking: {
        score: 0.835,
        inventoryGapScore: 0.8,
        freshnessScore: 0.9,
        policyVersion: "v1",
      },
    })
  })

  it("ignores owner-private fields if the API accidentally leaks them", () => {
    const parsed = parseAgentDemandOpportunity({
      ...sampleOpportunity,
      name: "Private name",
      description: "Private note",
      createdBy: "user-1",
    })

    expect(parsed).not.toHaveProperty("name")
    expect(parsed).not.toHaveProperty("description")
    expect(parsed).not.toHaveProperty("createdBy")
  })

  it("treats matched opportunities with null ranking as null", () => {
    expect(
      parseAgentDemandOpportunity({
        ...sampleOpportunity,
        opportunityRanking: null,
      }).opportunityRanking,
    ).toBeNull()
  })

  it("parses a get-by-id envelope and tolerates omitted ranking", () => {
    const { opportunityRanking: _ranking, ...detailWithoutRanking } =
      sampleOpportunity

    expect(
      parseGetAgentDemandOpportunityByIdResponse({
        success: true,
        data: detailWithoutRanking,
      }),
    ).toEqual({
      success: true,
      data: {
        ...parseAgentDemandOpportunity(detailWithoutRanking),
        opportunityRanking: null,
      },
    })
  })

  it("rejects malformed get-by-id envelopes", () => {
    expect(() =>
      parseGetAgentDemandOpportunityByIdResponse({
        success: false,
        data: sampleOpportunity,
      }),
    ).toThrow(ApiError)

    expect(() =>
      parseGetAgentDemandOpportunityByIdResponse({
        success: true,
        data: { _id: "broken" },
      }),
    ).toThrow(ApiError)
  })

  it("rejects malformed search payloads", () => {
    expect(() =>
      parseSearchAgentDemandOpportunitiesResponse(
        { success: true, data: "nope" },
        { page: 1, limit: 20 },
      ),
    ).toThrow(ApiError)
  })

  it("validates matchStatus defensively", () => {
    expect(parseDemandOpportunityMatchStatus(undefined)).toBeUndefined()
    expect(parseDemandOpportunityMatchStatus("unmatched")).toBe("unmatched")
    expect(() => parseDemandOpportunityMatchStatus("maybe")).toThrow(ApiError)
  })

  it("gates incomplete areas", () => {
    expect(isDemandOpportunityArea(pointArea)).toBe(true)
    expect(
      isDemandOpportunityArea({
        type: "Point",
        coordinates: [100.5, 13.7],
      }),
    ).toBe(false)
    expect(isDemandOpportunityArea(null)).toBe(false)
  })
})

describe("searchAgentDemandOpportunities", () => {
  it("posts a clamped paginated body and parses the response", async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        success: true,
        data: [sampleOpportunity],
        pagination: { page: 1, limit: 20, total: 1 },
      },
    } as never)

    const signal = new AbortController().signal
    const result = await searchAgentDemandOpportunities({
      area: pointArea,
      matchStatus: "unmatched",
      page: 1,
      limit: 20,
      signal,
    })

    expect(mockedPost).toHaveBeenCalledWith(
      "/agent-demand-opportunities/search",
      {
        area: pointArea,
        matchStatus: "unmatched",
        pagination: { page: 1, limit: 20 },
      },
      true,
      signal,
    )
    expect(result.data).toHaveLength(1)
    expect(result.pagination.total).toBe(1)
  })

  it("rejects an invalid area before calling the API", async () => {
    await expect(
      searchAgentDemandOpportunities({
        area: { type: "Point", coordinates: [1, 2] } as never,
      }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(mockedPost).not.toHaveBeenCalled()
  })
})
