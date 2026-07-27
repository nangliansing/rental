// src/features/map-search/utils/map-position.ts
import type {
  BuildingLocation,
  LineStringGeometry,
  MapPosition,
} from "../types"
import { MAX_LINE_SEARCH_POINTS } from "../constants"
import type { SearchBounds } from "../hooks/useMapBounds"

export function isValidMapPosition(
  position: MapPosition | null | undefined,
): position is MapPosition {
  return Boolean(
    position &&
      Number.isFinite(position.lat) &&
      position.lat >= -90 &&
      position.lat <= 90 &&
      Number.isFinite(position.lng) &&
      position.lng >= -180 &&
      position.lng <= 180,
  )
}

export function isValidSearchBounds(
  bounds: SearchBounds | null | undefined,
): bounds is SearchBounds {
  return Boolean(
    bounds &&
      isValidMapPosition(bounds.northEast) &&
      isValidMapPosition(bounds.southWest) &&
      bounds.northEast.lat > bounds.southWest.lat &&
      bounds.northEast.lng > bounds.southWest.lng,
  )
}

export function isValidLineStringGeometry(
  geometry: LineStringGeometry | null | undefined,
): geometry is LineStringGeometry {
  return Boolean(
    geometry &&
      geometry.type === "LineString" &&
      geometry.coordinates.length >= 2 &&
      geometry.coordinates.length <= MAX_LINE_SEARCH_POINTS &&
      geometry.coordinates.every(
        ([lng, lat]) => isValidMapPosition({ lat, lng }),
      ),
  )
}

export function getPositionFromBuildingLocation(
  location: BuildingLocation | null | undefined,
): MapPosition | null {
  if (
    !location ||
    location.type !== "Point" ||
    !Array.isArray(location.coordinates) ||
    location.coordinates.length !== 2
  ) {
    return null
  }
  const [lng, lat] = location.coordinates
  const position = { lat, lng }
  return isValidMapPosition(position) ? position : null
}

export function getSearchBoundsCenter(bounds: SearchBounds): MapPosition {
  return {
    lat: (bounds.northEast.lat + bounds.southWest.lat) / 2,
    lng: (bounds.northEast.lng + bounds.southWest.lng) / 2,
  }
}

export function getPositionFromMapEvent(event: unknown): MapPosition | null {
  const mapEvent = event as {
    detail?: {
      latLng?: MapPosition
    }
    latLng?: google.maps.LatLng | null
  }

  if (mapEvent.detail?.latLng) {
    return isValidMapPosition(mapEvent.detail.latLng)
      ? mapEvent.detail.latLng
      : null
  }

  if (mapEvent.latLng) {
    const position = {
      lat: mapEvent.latLng.lat(),
      lng: mapEvent.latLng.lng(),
    }
    return isValidMapPosition(position) ? position : null
  }

  return null
}

export function areMapPositionsEqual(
  left: MapPosition[],
  right: MapPosition[],
): boolean {
  if (left === right) return true
  if (left.length !== right.length) return false

  return left.every(
    (point, index) =>
      point.lat === right[index].lat && point.lng === right[index].lng,
  )
}
