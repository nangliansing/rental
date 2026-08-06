import type {
  DemandOpportunityArea,
  DemandOpportunityLngLat,
} from "../api/agentDemandOpportunityParsers"
import type { SavedSearchGeoSearch } from "@/features/saved-search/api/savedSearchParsers"
import {
  isValidLineStringGeometry,
  isValidMapPosition,
  isValidSearchBounds,
} from "@/features/map-search/utils/map-position"

function toLngLat(lat: number, lng: number): DemandOpportunityLngLat {
  return [lng, lat]
}

function boundsToPolygonRing(
  bounds: NonNullable<SavedSearchGeoSearch["bounds"]>,
): DemandOpportunityLngLat[] {
  const { northEast, southWest } = bounds
  return [
    toLngLat(southWest.lat, southWest.lng),
    toLngLat(southWest.lat, northEast.lng),
    toLngLat(northEast.lat, northEast.lng),
    toLngLat(northEast.lat, southWest.lng),
    toLngLat(southWest.lat, southWest.lng),
  ]
}

/**
 * Converts SavedSearch-shaped map geometry into the GeoJSON area the
 * agent-demand-opportunities search endpoint expects.
 */
export function savedSearchGeoToDemandArea(
  geoSearch: SavedSearchGeoSearch,
): DemandOpportunityArea | null {
  if (geoSearch.mode === "nearby") {
    if (
      !isValidMapPosition(geoSearch.position) ||
      typeof geoSearch.radiusMeters !== "number" ||
      !Number.isFinite(geoSearch.radiusMeters) ||
      geoSearch.radiusMeters <= 0
    ) {
      return null
    }

    return {
      type: "Point",
      coordinates: toLngLat(geoSearch.position.lat, geoSearch.position.lng),
      coverageMeters: geoSearch.radiusMeters,
    }
  }

  if (geoSearch.mode === "line") {
    if (
      !isValidLineStringGeometry(geoSearch.geometry) ||
      typeof geoSearch.distanceMeters !== "number" ||
      !Number.isFinite(geoSearch.distanceMeters) ||
      geoSearch.distanceMeters <= 0
    ) {
      return null
    }

    return {
      type: "LineString",
      coordinates: geoSearch.geometry.coordinates.map(([lng, lat]) =>
        toLngLat(lat, lng),
      ),
      coverageMeters: geoSearch.distanceMeters,
    }
  }

  if (geoSearch.mode === "area") {
    if (!isValidSearchBounds(geoSearch.bounds)) return null

    return {
      type: "Polygon",
      coordinates: [boundsToPolygonRing(geoSearch.bounds)],
    }
  }

  return null
}
