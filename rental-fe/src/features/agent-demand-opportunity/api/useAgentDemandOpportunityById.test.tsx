import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import {
  AGENT_DEMAND_OPPORTUNITY_DETAIL_STALE_TIME_MS,
  agentDemandOpportunityQueryKey,
  agentDemandOpportunityQueryOptions,
  useAgentDemandOpportunityById,
} from "./useAgentDemandOpportunityById"

const getAgentDemandOpportunityById = vi.hoisted(() => vi.fn())

vi.mock("./getAgentDemandOpportunityById", () => ({
  getAgentDemandOpportunityById,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

function pendingSignals() {
  const signals: AbortSignal[] = []
  getAgentDemandOpportunityById.mockImplementation(
    (_id: string, signal?: AbortSignal) => {
      if (signal) signals.push(signal)
      return new Promise(() => undefined)
    },
  )
  return signals
}

const sampleOpportunity = {
  _id: "opportunity-1",
  status: "Waiting" as const,
  geoSearch: { mode: "area" as const },
  filters: {},
  createdAt: "2026-08-04T07:30:00.000Z",
  updatedAt: "2026-08-06T07:30:00.000Z",
  lastConfirmedAt: "2026-08-04T07:30:00.000Z",
  myMatchingBuildingCount: 1,
  platformMatchingBuildingCount: 0,
  matchingBuildingCountCapped: false,
  opportunityRanking: null,
}

describe("agentDemandOpportunityQueryOptions", () => {
  it("builds query keys from the central factory", () => {
    expect(agentDemandOpportunityQueryKey("opportunity-1")).toEqual(
      queryKeys.agentDemandOpportunities.detail("opportunity-1"),
    )
    expect(agentDemandOpportunityQueryKey(undefined)).toEqual(
      queryKeys.agentDemandOpportunities.detail(undefined),
    )
  })

  it("keeps detail keys outside the list family", () => {
    const detailKey = agentDemandOpportunityQueryKey("opportunity-1")
    const listKey = queryKeys.agentDemandOpportunities.list({
      area: {
        type: "Point",
        coordinates: [100.5, 13.7],
        coverageMeters: 1000,
      },
      matchStatus: null,
      limit: 20,
    })

    expect(detailKey).toEqual(["agent-demand-opportunity", "opportunity-1"])
    expect(detailKey[0]).not.toBe(listKey[0])
    expect(queryKeys.agentDemandOpportunities.details).toEqual([
      "agent-demand-opportunity",
    ])
    expect(detailKey.slice(0, 1)).toEqual(
      queryKeys.agentDemandOpportunities.details,
    )
  })

  it("defaults to enabled for a usable id with list-aligned cache policy", () => {
    const options = agentDemandOpportunityQueryOptions("opportunity-1")

    expect(options.enabled).toBe(true)
    expect(options.staleTime).toBe(AGENT_DEMAND_OPPORTUNITY_DETAIL_STALE_TIME_MS)
    expect(options.refetchOnWindowFocus).toBe(false)
    expect(typeof options.queryFn).toBe("function")
  })

  it("forwards AbortSignal and id to the fetcher", async () => {
    getAgentDemandOpportunityById.mockResolvedValueOnce(sampleOpportunity)
    const options = agentDemandOpportunityQueryOptions("opportunity-1")
    const controller = new AbortController()

    await options.queryFn!({
      signal: controller.signal,
      queryKey: options.queryKey,
      meta: undefined,
      client: new QueryClient(),
    })

    expect(getAgentDemandOpportunityById).toHaveBeenCalledWith(
      "opportunity-1",
      controller.signal,
    )
  })

  it("passes an empty string through to the fetcher when id is missing", async () => {
    getAgentDemandOpportunityById.mockRejectedValueOnce(
      new ApiError(
        "Demand opportunity id is required.",
        422,
        "VALIDATION_ERROR",
      ),
    )
    const options = agentDemandOpportunityQueryOptions(undefined)

    await expect(
      options.queryFn!({
        signal: new AbortController().signal,
        queryKey: options.queryKey,
        meta: undefined,
        client: new QueryClient(),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" })

    expect(getAgentDemandOpportunityById).toHaveBeenCalledWith(
      "",
      expect.any(AbortSignal),
    )
  })

  it.each([undefined, "", "   "])(
    "disables the query for missing/blank id %j",
    opportunityId => {
      expect(
        agentDemandOpportunityQueryOptions(opportunityId).enabled,
      ).toBe(false)
    },
  )

  it("honors explicit enabled=false", () => {
    expect(
      agentDemandOpportunityQueryOptions("opportunity-1", false).enabled,
    ).toBe(false)
  })
})

describe("useAgentDemandOpportunityById", () => {
  it("loads an opportunity by id", async () => {
    getAgentDemandOpportunityById.mockResolvedValueOnce(sampleOpportunity)

    const { result } = renderHook(
      () => useAgentDemandOpportunityById({ opportunityId: "opportunity-1" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(sampleOpportunity)
    expect(getAgentDemandOpportunityById).toHaveBeenCalledWith(
      "opportunity-1",
      expect.any(AbortSignal),
    )
  })

  it("does not fetch when disabled or missing id", async () => {
    getAgentDemandOpportunityById.mockClear()

    const { result: missing } = renderHook(
      () => useAgentDemandOpportunityById({}),
      { wrapper: createWrapper() },
    )
    const { result: disabled } = renderHook(
      () =>
        useAgentDemandOpportunityById({
          opportunityId: "opportunity-1",
          enabled: false,
        }),
      { wrapper: createWrapper() },
    )

    expect(missing.current.fetchStatus).toBe("idle")
    expect(disabled.current.fetchStatus).toBe("idle")
    expect(getAgentDemandOpportunityById).not.toHaveBeenCalled()
  })

  it("aborts the in-flight request when the id changes", async () => {
    const signals = pendingSignals()

    const { rerender } = renderHook(
      ({ opportunityId }: { opportunityId: string }) =>
        useAgentDemandOpportunityById({ opportunityId }),
      {
        wrapper: createWrapper(),
        initialProps: { opportunityId: "opportunity-1" },
      },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ opportunityId: "opportunity-2" })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
  })

  it("surfaces fetcher errors", async () => {
    getAgentDemandOpportunityById.mockRejectedValueOnce(
      new ApiError(
        "Agent demand opportunity not found",
        404,
        "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND",
      ),
    )

    const { result } = renderHook(
      () => useAgentDemandOpportunityById({ opportunityId: "missing" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      code: "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND",
    })
  })
})
