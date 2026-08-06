import { ApiError } from "@/lib/api-client"
import {
  normalizePositiveInteger,
  parsePagination,
  readBoolean,
  readNullableString,
  readNumber,
  readRecord,
  readString,
  readStringArray,
} from "@/features/listing/api/listingResponseParsers"
import type { MapSearchFilters } from "@/features/map-search/filters/types"
import type {
  MapPosition,
  Pagination,
  SearchLinesGeometry,
} from "@/features/map-search/types"
import type { SearchBounds } from "@/features/map-search/hooks/useMapBounds"

export { normalizePositiveInteger }

export type SavedSearchStatus = "Waiting" | "Closed"

export type SavedSearchGeoSearchMode = "area" | "nearby" | "line"

export type SavedSearchGeoSearch = {
  mode: SavedSearchGeoSearchMode
  bounds?: SearchBounds
  position?: MapPosition
  radiusMeters?: number
  geometry?: SearchLinesGeometry
  distanceMeters?: number
  placeName?: string | null
}

export type SavedSearchFilters = MapSearchFilters

export type SavedSearch = {
  _id: string
  createdBy: string
  name: string
  description: string | null
  status: SavedSearchStatus
  geoSearch: SavedSearchGeoSearch
  filters: SavedSearchFilters
  /** Present on owner Waiting-list rows; null on detail/Closed responses. */
  myMatchingBuildingCount?: number | null
  platformMatchingBuildingCount?: number | null
  matchingBuildingCountCapped?: boolean
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  lastConfirmedAt?: string | null
}

export type SearchOwnerSavedSearchesResponse = {
  success: true
  data: SavedSearch[]
  pagination: Pagination
}

const SAVED_SEARCH_STATUSES = new Set<SavedSearchStatus>([
  "Waiting",
  "Closed",
])

const SAVED_SEARCH_GEO_SEARCH_MODES = new Set<SavedSearchGeoSearchMode>([
  "area",
  "nearby",
  "line",
])

const NUMBER_FILTER_KEYS = [
  "minRent",
  "maxRent",
  "bedroomCount",
  "bathroomCount",
  "contractMonths",
  "occupancy",
] as const

const STRING_FILTER_KEYS = ["buildingType", "kitchenType", "availableBy"] as const

const BOOLEAN_FILTER_KEYS = [
  "isForeignerAccepted",
  "isTM30Provided",
  "isCookingAllowed",
  "isPetAllowed",
] as const

const ARRAY_FILTER_KEYS = [
  "buildingFacilities",
  "security",
  "listingFacilities",
  "supportLanguages",
  "agentProfileIds",
] as const

const parseMapPosition = (value: unknown): MapPosition | undefined => {
  const position = readRecord(value)
  const lat = readNumber(position.lat)
  const lng = readNumber(position.lng)

  if (lat == null || lng == null) return undefined

  return { lat, lng }
}

const parseSearchBounds = (value: unknown): SearchBounds | undefined => {
  const bounds = readRecord(value)
  const northEast = parseMapPosition(bounds.northEast)
  const southWest = parseMapPosition(bounds.southWest)

  if (!northEast || !southWest) return undefined

  return { northEast, southWest }
}

const parseLineGeometry = (
  value: unknown,
): SearchLinesGeometry | undefined => {
  const geometry = readRecord(value)
  const type = readString(geometry.type)
  const coordinates = geometry.coordinates

  if (type === "LineString" && Array.isArray(coordinates)) {
    return {
      type,
      coordinates: coordinates.filter(
        (point): point is [number, number] =>
          Array.isArray(point) &&
          typeof point[0] === "number" &&
          typeof point[1] === "number",
      ),
    }
  }

  if (type === "MultiLineString" && Array.isArray(coordinates)) {
    return {
      type,
      coordinates: coordinates
        .filter(Array.isArray)
        .map(line =>
          line.filter(
            (point): point is [number, number] =>
              Array.isArray(point) &&
              typeof point[0] === "number" &&
              typeof point[1] === "number",
          ),
        ),
    }
  }

  return undefined
}

export const parseSavedSearchStatus = (
  value: unknown,
  fallback: SavedSearchStatus = "Waiting",
): SavedSearchStatus => {
  return typeof value === "string" &&
    SAVED_SEARCH_STATUSES.has(value as SavedSearchStatus)
    ? (value as SavedSearchStatus)
    : fallback
}

export const parseSavedSearchGeoSearch = (
  value: unknown,
): SavedSearchGeoSearch => {
  const geoSearch = readRecord(value)
  const modeValue = readString(geoSearch.mode)
  const mode = SAVED_SEARCH_GEO_SEARCH_MODES.has(
    modeValue as SavedSearchGeoSearchMode,
  )
    ? (modeValue as SavedSearchGeoSearchMode)
    : "area"

  const parsed: SavedSearchGeoSearch = { mode }

  const bounds = parseSearchBounds(geoSearch.bounds)
  if (bounds) parsed.bounds = bounds

  const position = parseMapPosition(geoSearch.position)
  if (position) parsed.position = position

  const radiusMeters = readNumber(geoSearch.radiusMeters)
  if (radiusMeters != null) parsed.radiusMeters = radiusMeters

  const geometry = parseLineGeometry(geoSearch.geometry)
  if (geometry) parsed.geometry = geometry

  const distanceMeters = readNumber(geoSearch.distanceMeters)
  if (distanceMeters != null) parsed.distanceMeters = distanceMeters

  if ("placeName" in geoSearch) {
    parsed.placeName = readNullableString(geoSearch.placeName)
  }

  return parsed
}

export const parseSavedSearchFilters = (
  value: unknown,
): SavedSearchFilters => {
  const input = readRecord(value)
  const filters: SavedSearchFilters = {}

  for (const key of NUMBER_FILTER_KEYS) {
    const candidate = readNumber(input[key])
    if (candidate != null) filters[key] = candidate
  }

  for (const key of STRING_FILTER_KEYS) {
    const candidate = readString(input[key]).trim()
    if (candidate) filters[key] = candidate
  }

  for (const key of BOOLEAN_FILTER_KEYS) {
    if (typeof input[key] === "boolean") {
      filters[key] = input[key]
    }
  }

  for (const key of ARRAY_FILTER_KEYS) {
    const candidate = readStringArray(input[key]).filter(item =>
      Boolean(item.trim()),
    )
    if (candidate.length > 0) filters[key] = candidate
  }

  return filters
}

/** Optional non-negative API count; invalid or missing values become `null`. */
export const parseSavedSearchMatchingBuildingCount = (
  value: unknown,
): number | null => {
  if (value == null) return null
  const count = readNumber(value)
  if (count == null || !Number.isFinite(count) || count < 0) return null
  return Math.floor(count)
}

export const parseSavedSearch = (value: unknown): SavedSearch => {
  const savedSearch = readRecord(value)
  const id = readString(savedSearch._id)
  const createdBy = readString(savedSearch.createdBy)
  const name = readString(savedSearch.name).trim()
  const createdAt = readString(savedSearch.createdAt)
  const updatedAt = readString(savedSearch.updatedAt)

  if (!id || !createdBy || !name || !createdAt || !updatedAt) {
    throw new ApiError(
      "Saved search response is missing required data.",
      500,
      "INVALID_SAVED_SEARCH_RESPONSE",
    )
  }

  return {
    _id: id,
    createdBy,
    name,
    description: readNullableString(savedSearch.description),
    status: parseSavedSearchStatus(savedSearch.status),
    geoSearch: parseSavedSearchGeoSearch(savedSearch.geoSearch),
    filters: parseSavedSearchFilters(savedSearch.filters),
    myMatchingBuildingCount: parseSavedSearchMatchingBuildingCount(
      savedSearch.myMatchingBuildingCount,
    ),
    platformMatchingBuildingCount: parseSavedSearchMatchingBuildingCount(
      savedSearch.platformMatchingBuildingCount,
    ),
    matchingBuildingCountCapped:
      readBoolean(savedSearch.matchingBuildingCountCapped),
    isDeleted: readBoolean(savedSearch.isDeleted),
    deletedAt: readNullableString(savedSearch.deletedAt),
    createdAt,
    updatedAt,
    lastConfirmedAt: readNullableString(savedSearch.lastConfirmedAt),
  }
}

export type GetOwnerSavedSearchByIdResponse = {
  success: true
  data: SavedSearch
}

export const parseSearchOwnerSavedSearchesResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchOwnerSavedSearchesResponse => {
  const body = readRecord(value)

  if (body.success !== true) {
    throw new ApiError(
      "Saved search list response is missing required data.",
      500,
      "INVALID_SAVED_SEARCH_LIST_RESPONSE",
    )
  }

  const data = Array.isArray(body.data)
    ? body.data.map(parseSavedSearch)
    : []

  return {
    success: true,
    data,
    pagination: parsePagination(body.pagination, fallback),
  }
}

export const parseGetOwnerSavedSearchByIdResponse = (
  value: unknown,
): GetOwnerSavedSearchByIdResponse => {
  const body = readRecord(value)

  if (body.success !== true) {
    throw new ApiError(
      "Saved search response is missing required data.",
      500,
      "INVALID_SAVED_SEARCH_RESPONSE",
    )
  }

  return {
    success: true,
    data: parseSavedSearch(body.data),
  }
}
