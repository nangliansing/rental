import type { SearchBounds } from "../hooks/useMapBounds"
import type { MapPosition } from "../types"
import { isValidMapPosition, isValidSearchBounds } from "./map-position"

export type MapCameraBounds = {
  north: number
  south: number
  east: number
  west: number
}

const MIN_SELECTION_SPAN = 0.0008

export function extendMapCameraBounds(
  bounds: MapCameraBounds,
  position: MapPosition,
): MapCameraBounds {
  return {
    north: Math.max(bounds.north, position.lat),
    south: Math.min(bounds.south, position.lat),
    east: Math.max(bounds.east, position.lng),
    west: Math.min(bounds.west, position.lng),
  }
}

export function getBoundsFromSearchArea(searchBounds: SearchBounds): MapCameraBounds {
  return {
    north: searchBounds.northEast.lat,
    south: searchBounds.southWest.lat,
    east: searchBounds.northEast.lng,
    west: searchBounds.southWest.lng,
  }
}

function ensureMinimumSpan(bounds: MapCameraBounds): MapCameraBounds {
  const latSpan = bounds.north - bounds.south
  const lngSpan = bounds.east - bounds.west
  const latPadding = Math.max(0, (MIN_SELECTION_SPAN - latSpan) / 2)
  const lngPadding = Math.max(0, (MIN_SELECTION_SPAN - lngSpan) / 2)

  return {
    north: bounds.north + latPadding,
    south: bounds.south - latPadding,
    east: bounds.east + lngPadding,
    west: bounds.west - lngPadding,
  }
}

export function getBuildingSelectionCameraBounds({
  buildingPosition,
  pin,
  searchBounds,
}: {
  buildingPosition: MapPosition
  pin: MapPosition | null
  searchBounds: SearchBounds | null
}): MapCameraBounds | null {
  if (!isValidMapPosition(buildingPosition)) return null

  const hasSearchPin = isValidMapPosition(pin)
  const hasSearchBounds = isValidSearchBounds(searchBounds)
  if (!hasSearchPin && !hasSearchBounds) return null

  let bounds: MapCameraBounds = {
    north: buildingPosition.lat,
    south: buildingPosition.lat,
    east: buildingPosition.lng,
    west: buildingPosition.lng,
  }

  if (hasSearchPin) {
    bounds = extendMapCameraBounds(bounds, pin)
  }
  if (hasSearchBounds) {
    bounds = extendMapCameraBounds(bounds, {
      lat: searchBounds.northEast.lat,
      lng: searchBounds.northEast.lng,
    })
    bounds = extendMapCameraBounds(bounds, {
      lat: searchBounds.southWest.lat,
      lng: searchBounds.southWest.lng,
    })
  }

  return ensureMinimumSpan(bounds)
}

export function getNearbyZoom(radiusMeters: number) {
  if (radiusMeters <= 500) return 16
  if (radiusMeters <= 1_000) return 15
  if (radiusMeters <= 1_500) return 14.5
  return 14
}
