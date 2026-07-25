// src/features/map-search/api/searchListingsInBuilding.ts
import { apiClient } from "@/lib/api-client"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import type { MapSearchFilters } from "../filters/types"
import type { SearchListingsInBuildingResponse } from "../types"
import { parseSearchListingsInBuildingResponse } from "./mapSearchResponseParsers"

const DEFAULT_LISTINGS_IN_BUILDING_PAGE = 1

export type SearchListingsInBuildingInput = {
  buildingId: string
  filters?: MapSearchFilters
  page?: number
  limit?: number
  signal?: AbortSignal
}

export async function searchListingsInBuilding({
  buildingId,
  filters = {},
  page = DEFAULT_LISTINGS_IN_BUILDING_PAGE,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  signal,
}: SearchListingsInBuildingInput): Promise<SearchListingsInBuildingResponse> {
  const response = await apiClient.post<unknown>(
    `/search/buildings/${buildingId}/listings`,
    {
      ...filters,
      page,
      limit,
    },
    true,
    signal,
  )

  return parseSearchListingsInBuildingResponse(response.data, { page, limit })
}
