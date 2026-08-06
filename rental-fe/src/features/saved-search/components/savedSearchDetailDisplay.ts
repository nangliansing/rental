import type {
  SavedSearchGeoSearch,
  SavedSearchStatus,
} from "@/features/saved-search/api"
import {
  searchLinesGeometryToPaths,
  type ReadOnlyMapGeo,
} from "@/shared/google-maps/readonly-map"
import { formatSearchRadius } from "@/features/map-search/utils/search-radius"

import { formatSavedSearchGeoPreview } from "./formatSavedSearchListMeta"

export function getSavedSearchStatusBadgeClassName(
  status: SavedSearchStatus,
): string {
  if (status === "Closed") {
    return "border-slate-200 bg-slate-100 text-slate-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-800"
}

export function savedSearchGeoSearchToReadOnlyMapGeo(
  geoSearch: SavedSearchGeoSearch,
): ReadOnlyMapGeo | null {
  if (
    geoSearch.mode === "nearby" &&
    geoSearch.position &&
    geoSearch.radiusMeters != null &&
    Number.isFinite(geoSearch.radiusMeters) &&
    geoSearch.radiusMeters > 0
  ) {
    return {
      kind: "circle",
      center: {
        lat: geoSearch.position.lat,
        lng: geoSearch.position.lng,
      },
      radiusMeters: geoSearch.radiusMeters,
    }
  }

  if (
    geoSearch.mode === "line" &&
    geoSearch.geometry &&
    geoSearch.distanceMeters != null &&
    Number.isFinite(geoSearch.distanceMeters) &&
    geoSearch.distanceMeters > 0
  ) {
    const paths = searchLinesGeometryToPaths(geoSearch.geometry)
    if (!paths) return null

    return {
      kind: "line",
      paths,
      distanceMeters: geoSearch.distanceMeters,
    }
  }

  if (geoSearch.mode === "area" && geoSearch.bounds) {
    return {
      kind: "area",
      bounds: {
        northEast: {
          lat: geoSearch.bounds.northEast.lat,
          lng: geoSearch.bounds.northEast.lng,
        },
        southWest: {
          lat: geoSearch.bounds.southWest.lat,
          lng: geoSearch.bounds.southWest.lng,
        },
      },
    }
  }

  return null
}

export function formatSavedSearchGeoSummary(geoSearch: SavedSearchGeoSearch): {
  title: string
  detail: string
} {
  const placeLabel = formatSavedSearchGeoPreview(geoSearch)

  if (geoSearch.mode === "nearby") {
    const coverage =
      geoSearch.radiusMeters != null
        ? formatSearchRadius(geoSearch.radiusMeters)
        : "coverage"
    return {
      title: placeLabel === "Nearby pin" ? "Pinned location" : placeLabel,
      detail: `Pin and ${coverage} coverage around it.`,
    }
  }

  if (geoSearch.mode === "line") {
    const coverage =
      geoSearch.distanceMeters != null
        ? formatSearchRadius(geoSearch.distanceMeters)
        : "coverage"
    return {
      title: placeLabel === "Search line" ? "Search line" : placeLabel,
      detail: `Drawn line and ${coverage} coverage along it.`,
    }
  }

  return {
    title: placeLabel === "Map area" ? "Visible map area" : placeLabel,
    detail: "The map area you saved with this search.",
  }
}
