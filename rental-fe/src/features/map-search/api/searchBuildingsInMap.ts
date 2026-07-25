// src/features/map-search/api/searchBuildingsInMap.ts

import { apiClient } from "@/lib/api-client"

import type { MapSearchFilters } from "../filters/types"
import type { SearchBounds } from "../hooks/useMapBounds"
import type { SearchBuildingsInMapResponse } from "../types"
import { buildSearchBuildingsRequestBody } from "./buildSearchBuildingsRequestBody"
import { parseSearchBuildingsInMapResponse } from "./mapSearchResponseParsers"

export type SearchBuildingsInMapInput = {
  bounds: SearchBounds
  filters?: MapSearchFilters
  page?: number
  limit?: number
  includeBuildingsWithoutMatchingListings?: boolean
  signal?: AbortSignal
}

export async function searchBuildingsInMap({
  bounds,
  filters = {},
  page = 1,
  limit = 20,
  includeBuildingsWithoutMatchingListings,
  signal,
}: SearchBuildingsInMapInput): Promise<SearchBuildingsInMapResponse> {
  const response = await apiClient.post<unknown>(
    "/search/buildings/map",
    {
      bounds,
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

  return parseSearchBuildingsInMapResponse(response.data, { page, limit })
}
