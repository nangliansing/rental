import { apiClient } from "@/lib/api-client"

import type { MapSearchFilters } from "../filters/types"
import type {
  SearchBuildingsNearLinesResponse,
  SearchLinesGeometry,
} from "../types"
import { buildSearchBuildingsRequestBody } from "./buildSearchBuildingsRequestBody"
import { parseSearchBuildingsNearLinesResponse } from "./mapSearchResponseParsers"

export const DEFAULT_NEAR_LINES_DISTANCE_METERS = 500
export const DEFAULT_NEAR_LINES_LIMIT = 20

export type SearchBuildingsNearLinesInput = {
  geometry: SearchLinesGeometry
  distanceMeters?: number
  filters?: MapSearchFilters
  page?: number
  limit?: number
  includeBuildingsWithoutMatchingListings?: boolean
  signal?: AbortSignal
}

export async function searchBuildingsNearLines({
  geometry,
  distanceMeters = DEFAULT_NEAR_LINES_DISTANCE_METERS,
  filters = {},
  page = 1,
  limit = DEFAULT_NEAR_LINES_LIMIT,
  includeBuildingsWithoutMatchingListings,
  signal,
}: SearchBuildingsNearLinesInput): Promise<SearchBuildingsNearLinesResponse> {
  const response = await apiClient.post<unknown>(
    "/search/buildings/near-lines",
    {
      geometry,
      distanceMeters,
      ...buildSearchBuildingsRequestBody({
        filters,
        includeBuildingsWithoutMatchingListings,
      }),
      page,
      limit,
    },
    true,
    signal,
  )

  return parseSearchBuildingsNearLinesResponse(response.data, { page, limit })
}
