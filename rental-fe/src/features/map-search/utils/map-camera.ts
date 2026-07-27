import type { MapPosition } from "../types"
import { isValidMapPosition } from "./map-position"

export type MapCameraBounds = {
  north: number
  south: number
  east: number
  west: number
}

export function isPositionInsideMapCameraBounds(
  position: MapPosition,
  bounds: MapCameraBounds | null,
): boolean {
  if (!bounds || !isValidMapPosition(position)) return false

  return (
    position.lat <= bounds.north &&
    position.lat >= bounds.south &&
    position.lng <= bounds.east &&
    position.lng >= bounds.west
  )
}

export function getMapCameraBoundsFromGoogleMap(
  map: google.maps.Map,
): MapCameraBounds | null {
  const bounds = map.getBounds()
  if (!bounds) return null

  const northEast = bounds.getNorthEast()
  const southWest = bounds.getSouthWest()

  return {
    north: northEast.lat(),
    south: southWest.lat(),
    east: northEast.lng(),
    west: southWest.lng(),
  }
}

export function getNearbyZoom(radiusMeters: number) {
  if (radiusMeters <= 500) return 16
  if (radiusMeters <= 1_000) return 15
  if (radiusMeters <= 1_500) return 14.5
  return 14
}

export function focusMapOnPlace(
  map: google.maps.Map,
  position: MapPosition,
  viewport?: google.maps.LatLngBounds | null,
  defaultZoom = 15,
) {
  if (!isValidMapPosition(position)) return

  if (viewport) {
    map.fitBounds(viewport)
    return
  }

  map.panTo(position)
  map.setZoom(defaultZoom)
}
