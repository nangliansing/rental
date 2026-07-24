import { apiClient } from "@/lib/api-client"

import type { MapSearchFilters } from "../filters/types"
import type { MapPosition, SearchBuildingsNearbyResponse } from "../types"
import { buildSearchBuildingsRequestBody } from "./buildSearchBuildingsRequestBody"
import { parseSearchBuildingsNearbyResponse } from "./mapSearchResponseParsers"

const DEFAULT_NEARBY_RADIUS_METERS = 300
const DEFAULT_NEARBY_LIMIT = 20

export type SearchBuildingsNearbyInput = {
  position: MapPosition
  radiusMeters?: number
  filters?: MapSearchFilters
  limit?: number
  includeBuildingsWithoutMatchingListings?: boolean
  signal?: AbortSignal
}

export async function searchBuildingsNearby({
  position,
  radiusMeters = DEFAULT_NEARBY_RADIUS_METERS,
  filters = {},
  limit = DEFAULT_NEARBY_LIMIT,
  includeBuildingsWithoutMatchingListings,
  signal,
}: SearchBuildingsNearbyInput): Promise<SearchBuildingsNearbyResponse> {
  const response = await apiClient.post<unknown>(
    "/search/buildings/nearby",
    {
      position,
      radiusMeters,
      ...buildSearchBuildingsRequestBody({
        filters,
        includeBuildingsWithoutMatchingListings,
      }),
      limit,
    },
    true,
    signal,
  )

  return parseSearchBuildingsNearbyResponse(response.data)
}
