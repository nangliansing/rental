// src/features/map-search/api/useSearchBuildingsInMap.ts
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

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

export function useSearchBuildingsInMap({
    bounds,
    filters,
    limit = 20,
    enabled,
    includeBuildingsWithoutMatchingListings,
}: UseSearchBuildingsInMapInput) {
    return useInfiniteQuery({
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
                page: Number(pageParam),
                limit,
                includeBuildingsWithoutMatchingListings,
                signal,
            })
        },
        placeholderData: keepPreviousData,
        getNextPageParam: (lastPage) => {
            const { page, limit, total } = lastPage.pagination
            const loaded = page * limit

            return loaded < total ? page + 1 : undefined
        },
    })
}
