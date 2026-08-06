import { apiClient, ApiError } from "@/lib/api-client"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  isDemandOpportunityArea,
  normalizePositiveInteger,
  parseDemandOpportunityMatchStatus,
  parseSearchAgentDemandOpportunitiesResponse,
  type DemandOpportunityArea,
  type DemandOpportunityMatchStatus,
  type SearchAgentDemandOpportunitiesResponse,
} from "./agentDemandOpportunityParsers"

export type SearchAgentDemandOpportunitiesInput = {
  area: DemandOpportunityArea
  matchStatus?: DemandOpportunityMatchStatus
  page?: number
  limit?: number
  signal?: AbortSignal
}

const clampPage = (page: unknown) =>
  Math.min(normalizePositiveInteger(page, 1), 10_000)

const clampLimit = (limit: unknown) =>
  Math.min(normalizePositiveInteger(limit, DEFAULT_LISTING_PAGE_SIZE), 100)

export async function searchAgentDemandOpportunities({
  area,
  matchStatus,
  page = 1,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  signal,
}: SearchAgentDemandOpportunitiesInput): Promise<SearchAgentDemandOpportunitiesResponse> {
  if (!isDemandOpportunityArea(area)) {
    throw new ApiError(
      "A valid demand opportunity area is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const normalizedPage = clampPage(page)
  const normalizedLimit = clampLimit(limit)
  const normalizedMatchStatus =
    matchStatus === undefined
      ? undefined
      : parseDemandOpportunityMatchStatus(matchStatus)

  const body: Record<string, unknown> = {
    area,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
    },
  }

  if (normalizedMatchStatus !== undefined) {
    body.matchStatus = normalizedMatchStatus
  }

  const response = await apiClient.post<unknown>(
    "/agent-demand-opportunities/search",
    body,
    true,
    signal,
  )

  return parseSearchAgentDemandOpportunitiesResponse(response.data, {
    page: normalizedPage,
    limit: normalizedLimit,
  })
}
