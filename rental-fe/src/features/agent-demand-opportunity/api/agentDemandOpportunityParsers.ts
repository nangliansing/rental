import { ApiError } from "@/lib/api-client"
import {
  normalizePositiveInteger,
  parsePagination,
  readBoolean,
  readNullableString,
  readNumber,
  readRecord,
  readString,
} from "@/features/listing/api/listingResponseParsers"
import type { Pagination } from "@/features/map-search/types"
import {
  parseSavedSearchFilters,
  parseSavedSearchGeoSearch,
  parseSavedSearchMatchingBuildingCount,
  parseSavedSearchStatus,
  type SavedSearchFilters,
  type SavedSearchGeoSearch,
  type SavedSearchStatus,
} from "@/features/saved-search/api/savedSearchParsers"

export { normalizePositiveInteger }

/** GeoJSON `[longitude, latitude]`. */
export type DemandOpportunityLngLat = readonly [number, number]

export type DemandOpportunityPointArea = {
  type: "Point"
  coordinates: DemandOpportunityLngLat
  coverageMeters: number
}

export type DemandOpportunityLineStringArea = {
  type: "LineString"
  coordinates: DemandOpportunityLngLat[]
  coverageMeters: number
}

export type DemandOpportunityMultiLineStringArea = {
  type: "MultiLineString"
  coordinates: DemandOpportunityLngLat[][]
  coverageMeters: number
}

export type DemandOpportunityPolygonArea = {
  type: "Polygon"
  coordinates: DemandOpportunityLngLat[][]
}

export type DemandOpportunityMultiPolygonArea = {
  type: "MultiPolygon"
  coordinates: DemandOpportunityLngLat[][][]
}

export type DemandOpportunityArea =
  | DemandOpportunityPointArea
  | DemandOpportunityLineStringArea
  | DemandOpportunityMultiLineStringArea
  | DemandOpportunityPolygonArea
  | DemandOpportunityMultiPolygonArea

export type DemandOpportunityMatchStatus = "matched" | "unmatched"

export type DemandOpportunityRanking = {
  score: number
  inventoryGapScore: number
  freshnessScore: number
  policyVersion: string
}

/**
 * Allowlisted SavedSearch slice returned by demand opportunity search.
 * Does not include owner-private fields like `name`, `description`,
 * `createdBy`, or deletion metadata.
 */
export type AgentDemandOpportunity = {
  _id: string
  status: SavedSearchStatus
  geoSearch: SavedSearchGeoSearch
  filters: SavedSearchFilters
  createdAt: string
  updatedAt: string
  lastConfirmedAt?: string | null
  myMatchingBuildingCount: number | null
  platformMatchingBuildingCount: number | null
  matchingBuildingCountCapped: boolean
  opportunityRanking: DemandOpportunityRanking | null
}

export type SearchAgentDemandOpportunitiesResponse = {
  success: true
  data: AgentDemandOpportunity[]
  pagination: Pagination
}

export type GetAgentDemandOpportunityByIdResponse = {
  success: true
  data: AgentDemandOpportunity
}

const MATCH_STATUSES = new Set<DemandOpportunityMatchStatus>([
  "matched",
  "unmatched",
])

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const parseOpportunityRanking = (
  value: unknown,
): DemandOpportunityRanking | null => {
  if (value == null) return null

  const ranking = readRecord(value)
  const score = readNumber(ranking.score)
  const inventoryGapScore = readNumber(ranking.inventoryGapScore)
  const freshnessScore = readNumber(ranking.freshnessScore)
  const policyVersion = readString(ranking.policyVersion).trim()

  if (
    score == null ||
    inventoryGapScore == null ||
    freshnessScore == null ||
    !policyVersion
  ) {
    return null
  }

  return {
    score,
    inventoryGapScore,
    freshnessScore,
    policyVersion,
  }
}

export const parseDemandOpportunityMatchStatus = (
  value: unknown,
): DemandOpportunityMatchStatus | undefined => {
  if (value === undefined) return undefined
  if (
    typeof value === "string" &&
    MATCH_STATUSES.has(value as DemandOpportunityMatchStatus)
  ) {
    return value as DemandOpportunityMatchStatus
  }

  throw new ApiError(
    "matchStatus must be matched or unmatched",
    422,
    "VALIDATION_ERROR",
  )
}

export const parseAgentDemandOpportunity = (
  value: unknown,
): AgentDemandOpportunity => {
  const opportunity = readRecord(value)
  const id = readString(opportunity._id)
  const createdAt = readString(opportunity.createdAt)
  const updatedAt = readString(opportunity.updatedAt)

  if (!id || !createdAt || !updatedAt) {
    throw new ApiError(
      "Demand opportunity response is missing required data.",
      500,
      "INVALID_AGENT_DEMAND_OPPORTUNITY_RESPONSE",
    )
  }

  return {
    _id: id,
    status: parseSavedSearchStatus(opportunity.status),
    geoSearch: parseSavedSearchGeoSearch(opportunity.geoSearch),
    filters: parseSavedSearchFilters(opportunity.filters),
    createdAt,
    updatedAt,
    lastConfirmedAt:
      "lastConfirmedAt" in opportunity
        ? readNullableString(opportunity.lastConfirmedAt)
        : undefined,
    myMatchingBuildingCount: parseSavedSearchMatchingBuildingCount(
      opportunity.myMatchingBuildingCount,
    ),
    platformMatchingBuildingCount: parseSavedSearchMatchingBuildingCount(
      opportunity.platformMatchingBuildingCount,
    ),
    matchingBuildingCountCapped: readBoolean(
      opportunity.matchingBuildingCountCapped,
    ),
    opportunityRanking: parseOpportunityRanking(opportunity.opportunityRanking),
  }
}

export const parseSearchAgentDemandOpportunitiesResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchAgentDemandOpportunitiesResponse => {
  const body = readRecord(value)

  if (body.success !== true || !Array.isArray(body.data)) {
    throw new ApiError(
      "Demand opportunity search response is invalid.",
      500,
      "INVALID_AGENT_DEMAND_OPPORTUNITY_SEARCH_RESPONSE",
    )
  }

  return {
    success: true,
    data: body.data.map(parseAgentDemandOpportunity),
    pagination: parsePagination(body.pagination, fallback),
  }
}

export const parseGetAgentDemandOpportunityByIdResponse = (
  value: unknown,
): GetAgentDemandOpportunityByIdResponse => {
  const body = readRecord(value)

  if (body.success !== true) {
    throw new ApiError(
      "Demand opportunity response is missing required data.",
      500,
      "INVALID_AGENT_DEMAND_OPPORTUNITY_RESPONSE",
    )
  }

  return {
    success: true,
    data: parseAgentDemandOpportunity(body.data),
  }
}

/** Lightweight gate so we do not send empty queries; backend still validates fully. */
export function isDemandOpportunityArea(
  value: unknown,
): value is DemandOpportunityArea {
  if (!value || typeof value !== "object") return false

  const area = value as { type?: unknown; coordinates?: unknown }
  if (typeof area.type !== "string" || !Array.isArray(area.coordinates)) {
    return false
  }

  switch (area.type) {
    case "Point":
      return (
        area.coordinates.length === 2 &&
        isFiniteNumber(area.coordinates[0]) &&
        isFiniteNumber(area.coordinates[1]) &&
        isFiniteNumber((value as DemandOpportunityPointArea).coverageMeters)
      )
    case "LineString":
    case "MultiLineString":
      return (
        area.coordinates.length > 0 &&
        isFiniteNumber(
          (value as DemandOpportunityLineStringArea).coverageMeters,
        )
      )
    case "Polygon":
    case "MultiPolygon":
      return area.coordinates.length > 0
    default:
      return false
  }
}
