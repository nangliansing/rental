import { useMemo } from "react"

import type {
  SavedSearchFilters,
  SavedSearchGeoSearch,
} from "@/features/saved-search/api"
import {
  useMapBuildingSearch,
  type SubmittedMapBuildingSearch,
} from "@/features/map-search/hooks/useMapBuildingSearch"
import type { MapSearchSource } from "@/features/map-search/context/MapSearchSessionContext"

import { savedSearchGeoSearchToSubmittedMapBuildingSearch } from "../utils/savedSearchToMapBuildingSearch"

type UseSavedSearchMatchingBuildingsInput = {
  geoSearch: SavedSearchGeoSearch
  filters: SavedSearchFilters
  enabled?: boolean
}

const IDLE_SEARCH: SubmittedMapBuildingSearch = { source: null }

export function useSavedSearchMatchingBuildings({
  geoSearch,
  filters,
  enabled = true,
}: UseSavedSearchMatchingBuildingsInput) {
  const searchable = useMemo(
    () => savedSearchGeoSearchToSubmittedMapBuildingSearch(geoSearch),
    [geoSearch],
  )
  const search = enabled && searchable ? searchable : IDLE_SEARCH
  const activeSource: MapSearchSource =
    searchable?.source ?? geoSearch.mode

  const buildingSearch = useMapBuildingSearch({
    search,
    activeSource,
    filters,
    isStale: false,
    hasSelectedBuilding: false,
    includeBuildingsWithoutMatchingListings: false,
  })

  return {
    ...buildingSearch,
    searchSource: searchable?.source ?? null,
    canSearch: searchable !== null,
  }
}
