// src/features/map-search/api/useSearchBuildingsInMap.ts
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
import type { SearchBounds } from "../hooks/useMapBounds"
import { searchBuildingsInMap } from "./searchBuildingsInMap"

type UseSearchBuildingsInMapInput = {
    bounds: SearchBounds | null
    filters: MapSearchFilters
    limit?: number
    enabled: boolean
    includeBuildingsWithoutMatchingListings?: boolean
}

export const buildingsInMapQueryOptions = ({
    bounds,
    filters,
    limit = 20,
    enabled,
    includeBuildingsWithoutMatchingListings,
}: UseSearchBuildingsInMapInput) =>
    infiniteQueryOptions({
        queryKey: queryKeys.mapSearch.buildingResults({
            bounds,
            filters,
            limit,
            includeBuildingsWithoutMatchingListings,
        }),
        enabled: enabled && bounds !== null,
        initialPageParam: 1,
        queryFn: ({ pageParam, signal }) => {
            if (!bounds) {
                throw new ApiError(
                    "Map bounds are required.",
                    422,
                    "VALIDATION_ERROR",
                )
            }

            return searchBuildingsInMap({
                bounds,
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

export function useSearchBuildingsInMap({
    bounds,
    filters,
    limit = 20,
    enabled,
    includeBuildingsWithoutMatchingListings,
}: UseSearchBuildingsInMapInput) {
    return useInfiniteQuery(
        buildingsInMapQueryOptions({
            bounds,
            filters,
            limit,
            enabled,
            includeBuildingsWithoutMatchingListings,
        }),
    )
}
