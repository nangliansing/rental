import type { ClientRequestGeoSearch } from "@/features/client-request/api"
import type { SubmittedMapBuildingSearch } from "@/features/map-search/hooks/useMapBuildingSearch"
import type { LineStringGeometry, SearchLinesGeometry } from "@/features/map-search/types"
import {
  isValidLineStringGeometry,
  isValidMapPosition,
  isValidSearchBounds,
} from "@/features/map-search/utils/map-position"
import { isSupportedSearchRadius } from "@/features/map-search/utils/search-radius"

function toSubmittedLineGeometry(
  geometry: SearchLinesGeometry | undefined,
): LineStringGeometry | null {
  if (!geometry) return null

  if (geometry.type === "LineString") {
    return isValidLineStringGeometry(geometry) ? geometry : null
  }

  const firstLine = geometry.coordinates[0]
  if (!firstLine) return null

  const asLine: LineStringGeometry = {
    type: "LineString",
    coordinates: firstLine,
  }
  return isValidLineStringGeometry(asLine) ? asLine : null
}

/**
 * Maps a saved client-request geo snapshot onto the same search shape
 * `useMapBuildingSearch` / BuildingResultsPanel use on the map page.
 */
export function clientRequestGeoSearchToSubmittedMapBuildingSearch(
  geoSearch: ClientRequestGeoSearch,
): SubmittedMapBuildingSearch | null {
  if (geoSearch.mode === "nearby") {
    const radiusMeters = geoSearch.radiusMeters ?? 0
    if (
      !isValidMapPosition(geoSearch.position) ||
      !isSupportedSearchRadius(radiusMeters)
    ) {
      return null
    }

    return {
      source: "nearby",
      position: geoSearch.position,
      radiusMeters,
    }
  }

  if (geoSearch.mode === "line") {
    const geometry = toSubmittedLineGeometry(geoSearch.geometry)
    const distanceMeters = geoSearch.distanceMeters ?? 0
    if (!geometry || !isSupportedSearchRadius(distanceMeters)) {
      return null
    }

    return {
      source: "line",
      geometry,
      distanceMeters,
    }
  }

  if (!isValidSearchBounds(geoSearch.bounds)) {
    return null
  }

  return {
    source: "area",
    bounds: geoSearch.bounds,
  }
}
