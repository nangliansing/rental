import { useCallback, useMemo } from "react"

import {
  flattenUniqueInfiniteItems,
  uniqueItemsByKey,
} from "@/shared/utils/infinitePages"

import { useSearchBuildingsInMap } from "../api/useSearchBuildingsInMap"
import { useSearchBuildingsNearby } from "../api/useSearchBuildingsNearby"
import { useSearchBuildingsNearLines } from "../api/useSearchBuildingsNearLines"
import type { MapSearchFilters } from "../filters/types"
import type { LineStringGeometry, MapPosition } from "../types"
import type { SearchBounds } from "./useMapBounds"
import type {
  MapSearchSource,
  MapSearchStatus,
} from "../context/MapSearchSessionContext"
import {
  isValidLineStringGeometry,
  isValidMapPosition,
  isValidSearchBounds,
} from "../utils/map-position"
import { isSupportedSearchRadius } from "../utils/search-radius"

const EMPTY_FILTERS: MapSearchFilters = {}
const RESULT_LIMIT = 20

export type SubmittedMapBuildingSearch =
  | { source: null }
  | { source: "area"; bounds: SearchBounds | null }
  | {
      source: "nearby"
      position: MapPosition | null
      radiusMeters: number
    }
  | {
      source: "line"
      geometry: LineStringGeometry | null
      distanceMeters: number
    }

type UseMapBuildingSearchInput = {
  search: SubmittedMapBuildingSearch
  activeSource: MapSearchSource
  filters: MapSearchFilters
  isStale: boolean
  hasSelectedBuilding: boolean
  includeBuildingsWithoutMatchingListings: boolean
}

export function useMapBuildingSearch({
  search,
  activeSource,
  filters,
  isStale,
  hasSelectedBuilding,
  includeBuildingsWithoutMatchingListings,
}: UseMapBuildingSearchInput) {
  const { source } = search
  const canSearch = !hasSelectedBuilding && !isStale
  const areaBounds =
    source === "area" && isValidSearchBounds(search.bounds)
      ? search.bounds
      : null
  const nearbyPosition =
    source === "nearby" && isValidMapPosition(search.position)
      ? search.position
      : null
  const nearbyRadiusMeters =
    source === "nearby" && isSupportedSearchRadius(search.radiusMeters)
      ? search.radiusMeters
      : 0
  const lineGeometry =
    source === "line" && isValidLineStringGeometry(search.geometry)
      ? search.geometry
      : null
  const lineDistanceMeters = source === "line" ? search.distanceMeters : 0

  const areaQuery = useSearchBuildingsInMap({
    bounds: areaBounds,
    filters: source === "area" ? filters : EMPTY_FILTERS,
    limit: RESULT_LIMIT,
    enabled: canSearch && source === "area" && areaBounds !== null,
    includeBuildingsWithoutMatchingListings,
  })
  const nearbyQuery = useSearchBuildingsNearby({
    position: nearbyPosition,
    radiusMeters: nearbyRadiusMeters,
    filters: source === "nearby" ? filters : EMPTY_FILTERS,
    limit: RESULT_LIMIT,
    enabled:
      canSearch &&
      source === "nearby" &&
      nearbyPosition !== null &&
      nearbyRadiusMeters > 0,
    includeBuildingsWithoutMatchingListings,
  })
  const lineQuery = useSearchBuildingsNearLines({
    geometry: lineGeometry,
    distanceMeters: lineDistanceMeters,
    filters: source === "line" ? filters : EMPTY_FILTERS,
    limit: RESULT_LIMIT,
    enabled:
      canSearch &&
      source === "line" &&
      lineGeometry !== null &&
      isSupportedSearchRadius(lineDistanceMeters),
    includeBuildingsWithoutMatchingListings,
  })

  const areaBuildings = useMemo(
    () =>
      flattenUniqueInfiniteItems({
        data: areaQuery.data,
        getItems: (page) => page.data,
        getKey: (building) => building._id,
      }),
    [areaQuery.data],
  )
  const nearbyBuildings = useMemo(
    () =>
      uniqueItemsByKey({
        items: nearbyQuery.data?.data ?? [],
        getKey: (building) => building._id,
      }),
    [nearbyQuery.data],
  )
  const lineBuildings = useMemo(
    () =>
      flattenUniqueInfiniteItems({
        data: lineQuery.data,
        getItems: (page) => page.data,
        getKey: (building) => building._id,
      }),
    [lineQuery.data],
  )

  const buildings = useMemo(() => {
    if (source === "area") return areaBuildings
    if (source === "nearby") return nearbyBuildings
    if (source === "line") return lineBuildings
    return []
  }, [areaBuildings, lineBuildings, nearbyBuildings, source])

  const activeQuery =
    source === "area"
      ? areaQuery
      : source === "nearby"
        ? nearbyQuery
        : source === "line"
          ? lineQuery
          : null
  const activeBuildings = source === null ? [] : buildings
  const isInitialLoading =
    source === "nearby"
      ? nearbyQuery.isPending
      : Boolean(activeQuery?.isLoading)
  const status: MapSearchStatus =
    source === null
      ? "idle"
      : isStale
        ? "stale"
        : isInitialLoading
          ? "loading"
          : activeQuery?.isError
            ? "error"
            : activeBuildings.length === 0
              ? "empty"
              : "success"

  const areaFetchNextPage = areaQuery.fetchNextPage
  const lineFetchNextPage = lineQuery.fetchNextPage
  const fetchNextPage = useCallback(() => {
    if (
      source === "area" &&
      areaQuery.hasNextPage &&
      !areaQuery.isFetchingNextPage
    ) {
      void areaFetchNextPage()
    }
    if (
      source === "line" &&
      lineQuery.hasNextPage &&
      !lineQuery.isFetchingNextPage
    ) {
      void lineFetchNextPage()
    }
  }, [
    areaFetchNextPage,
    areaQuery.hasNextPage,
    areaQuery.isFetchingNextPage,
    lineFetchNextPage,
    lineQuery.hasNextPage,
    lineQuery.isFetchingNextPage,
    source,
  ])

  const paginatedQuery =
    source === "area"
      ? areaQuery
      : source === "line"
        ? lineQuery
        : null
  const activeModeQuery =
    activeSource === "area"
      ? areaQuery
      : activeSource === "nearby"
        ? nearbyQuery
        : lineQuery

  const refetchActiveSearch = useCallback(() => {
    if (source === "area") {
      return areaQuery.refetch()
    }
    if (source === "nearby") {
      return nearbyQuery.refetch()
    }
    if (source === "line") {
      return lineQuery.refetch()
    }
    return Promise.resolve({} as never)
  }, [areaQuery, lineQuery, nearbyQuery, source])

  return {
    buildings,
    status,
    isSearchingArea: areaQuery.isFetching,
    isSearchingNearby: nearbyQuery.isFetching,
    isSearchingLine: lineQuery.isFetching,
    isActiveSourceFetching: activeModeQuery.isFetching,
    hasNextPage: Boolean(paginatedQuery?.hasNextPage),
    isFetchingNextPage: Boolean(paginatedQuery?.isFetchingNextPage),
    isRefreshing:
      source === "nearby"
        ? nearbyQuery.isFetching
        : Boolean(
            paginatedQuery?.isFetching &&
              !paginatedQuery.isFetchingNextPage,
          ),
    isError: Boolean(activeQuery?.isError),
    fetchNextPage,
    refetchActiveSearch,
  }
}
