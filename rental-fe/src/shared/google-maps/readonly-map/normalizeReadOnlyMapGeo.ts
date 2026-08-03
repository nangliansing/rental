import {
  isValidMapPosition,
  isValidSearchBounds,
} from "@/features/map-search/utils/map-position"

import { normalizeMapPaths } from "./geometry"
import type {
  NormalizedReadOnlyMapScene,
  ReadOnlyMapGeo,
} from "./types"

const MAX_COVERAGE_METERS = 5_000

function formatCoordinate(value: number) {
  // Stable fingerprint — avoids float churn from identical geos.
  return value.toFixed(6)
}

function positionKey(position: { lat: number; lng: number }) {
  return `${formatCoordinate(position.lat)},${formatCoordinate(position.lng)}`
}

function pathsKey(paths: { lat: number; lng: number }[][]) {
  return paths
    .map(path => path.map(positionKey).join(">"))
    .join("|")
}

function isValidCoverageMeters(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= MAX_COVERAGE_METERS
  )
}

/**
 * Validates and fingerprints input once so the camera/overlays can depend on a
 * stable `sceneKey` instead of object identity (avoids fitBounds loops).
 */
export function normalizeReadOnlyMapGeo(
  geo: ReadOnlyMapGeo | null | undefined,
): NormalizedReadOnlyMapScene | null {
  if (!geo || typeof geo !== "object") return null

  switch (geo.kind) {
    case "point": {
      if (!isValidMapPosition(geo.position)) return null
      return {
        kind: "point",
        position: { lat: geo.position.lat, lng: geo.position.lng },
        sceneKey: `point:${positionKey(geo.position)}`,
      }
    }
    case "circle": {
      if (
        !isValidMapPosition(geo.center) ||
        !isValidCoverageMeters(geo.radiusMeters)
      ) {
        return null
      }
      const radiusMeters = Math.round(geo.radiusMeters)
      return {
        kind: "circle",
        center: { lat: geo.center.lat, lng: geo.center.lng },
        radiusMeters,
        sceneKey: `circle:${positionKey(geo.center)}:${radiusMeters}`,
      }
    }
    case "line": {
      const paths = normalizeMapPaths(geo.paths)
      if (!paths || !isValidCoverageMeters(geo.distanceMeters)) return null
      const distanceMeters = Math.round(geo.distanceMeters)
      return {
        kind: "line",
        paths,
        distanceMeters,
        sceneKey: `line:${pathsKey(paths)}:${distanceMeters}`,
      }
    }
    case "area": {
      if (!isValidSearchBounds(geo.bounds)) return null
      const bounds = {
        northEast: {
          lat: geo.bounds.northEast.lat,
          lng: geo.bounds.northEast.lng,
        },
        southWest: {
          lat: geo.bounds.southWest.lat,
          lng: geo.bounds.southWest.lng,
        },
      }
      return {
        kind: "area",
        bounds,
        sceneKey: `area:${positionKey(bounds.southWest)}:${positionKey(bounds.northEast)}`,
      }
    }
    default:
      return null
  }
}
