import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseSavedSearchFilters,
  parseGetOwnerSavedSearchByIdResponse,
  type SavedSearch,
  type SavedSearchFilters,
  type SavedSearchGeoSearch,
  type SavedSearchGeoSearchMode,
} from "./savedSearchParsers"

export const SAVED_SEARCH_NAME_MAX_LENGTH = 120
export const SAVED_SEARCH_DESCRIPTION_MAX_LENGTH = 2_000
export const SAVED_SEARCH_PLACE_NAME_MAX_LENGTH = 200
export const SAVED_SEARCH_GEO_MIN_METERS = 1
export const SAVED_SEARCH_GEO_MAX_METERS = 2_000

export type CreateOwnerSavedSearchInput = {
  name: string
  description?: string | null
  geoSearch: SavedSearchGeoSearch
  filters?: SavedSearchFilters
}

const GEO_SEARCH_MODES = new Set<SavedSearchGeoSearchMode>([
  "area",
  "nearby",
  "line",
])

const validationError = (message: string) =>
  new ApiError(message, 422, "VALIDATION_ERROR")

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const isValidLatitude = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= -90 && value <= 90

const isValidLongitude = (value: unknown): value is number =>
  isFiniteNumber(value) && value >= -180 && value <= 180

const isValidMeterDistance = (value: unknown): value is number =>
  Number.isInteger(value) &&
  (value as number) >= SAVED_SEARCH_GEO_MIN_METERS &&
  (value as number) <= SAVED_SEARCH_GEO_MAX_METERS

const isLngLatPair = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  isValidLongitude(value[0]) &&
  isValidLatitude(value[1])

const buildPlaceName = (placeName: string | null | undefined) => {
  if (placeName == null) return undefined
  const trimmed = placeName.trim()
  if (!trimmed) return undefined
  if (trimmed.length > SAVED_SEARCH_PLACE_NAME_MAX_LENGTH) {
    throw validationError(
      `placeName must be at most ${SAVED_SEARCH_PLACE_NAME_MAX_LENGTH} characters.`,
    )
  }
  return trimmed
}

const buildAreaGeoSearch = (geoSearch: SavedSearchGeoSearch) => {
  const bounds = geoSearch.bounds
  const northEast = bounds?.northEast
  const southWest = bounds?.southWest

  if (
    !northEast ||
    !southWest ||
    !isValidLatitude(northEast.lat) ||
    !isValidLongitude(northEast.lng) ||
    !isValidLatitude(southWest.lat) ||
    !isValidLongitude(southWest.lng)
  ) {
    throw validationError("geoSearch.bounds is required for area search.")
  }

  if (
    northEast.lat <= southWest.lat ||
    northEast.lng <= southWest.lng
  ) {
    throw validationError("geoSearch.bounds must form a valid area.")
  }

  const placeName = buildPlaceName(geoSearch.placeName)

  return {
    mode: "area" as const,
    bounds: {
      northEast: { lat: northEast.lat, lng: northEast.lng },
      southWest: { lat: southWest.lat, lng: southWest.lng },
    },
    ...(placeName ? { placeName } : {}),
  }
}

const buildNearbyGeoSearch = (geoSearch: SavedSearchGeoSearch) => {
  const position = geoSearch.position

  if (
    !position ||
    !isValidLatitude(position.lat) ||
    !isValidLongitude(position.lng)
  ) {
    throw validationError("geoSearch.position is required for nearby search.")
  }

  if (!isValidMeterDistance(geoSearch.radiusMeters)) {
    throw validationError(
      `geoSearch.radiusMeters must be an integer from ${SAVED_SEARCH_GEO_MIN_METERS} to ${SAVED_SEARCH_GEO_MAX_METERS}.`,
    )
  }

  const placeName = buildPlaceName(geoSearch.placeName)

  return {
    mode: "nearby" as const,
    position: { lat: position.lat, lng: position.lng },
    radiusMeters: geoSearch.radiusMeters,
    ...(placeName ? { placeName } : {}),
  }
}

const buildLineGeometry = (geometry: SavedSearchGeoSearch["geometry"]) => {
  if (!geometry || typeof geometry !== "object") {
    throw validationError("geoSearch.geometry is required for line search.")
  }

  if (geometry.type === "LineString") {
    const coordinates = Array.isArray(geometry.coordinates)
      ? geometry.coordinates.filter(isLngLatPair)
      : []

    if (coordinates.length < 2) {
      throw validationError(
        "geoSearch.geometry LineString requires at least 2 coordinates.",
      )
    }

    return { type: "LineString" as const, coordinates }
  }

  if (geometry.type === "MultiLineString") {
    const coordinates = geometry.coordinates.flatMap(line => {
      if (!Array.isArray(line)) return []
      const points = line.filter(isLngLatPair)
      return points.length >= 2 ? [points] : []
    })

    if (coordinates.length === 0) {
      throw validationError(
        "geoSearch.geometry MultiLineString requires at least one valid line.",
      )
    }

    return { type: "MultiLineString" as const, coordinates }
  }

  throw validationError(
    "geoSearch.geometry type must be LineString or MultiLineString.",
  )
}

const buildLineGeoSearch = (geoSearch: SavedSearchGeoSearch) => {
  if (!isValidMeterDistance(geoSearch.distanceMeters)) {
    throw validationError(
      `geoSearch.distanceMeters must be an integer from ${SAVED_SEARCH_GEO_MIN_METERS} to ${SAVED_SEARCH_GEO_MAX_METERS}.`,
    )
  }

  const placeName = buildPlaceName(geoSearch.placeName)

  return {
    mode: "line" as const,
    geometry: buildLineGeometry(geoSearch.geometry),
    distanceMeters: geoSearch.distanceMeters,
    ...(placeName ? { placeName } : {}),
  }
}

export const buildCreateOwnerSavedSearchGeoSearch = (
  geoSearch: SavedSearchGeoSearch,
) => {
  if (!geoSearch || typeof geoSearch !== "object") {
    throw validationError("geoSearch is required.")
  }

  if (!GEO_SEARCH_MODES.has(geoSearch.mode)) {
    throw validationError("geoSearch.mode must be area, nearby, or line.")
  }

  if (geoSearch.mode === "area") return buildAreaGeoSearch(geoSearch)
  if (geoSearch.mode === "nearby") return buildNearbyGeoSearch(geoSearch)
  return buildLineGeoSearch(geoSearch)
}

export const buildCreateOwnerSavedSearchPayload = (
  input: CreateOwnerSavedSearchInput,
) => {
  const name = input.name.trim()

  if (!name) {
    throw validationError("name is required.")
  }

  if (name.length > SAVED_SEARCH_NAME_MAX_LENGTH) {
    throw validationError(
      `name must be at most ${SAVED_SEARCH_NAME_MAX_LENGTH} characters.`,
    )
  }

  const description =
    typeof input.description === "string" ? input.description.trim() : ""

  if (description.length > SAVED_SEARCH_DESCRIPTION_MAX_LENGTH) {
    throw validationError(
      `description must be at most ${SAVED_SEARCH_DESCRIPTION_MAX_LENGTH} characters.`,
    )
  }

  const geoSearch = buildCreateOwnerSavedSearchGeoSearch(input.geoSearch)
  const filters = parseSavedSearchFilters(input.filters ?? {})

  return {
    name,
    ...(description ? { description } : {}),
    geoSearch,
    ...(Object.keys(filters).length > 0 ? { filters } : {}),
  }
}

export async function createOwnerSavedSearch(
  input: CreateOwnerSavedSearchInput,
): Promise<SavedSearch> {
  const payload = buildCreateOwnerSavedSearchPayload(input)

  const response = await apiClient.post<unknown>("/saved-searches", payload)

  return parseGetOwnerSavedSearchByIdResponse(response.data).data
}
