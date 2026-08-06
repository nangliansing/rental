import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseGetAgentDemandOpportunityByIdResponse,
  type AgentDemandOpportunity,
} from "./agentDemandOpportunityParsers"

export async function getAgentDemandOpportunityById(
  opportunityId: string,
  signal?: AbortSignal,
): Promise<AgentDemandOpportunity> {
  const normalizedOpportunityId = opportunityId.trim()

  if (!normalizedOpportunityId) {
    throw new ApiError(
      "Demand opportunity id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.get<unknown>(
    `/agent-demand-opportunities/${encodeURIComponent(normalizedOpportunityId)}`,
    { signal },
  )

  return parseGetAgentDemandOpportunityByIdResponse(response.data).data
}
