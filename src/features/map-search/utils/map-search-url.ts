import type { MapSearchFilters } from "../filters/types"
import type { SearchBounds } from "../hooks/useMapBounds"
import type { LineStringGeometry, MapPosition } from "../types"
import {
  DEFAULT_NEARBY_RADIUS_METERS,
  isSupportedSearchRadius,
} from "./search-radius"
import {
  isValidMapPosition,
  isValidSearchBounds,
} from "./map-position"
import { MAX_LINE_SEARCH_POINTS } from "../constants"
import { DEFAULT_NEAR_LINES_DISTANCE_METERS } from "../api/searchBuildingsNearLines"

const MAP_SEARCH_PARAMS = [
  "search",
  "lat",
  "lng",
  "radius",
  "line",
  "neLat",
  "neLng",
  "swLat",
  "swLng",
  "filters",
  "building",
] as const

const NUMBER_FILTERS = [
  "minRent",
  "maxRent",
  "bedroomCount",
  "bathroomCount",
  "contractMonths",
  "occupancy",
] as const
const STRING_FILTERS = ["buildingType", "kitchenType"] as const
const BOOLEAN_FILTERS = [
  "isForeignerAccepted",
  "isTM30Provided",
  "isCookingAllowed",
  "isPetAllowed",
] as const
const ARRAY_FILTERS = [
  "buildingFacilities",
  "security",
  "listingFacilities",
  "supportLanguages",
  "agentProfileIds",
  "listerIds",
] as const

export type MapSearchUrlState = {
  source: "area" | "nearby" | "line" | null
  bounds: SearchBounds | null
  position: MapPosition | null
  linePoints: MapPosition[]
  radiusMeters: number
  filters: MapSearchFilters
  buildingId: string | null
}

export type CommittedMapSearchUrlState = Omit<
  MapSearchUrlState,
  "filters" | "source"
> & { source: NonNullable<MapSearchUrlState["source"]> }

export function linePointsToGeometry(
  linePoints: MapPosition[],
): LineStringGeometry | null {
  if (linePoints.length < 2) return null

  return {
    type: "LineString",
    coordinates: linePoints.map(({ lat, lng }) => [lng, lat]),
  }
}

export function createSubmittedSearchStateFromUrl(state: MapSearchUrlState) {
  return {
    searchSource: state.source,
    submittedBounds: state.bounds,
    submittedNearbyPosition: state.position,
    nearbyRadiusMeters:
      state.source === "nearby"
        ? state.radiusMeters
        : DEFAULT_NEARBY_RADIUS_METERS,
    lineDistanceMeters:
      state.source === "line"
        ? state.radiusMeters
        : DEFAULT_NEAR_LINES_DISTANCE_METERS,
    linePoints: state.linePoints,
    submittedLineGeometry: linePointsToGeometry(state.linePoints),
    pendingBuildingId: state.buildingId,
    cameraRestoreVersion: state.source ? 1 : 0,
  }
}

export function buildActiveMapSearchUrlState({
  searchSource,
  submittedBounds,
  submittedNearbyPosition,
  submittedLinePoints,
  lineDistanceMeters,
  nearbyRadiusMeters,
  filters,
  buildingId,
}: {
  searchSource: MapSearchUrlState["source"]
  submittedBounds: SearchBounds | null
  submittedNearbyPosition: MapPosition | null
  submittedLinePoints: MapPosition[]
  lineDistanceMeters: number
  nearbyRadiusMeters: number
  filters: MapSearchFilters
  buildingId: string | null
}): MapSearchUrlState {
  return {
    source: searchSource,
    bounds: submittedBounds,
    position: submittedNearbyPosition,
    linePoints: searchSource === "line" ? submittedLinePoints : [],
    radiusMeters:
      searchSource === "line" ? lineDistanceMeters : nearbyRadiusMeters,
    filters,
    buildingId,
  }
}

function parseLinePoints(value: string | null): MapPosition[] {
  if (!value) return []

  return value
    .split(";")
    .slice(0, MAX_LINE_SEARCH_POINTS)
    .map((pair) => pair.split(",").map(Number))
    .filter(
      (pair) =>
        pair.length === 2 &&
        isValidMapPosition({ lat: pair[1], lng: pair[0] }),
    )
    .map(([lng, lat]) => ({ lat, lng }))
}

function parseNumber(params: URLSearchParams, key: string) {
  const value = Number(params.get(key))
  return Number.isFinite(value) ? value : null
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(5)).toString()
}

function sanitizeFilters(value: unknown): MapSearchFilters {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}

  const input = value as Record<string, unknown>
  const filters: MapSearchFilters = {}

  for (const key of NUMBER_FILTERS) {
    const candidate = input[key]
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      filters[key] = candidate
    }
  }
  for (const key of STRING_FILTERS) {
    const candidate = input[key]
    if (typeof candidate === "string" && candidate.trim()) filters[key] = candidate
  }
  for (const key of BOOLEAN_FILTERS) {
    const candidate = input[key]
    if (typeof candidate === "boolean") filters[key] = candidate
  }
  for (const key of ARRAY_FILTERS) {
    const candidate = input[key]
    if (Array.isArray(candidate)) {
      filters[key] = candidate.filter(
        (item): item is string => typeof item === "string" && Boolean(item.trim()),
      )
    }
  }

  return filters
}

function parseFilters(params: URLSearchParams, fallback: MapSearchFilters) {
  const value = params.get("filters")
  if (!value) return fallback

  try {
    return sanitizeFilters(JSON.parse(value))
  } catch {
    return fallback
  }
}

export function parseMapSearchUrl(
  params: URLSearchParams,
  fallbackFilters: MapSearchFilters,
): MapSearchUrlState {
  const source = params.get("search")
  const lat = parseNumber(params, "lat")
  const lng = parseNumber(params, "lng")
  const neLat = parseNumber(params, "neLat")
  const neLng = parseNumber(params, "neLng")
  const swLat = parseNumber(params, "swLat")
  const swLng = parseNumber(params, "swLng")
  const requestedRadius = parseNumber(params, "radius")
  const linePoints =
    source === "line" ? parseLinePoints(params.get("line")) : []
  const radiusMeters =
    requestedRadius !== null && isSupportedSearchRadius(requestedRadius)
    ? requestedRadius!
    : DEFAULT_NEARBY_RADIUS_METERS

  const position =
    source === "nearby" &&
    lat !== null &&
    lng !== null &&
    isValidMapPosition({ lat, lng })
      ? { lat, lng }
      : null
  const rawBounds =
    source === "area" &&
    neLat !== null &&
    neLng !== null &&
    swLat !== null &&
    swLng !== null
      ? {
          northEast: { lat: neLat, lng: neLng },
          southWest: { lat: swLat, lng: swLng },
        }
      : null
  const bounds = isValidSearchBounds(rawBounds) ? rawBounds : null

  return {
    source:
      linePoints.length >= 2
        ? "line"
        : position
          ? "nearby"
          : bounds
            ? "area"
            : null,
    position,
    bounds,
    linePoints,
    radiusMeters,
    filters: parseFilters(params, fallbackFilters),
    buildingId: params.get("building")?.trim() || null,
  }
}

export function writeMapSearchUrl(
  current: URLSearchParams,
  state: MapSearchUrlState,
) {
  const next = new URLSearchParams(current)
  for (const key of MAP_SEARCH_PARAMS) next.delete(key)

  if (state.source) next.set("search", state.source)
  if (state.source === "nearby" && state.position) {
    next.set("lat", roundCoordinate(state.position.lat))
    next.set("lng", roundCoordinate(state.position.lng))
    next.set("radius", String(state.radiusMeters))
  }
  if (state.source === "line" && state.linePoints.length >= 2) {
    next.set(
      "line",
      state.linePoints
        .slice(0, MAX_LINE_SEARCH_POINTS)
        .map(({ lat, lng }) => `${roundCoordinate(lng)},${roundCoordinate(lat)}`)
        .join(";"),
    )
    next.set("radius", String(state.radiusMeters))
  }
  if (state.source === "area" && state.bounds) {
    next.set("neLat", roundCoordinate(state.bounds.northEast.lat))
    next.set("neLng", roundCoordinate(state.bounds.northEast.lng))
    next.set("swLat", roundCoordinate(state.bounds.southWest.lat))
    next.set("swLng", roundCoordinate(state.bounds.southWest.lng))
  }
  if (Object.keys(state.filters).length > 0) {
    next.set("filters", JSON.stringify(state.filters))
  }
  if (state.buildingId) next.set("building", state.buildingId)

  return next
}
