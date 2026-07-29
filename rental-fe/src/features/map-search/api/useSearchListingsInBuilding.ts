// src/features/map-search/api/useSearchListingsInBuilding.ts
import {
    infiniteQueryOptions,
    keepPreviousData,
    useInfiniteQuery,
} from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
    getNextPageParam,
    readPageParam,
} from "@/lib/query-pagination"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import type { MapSearchFilters } from "../filters/types"
import { searchListingsInBuilding } from "./searchListingsInBuilding"

type UseSearchListingsInBuildingInput = {
    buildingId?: string
    filters: MapSearchFilters
    limit?: number
    enabled?: boolean
}

export const listingsInBuildingQueryOptions = ({
    buildingId,
    filters,
    limit = DEFAULT_LISTING_PAGE_SIZE,
    enabled = true,
}: UseSearchListingsInBuildingInput) =>
    infiniteQueryOptions({
        queryKey: queryKeys.mapSearch.listingsInBuildingResults({
            buildingId,
            filters,
            limit,
        }),
        enabled: enabled && Boolean(buildingId?.trim()),
        initialPageParam: 1,
        placeholderData: keepPreviousData,
        queryFn: ({ pageParam, signal }) =>
            searchListingsInBuilding({
                buildingId: buildingId ?? "",
                filters,
                page: readPageParam(pageParam),
                limit,
                signal,
            }),
        getNextPageParam,
    })

export function useSearchListingsInBuilding({
    buildingId,
    filters,
    limit = DEFAULT_LISTING_PAGE_SIZE,
    enabled = true,
}: UseSearchListingsInBuildingInput) {
    return useInfiniteQuery(
        listingsInBuildingQueryOptions({
            buildingId,
            filters,
            limit,
            enabled,
        }),
    )
}
