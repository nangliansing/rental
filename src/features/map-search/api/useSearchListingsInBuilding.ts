// src/features/map-search/api/useSearchListingsInBuilding.ts
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import type { MapSearchFilters } from "../filters/types"
import { searchListingsInBuilding } from "./searchListingsInBuilding"

type UseSearchListingsInBuildingInput = {
    buildingId?: string
    filters: MapSearchFilters
    limit?: number
    enabled?: boolean
}

export function useSearchListingsInBuilding({
    buildingId,
    filters,
    limit = DEFAULT_LISTING_PAGE_SIZE,
    enabled = true,
}: UseSearchListingsInBuildingInput) {
    return useInfiniteQuery({
        queryKey: queryKeys.mapSearch.listingsInBuildingResults({
            buildingId,
            filters,
            limit,
        }),
        enabled: enabled && Boolean(buildingId),
        initialPageParam: 1,
        placeholderData: keepPreviousData,
        queryFn: ({ pageParam, signal }) =>
            searchListingsInBuilding({
                buildingId: buildingId!,
                filters,
                page: Number(pageParam),
                limit,
                signal,
            }),
        getNextPageParam: (lastPage) => {
            const { page, limit, total } = lastPage.pagination
            const loaded = page * limit

            return loaded < total ? page + 1 : undefined
        },
    })
}
