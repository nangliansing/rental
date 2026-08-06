import type { SavedSearchGeoSearch } from "@/features/saved-search/api"
import type { ReadOnlyMapGeo } from "@/shared/google-maps/readonly-map"
import type { MapSearchMode } from "../context/MapInteractionContext"
import type { SearchBounds } from "../hooks/useMapBounds"
import type { MapPosition } from "../types"
import {
  isValidMapPosition,
  isValidSearchBounds,
} from "./map-position"
import { linePointsToGeometry } from "./map-search-url"
import {
  formatSearchRadius,
  isSupportedSearchRadius,
} from "./search-radius"

export type MapSavedSearchGeoInput = {
  mode: MapSearchMode
  selectedPin: MapPosition | null
  nearbyRadiusMeters: number
  linePoints: MapPosition[]
  lineDistanceMeters: number
  visibleBounds: SearchBounds | null
  placeName?: string | null
}

export type MapSavedSearchGeoSnapshot = {
  geoSearch: SavedSearchGeoSearch
  previewGeo: ReadOnlyMapGeo
  summaryTitle: string
  summaryDetail: string
}

function withOptionalPlaceName(
  geoSearch: SavedSearchGeoSearch,
  placeName: string | null | undefined,
): SavedSearchGeoSearch {
  const trimmed = placeName?.trim()
  if (!trimmed) return geoSearch
  return { ...geoSearch, placeName: trimmed }
}

function buildNearbySnapshot(
  position: MapPosition,
  radiusMeters: number,
  placeName: string | null | undefined,
): MapSavedSearchGeoSnapshot {
  const coverage = formatSearchRadius(radiusMeters)

  return {
    geoSearch: withOptionalPlaceName(
      {
        mode: "nearby",
        position: { lat: position.lat, lng: position.lng },
        radiusMeters,
      },
      placeName,
    ),
    previewGeo: {
      kind: "circle",
      center: { lat: position.lat, lng: position.lng },
      radiusMeters,
    },
    summaryTitle: "Pinned location",
    summaryDetail: `Pin and ${coverage} coverage around it.`,
  }
}

function buildLineSnapshot(
  linePoints: MapPosition[],
  distanceMeters: number,
  placeName: string | null | undefined,
): MapSavedSearchGeoSnapshot | null {
  const geometry = linePointsToGeometry(linePoints)
  if (!geometry) return null

  const coverage = formatSearchRadius(distanceMeters)
  const paths = [linePoints.map((point) => ({ lat: point.lat, lng: point.lng }))]

  return {
    geoSearch: withOptionalPlaceName(
      {
        mode: "line",
        geometry,
        distanceMeters,
      },
      placeName,
    ),
    previewGeo: {
      kind: "line",
      paths,
      distanceMeters,
    },
    summaryTitle: "Search line",
    summaryDetail: `Drawn line and ${coverage} coverage along it.`,
  }
}

function buildAreaSnapshot(
  bounds: SearchBounds,
  placeName: string | null | undefined,
): MapSavedSearchGeoSnapshot {
  return {
    geoSearch: withOptionalPlaceName(
      {
        mode: "area",
        bounds: {
          northEast: {
            lat: bounds.northEast.lat,
            lng: bounds.northEast.lng,
          },
          southWest: {
            lat: bounds.southWest.lat,
            lng: bounds.southWest.lng,
          },
        },
      },
      placeName,
    ),
    previewGeo: {
      kind: "area",
      bounds: {
        northEast: {
          lat: bounds.northEast.lat,
          lng: bounds.northEast.lng,
        },
        southWest: {
          lat: bounds.southWest.lat,
          lng: bounds.southWest.lng,
        },
      },
    },
    summaryTitle: "Visible map area",
    summaryDetail: "The same area as Search this area on the map.",
  }
}

/**
 * Snapshots the map’s current interaction geometry into a SavedSearch
 * geo payload + ReadOnlyMap preview. Prefers pin → line → visible bounds.
 */
export function buildMapSavedSearchGeoSnapshot(
  input: MapSavedSearchGeoInput,
): MapSavedSearchGeoSnapshot | null {
  const placeName = input.placeName

  if (
    input.mode === "pin" &&
    isValidMapPosition(input.selectedPin) &&
    isSupportedSearchRadius(input.nearbyRadiusMeters)
  ) {
    return buildNearbySnapshot(
      input.selectedPin,
      input.nearbyRadiusMeters,
      placeName,
    )
  }

  if (
    input.mode === "line" &&
    input.linePoints.length >= 2 &&
    isSupportedSearchRadius(input.lineDistanceMeters)
  ) {
    const lineSnapshot = buildLineSnapshot(
      input.linePoints,
      input.lineDistanceMeters,
      placeName,
    )
    if (lineSnapshot) return lineSnapshot
  }

  if (isValidSearchBounds(input.visibleBounds)) {
    return buildAreaSnapshot(input.visibleBounds, placeName)
  }

  return null
}
