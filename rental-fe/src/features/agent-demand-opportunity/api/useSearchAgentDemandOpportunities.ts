import {
  infiniteQueryOptions,
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import {
  getNextPageParam,
  readPageParam,
} from "@/lib/query-pagination"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  isDemandOpportunityArea,
  type DemandOpportunityArea,
  type DemandOpportunityMatchStatus,
} from "./agentDemandOpportunityParsers"
import { searchAgentDemandOpportunities } from "./searchAgentDemandOpportunities"

/** Fresh for one minute so reopening the same scan area + tab reuses cache. */
export const AGENT_DEMAND_OPPORTUNITIES_STALE_TIME_MS = 60_000

export const agentDemandOpportunitiesQueryKey = ({
  area,
  matchStatus,
  limit,
}: {
  area: DemandOpportunityArea
  matchStatus?: DemandOpportunityMatchStatus
  limit: number
}) =>
  queryKeys.agentDemandOpportunities.list({
    area,
    matchStatus: matchStatus ?? null,
    limit,
  })

type UseSearchAgentDemandOpportunitiesInput = {
  area: DemandOpportunityArea | null | undefined
  matchStatus?: DemandOpportunityMatchStatus
  limit?: number
  enabled?: boolean
}

export const agentDemandOpportunitiesQueryOptions = ({
  area,
  matchStatus,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchAgentDemandOpportunitiesInput) => {
  const hasArea = isDemandOpportunityArea(area)

  return infiniteQueryOptions({
    queryKey: queryKeys.agentDemandOpportunities.list({
      area: hasArea ? area : null,
      matchStatus: matchStatus ?? null,
      limit,
    }),
    enabled: enabled && hasArea,
    staleTime: AGENT_DEMAND_OPPORTUNITIES_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      if (!isDemandOpportunityArea(area)) {
        throw new ApiError(
          "A valid demand opportunity area is required.",
          422,
          "VALIDATION_ERROR",
        )
      }

      return searchAgentDemandOpportunities({
        area,
        matchStatus,
        page: readPageParam(pageParam),
        limit,
        signal,
      })
    },
    placeholderData: keepPreviousData,
    getNextPageParam,
  })
}

export function useSearchAgentDemandOpportunities({
  area,
  matchStatus,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchAgentDemandOpportunitiesInput) {
  return useInfiniteQuery(
    agentDemandOpportunitiesQueryOptions({
      area,
      matchStatus,
      limit,
      enabled,
    }),
  )
}
