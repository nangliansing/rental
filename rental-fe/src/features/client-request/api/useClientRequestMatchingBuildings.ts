import { useMemo } from "react"

import type {
  ClientRequestFilters,
  ClientRequestGeoSearch,
} from "@/features/client-request/api"
import {
  useMapBuildingSearch,
  type SubmittedMapBuildingSearch,
} from "@/features/map-search/hooks/useMapBuildingSearch"
import type { MapSearchSource } from "@/features/map-search/context/MapSearchSessionContext"

import { clientRequestGeoSearchToSubmittedMapBuildingSearch } from "../utils/clientRequestToMapBuildingSearch"

type UseClientRequestMatchingBuildingsInput = {
  geoSearch: ClientRequestGeoSearch
  filters: ClientRequestFilters
  enabled?: boolean
}

const IDLE_SEARCH: SubmittedMapBuildingSearch = { source: null }

export function useClientRequestMatchingBuildings({
  geoSearch,
  filters,
  enabled = true,
}: UseClientRequestMatchingBuildingsInput) {
  const searchable = useMemo(
    () => clientRequestGeoSearchToSubmittedMapBuildingSearch(geoSearch),
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
