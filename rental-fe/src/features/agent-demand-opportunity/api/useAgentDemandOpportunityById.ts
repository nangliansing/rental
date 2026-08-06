import { queryOptions, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import { getAgentDemandOpportunityById } from "./getAgentDemandOpportunityById"

/** Align with list stale window so reopen of the same detail reuses cache. */
export const AGENT_DEMAND_OPPORTUNITY_DETAIL_STALE_TIME_MS = 60_000

export const agentDemandOpportunityQueryKey = (
  opportunityId: string | undefined,
) => queryKeys.agentDemandOpportunities.detail(opportunityId)

export const agentDemandOpportunityQueryOptions = (
  opportunityId?: string,
  enabled = true,
) =>
  queryOptions({
    queryKey: agentDemandOpportunityQueryKey(opportunityId),
    enabled: enabled && Boolean(opportunityId?.trim()),
    staleTime: AGENT_DEMAND_OPPORTUNITY_DETAIL_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) =>
      getAgentDemandOpportunityById(opportunityId ?? "", signal),
  })

type UseAgentDemandOpportunityByIdInput = {
  opportunityId?: string
  enabled?: boolean
}

export function useAgentDemandOpportunityById({
  opportunityId,
  enabled = true,
}: UseAgentDemandOpportunityByIdInput) {
  return useQuery(agentDemandOpportunityQueryOptions(opportunityId, enabled))
}
