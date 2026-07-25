import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import type { MapSearchFilters } from "../filters/types"
import type { MapPosition } from "../types"
import { searchBuildingsNearby } from "./searchBuildingsNearby"

type UseSearchBuildingsNearbyInput = {
  position: MapPosition | null
  radiusMeters: number
  filters: MapSearchFilters
  limit?: number
  enabled: boolean
  includeBuildingsWithoutMatchingListings?: boolean
}

export function useSearchBuildingsNearby({
  position,
  radiusMeters,
  filters,
  limit = 20,
  enabled,
  includeBuildingsWithoutMatchingListings,
}: UseSearchBuildingsNearbyInput) {
  return useQuery({
    queryKey: queryKeys.mapSearch.nearbyBuildingResults({
      position,
      radiusMeters,
      filters,
      limit,
      includeBuildingsWithoutMatchingListings,
    }),
    enabled: enabled && position !== null,
    queryFn: ({ signal }) => {
      if (!position) {
        throw new ApiError(
          "A nearby-search position is required.",
          422,
          "VALIDATION_ERROR",
        )
      }

      return searchBuildingsNearby({
        position,
        radiusMeters,
        filters,
        limit,
        includeBuildingsWithoutMatchingListings,
        signal,
      })
    },
    placeholderData: keepPreviousData,
  })
}
