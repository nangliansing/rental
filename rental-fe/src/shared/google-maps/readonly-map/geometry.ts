import type { MapPosition, SearchLinesGeometry } from "@/features/map-search/types"
import { isValidMapPosition } from "@/features/map-search/utils/map-position"

const MAX_PATH_POINTS = 24
const MAX_PATHS = 8

function coordinatePairToPosition(value: unknown): MapPosition | null {
  if (!Array.isArray(value) || value.length < 2) return null
  const position = { lat: Number(value[1]), lng: Number(value[0]) }
  return isValidMapPosition(position) ? position : null
}

function normalizePath(path: unknown): MapPosition[] | null {
  if (!Array.isArray(path)) return null

  const points: MapPosition[] = []
  for (const coordinate of path) {
    if (points.length >= MAX_PATH_POINTS) break
    const position = coordinatePairToPosition(coordinate)
    if (position) points.push(position)
  }

  return points.length >= 2 ? points : null
}

/**
 * Converts GeoJSON line geometry ([lng, lat]) into map paths ({ lat, lng }).
 * Returns null when no valid segment exists.
 */
export function searchLinesGeometryToPaths(
  geometry: SearchLinesGeometry | null | undefined,
): MapPosition[][] | null {
  if (!geometry || typeof geometry !== "object") return null

  if (geometry.type === "LineString") {
    const path = normalizePath(geometry.coordinates)
    return path ? [path] : null
  }

  if (geometry.type === "MultiLineString") {
    if (!Array.isArray(geometry.coordinates)) return null

    const paths: MapPosition[][] = []
    for (const line of geometry.coordinates) {
      if (paths.length >= MAX_PATHS) break
      const path = normalizePath(line)
      if (path) paths.push(path)
    }

    return paths.length > 0 ? paths : null
  }

  return null
}

/** Filters and caps caller-supplied lat/lng paths. */
export function normalizeMapPaths(
  paths: MapPosition[][] | null | undefined,
): MapPosition[][] | null {
  if (!Array.isArray(paths) || paths.length === 0) return null

  const next: MapPosition[][] = []
  for (const path of paths) {
    if (next.length >= MAX_PATHS) break
    if (!Array.isArray(path)) continue

    const points = path.filter(isValidMapPosition).slice(0, MAX_PATH_POINTS)
    if (points.length >= 2) next.push(points)
  }

  return next.length > 0 ? next : null
}
