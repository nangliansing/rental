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

import type { MapSearchFilters } from "../filters/types"
import type { SearchLinesGeometry } from "../types"
import {
  DEFAULT_NEAR_LINES_DISTANCE_METERS,
  DEFAULT_NEAR_LINES_LIMIT,
  searchBuildingsNearLines,
} from "./searchBuildingsNearLines"

type UseSearchBuildingsNearLinesInput = {
  geometry: SearchLinesGeometry | null
  distanceMeters?: number
  filters: MapSearchFilters
  limit?: number
  enabled: boolean
  includeBuildingsWithoutMatchingListings?: boolean
}

export const buildingsNearLinesQueryOptions = ({
  geometry,
  distanceMeters = DEFAULT_NEAR_LINES_DISTANCE_METERS,
  filters,
  limit = DEFAULT_NEAR_LINES_LIMIT,
  enabled,
  includeBuildingsWithoutMatchingListings,
}: UseSearchBuildingsNearLinesInput) =>
  infiniteQueryOptions({
    queryKey: queryKeys.mapSearch.nearLinesBuildingResults({
      geometry,
      distanceMeters,
      filters,
      limit,
      includeBuildingsWithoutMatchingListings,
    }),
    enabled: enabled && geometry !== null,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => {
      if (!geometry) {
        throw new ApiError(
          "Line geometry is required.",
          422,
          "VALIDATION_ERROR",
        )
      }

      return searchBuildingsNearLines({
        geometry,
        distanceMeters,
        filters,
        page: readPageParam(pageParam),
        limit,
        includeBuildingsWithoutMatchingListings,
        signal,
      })
    },
    placeholderData: keepPreviousData,
    getNextPageParam,
  })

export function useSearchBuildingsNearLines({
  geometry,
  distanceMeters = DEFAULT_NEAR_LINES_DISTANCE_METERS,
  filters,
  limit = DEFAULT_NEAR_LINES_LIMIT,
  enabled,
  includeBuildingsWithoutMatchingListings,
}: UseSearchBuildingsNearLinesInput) {
  return useInfiniteQuery(
    buildingsNearLinesQueryOptions({
      geometry,
      distanceMeters,
      filters,
      limit,
      enabled,
      includeBuildingsWithoutMatchingListings,
    }),
  )
}
