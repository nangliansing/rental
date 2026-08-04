import type { MapPosition } from "@/features/map-search/types"
import type { SearchBounds } from "@/features/map-search/hooks/useMapBounds"
import { getNearbyZoom } from "@/features/map-search/utils/map-camera"
import { getSearchBoundsCenter } from "@/features/map-search/utils/map-position"

import type { NormalizedReadOnlyMapScene } from "./types"

const METERS_PER_DEGREE_LATITUDE = 111_320
const DEFAULT_POINT_ZOOM = 15
const DEFAULT_CENTER = { lat: 13.7653, lng: 100.642 } as const

export type ReadOnlyMapCameraTarget =
  | {
      mode: "center"
      center: MapPosition
      zoom: number
    }
  | {
      mode: "bounds"
      bounds: {
        north: number
        south: number
        east: number
        west: number
      }
    }

function metersToLatDegrees(meters: number) {
  return meters / METERS_PER_DEGREE_LATITUDE
}

function metersToLngDegrees(meters: number, latitude: number) {
  const metersPerDegreeLongitude =
    METERS_PER_DEGREE_LATITUDE * Math.cos((latitude * Math.PI) / 180)
  if (Math.abs(metersPerDegreeLongitude) < 1) return 0
  return meters / metersPerDegreeLongitude
}

function expandBoundsByMeters(
  north: number,
  south: number,
  east: number,
  west: number,
  meters: number,
) {
  const midLat = (north + south) / 2
  const dLat = metersToLatDegrees(meters)
  const dLng = metersToLngDegrees(meters, midLat)

  return {
    north: Math.min(90, north + dLat),
    south: Math.max(-90, south - dLat),
    east: Math.min(180, east + dLng),
    west: Math.max(-180, west - dLng),
  }
}

function boundsFromPoints(
  points: MapPosition[],
  paddingMeters: number,
): Extract<ReadOnlyMapCameraTarget, { mode: "bounds" }> {
  let north = -Infinity
  let south = Infinity
  let east = -Infinity
  let west = Infinity

  for (const point of points) {
    north = Math.max(north, point.lat)
    south = Math.min(south, point.lat)
    east = Math.max(east, point.lng)
    west = Math.min(west, point.lng)
  }

  return {
    mode: "bounds",
    bounds: expandBoundsByMeters(north, south, east, west, paddingMeters),
  }
}

export function getDefaultMapCenter() {
  return DEFAULT_CENTER
}

export function getReadOnlyMapInitialCamera(
  scene: NormalizedReadOnlyMapScene,
): { center: MapPosition; zoom: number } {
  switch (scene.kind) {
    case "point":
      return { center: scene.position, zoom: DEFAULT_POINT_ZOOM }
    case "circle":
      return {
        center: scene.center,
        zoom: getNearbyZoom(scene.radiusMeters),
      }
    case "line": {
      const points = scene.paths.flat()
      if (points.length === 0) {
        return { center: DEFAULT_CENTER, zoom: DEFAULT_POINT_ZOOM }
      }
      const lat =
        points.reduce((sum, point) => sum + point.lat, 0) / points.length
      const lng =
        points.reduce((sum, point) => sum + point.lng, 0) / points.length
      return {
        center: { lat, lng },
        zoom: getNearbyZoom(scene.distanceMeters),
      }
    }
    case "area":
      return {
        center: getSearchBoundsCenter(scene.bounds),
        zoom: 14,
      }
  }
}

export function getReadOnlyMapCameraTarget(
  scene: NormalizedReadOnlyMapScene,
): ReadOnlyMapCameraTarget {
  switch (scene.kind) {
    case "point":
      return {
        mode: "center",
        center: scene.position,
        zoom: DEFAULT_POINT_ZOOM,
      }
    case "circle":
      return {
        mode: "center",
        center: scene.center,
        zoom: getNearbyZoom(scene.radiusMeters),
      }
    case "line":
      return boundsFromPoints(scene.paths.flat(), scene.distanceMeters)
    case "area":
      return {
        mode: "bounds",
        bounds: {
          north: scene.bounds.northEast.lat,
          south: scene.bounds.southWest.lat,
          east: scene.bounds.northEast.lng,
          west: scene.bounds.southWest.lng,
        },
      }
  }
}

export function searchBoundsToPolygonPath(
  bounds: SearchBounds,
): MapPosition[] {
  return [
    { lat: bounds.northEast.lat, lng: bounds.southWest.lng },
    { lat: bounds.northEast.lat, lng: bounds.northEast.lng },
    { lat: bounds.southWest.lat, lng: bounds.northEast.lng },
    { lat: bounds.southWest.lat, lng: bounds.southWest.lng },
  ]
}
