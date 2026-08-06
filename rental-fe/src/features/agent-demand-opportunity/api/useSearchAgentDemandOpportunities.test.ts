import { describe, expect, it } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import {
  agentDemandOpportunitiesQueryKey,
  agentDemandOpportunitiesQueryOptions,
} from "./useSearchAgentDemandOpportunities"

const pointArea = {
  type: "Point" as const,
  coordinates: [100.5018, 13.7563] as const,
  coverageMeters: 3000,
}

describe("useSearchAgentDemandOpportunities options", () => {
  it("binds the central list key and shared infinite contract", () => {
    const options = agentDemandOpportunitiesQueryOptions({
      area: pointArea,
      matchStatus: "unmatched",
      limit: 20,
    })

    expect(options.queryKey).toEqual(
      agentDemandOpportunitiesQueryKey({
        area: pointArea,
        matchStatus: "unmatched",
        limit: 20,
      }),
    )
    expect(options.queryKey).toEqual(
      queryKeys.agentDemandOpportunities.list({
        area: pointArea,
        matchStatus: "unmatched",
        limit: 20,
      }),
    )
    expect(options.enabled).toBe(true)
    expect(options.initialPageParam).toBe(1)
    expect(options.staleTime).toBe(60_000)
    expect(options.refetchOnWindowFocus).toBe(false)
    expect(options.getNextPageParam).toBeTypeOf("function")
  })

  it("disables when area is missing or invalid", () => {
    expect(
      agentDemandOpportunitiesQueryOptions({
        area: null,
      }).enabled,
    ).toBe(false)

    expect(
      agentDemandOpportunitiesQueryOptions({
        area: pointArea,
        enabled: false,
      }).enabled,
    ).toBe(false)
  })
})
