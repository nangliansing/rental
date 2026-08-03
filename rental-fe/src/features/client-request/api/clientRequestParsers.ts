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

export type ClientRequestStatus = "Waiting" | "Closed"

export type ClientRequestGeoSearchMode = "area" | "nearby" | "line"

export type ClientRequestGeoSearch = {
  mode: ClientRequestGeoSearchMode
  bounds?: SearchBounds
  position?: MapPosition
  radiusMeters?: number
  geometry?: SearchLinesGeometry
  distanceMeters?: number
  placeName?: string | null
}

export type ClientRequestFilters = MapSearchFilters

export type ClientRequest = {
  _id: string
  createdBy: string
  name: string
  description: string | null
  status: ClientRequestStatus
  geoSearch: ClientRequestGeoSearch
  filters: ClientRequestFilters
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export type SearchOwnerClientRequestsResponse = {
  success: true
  data: ClientRequest[]
  pagination: Pagination
}

const CLIENT_REQUEST_STATUSES = new Set<ClientRequestStatus>([
  "Waiting",
  "Closed",
])

const CLIENT_REQUEST_GEO_SEARCH_MODES = new Set<ClientRequestGeoSearchMode>([
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
        .filter((line): line is unknown[] => Array.isArray(line))
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

export const parseClientRequestStatus = (
  value: unknown,
  fallback: ClientRequestStatus = "Waiting",
): ClientRequestStatus => {
  return typeof value === "string" &&
    CLIENT_REQUEST_STATUSES.has(value as ClientRequestStatus)
    ? (value as ClientRequestStatus)
    : fallback
}

export const parseClientRequestGeoSearch = (
  value: unknown,
): ClientRequestGeoSearch => {
  const geoSearch = readRecord(value)
  const modeValue = readString(geoSearch.mode)
  const mode = CLIENT_REQUEST_GEO_SEARCH_MODES.has(
    modeValue as ClientRequestGeoSearchMode,
  )
    ? (modeValue as ClientRequestGeoSearchMode)
    : "area"

  const parsed: ClientRequestGeoSearch = { mode }

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

export const parseClientRequestFilters = (
  value: unknown,
): ClientRequestFilters => {
  const input = readRecord(value)
  const filters: ClientRequestFilters = {}

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

export const parseClientRequest = (value: unknown): ClientRequest => {
  const clientRequest = readRecord(value)
  const id = readString(clientRequest._id)
  const createdBy = readString(clientRequest.createdBy)
  const name = readString(clientRequest.name).trim()
  const createdAt = readString(clientRequest.createdAt)
  const updatedAt = readString(clientRequest.updatedAt)

  if (!id || !createdBy || !name || !createdAt || !updatedAt) {
    throw new ApiError(
      "Client request response is missing required data.",
      500,
      "INVALID_CLIENT_REQUEST_RESPONSE",
    )
  }

  return {
    _id: id,
    createdBy,
    name,
    description: readNullableString(clientRequest.description),
    status: parseClientRequestStatus(clientRequest.status),
    geoSearch: parseClientRequestGeoSearch(clientRequest.geoSearch),
    filters: parseClientRequestFilters(clientRequest.filters),
    isDeleted: readBoolean(clientRequest.isDeleted),
    deletedAt: readNullableString(clientRequest.deletedAt),
    createdAt,
    updatedAt,
  }
}

export type GetOwnerClientRequestByIdResponse = {
  success: true
  data: ClientRequest
}

export const parseSearchOwnerClientRequestsResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchOwnerClientRequestsResponse => {
  const body = readRecord(value)

  if (body.success !== true) {
    throw new ApiError(
      "Client request list response is missing required data.",
      500,
      "INVALID_CLIENT_REQUEST_LIST_RESPONSE",
    )
  }

  const data = Array.isArray(body.data)
    ? body.data.map(parseClientRequest)
    : []

  return {
    success: true,
    data,
    pagination: parsePagination(body.pagination, fallback),
  }
}

export const parseGetOwnerClientRequestByIdResponse = (
  value: unknown,
): GetOwnerClientRequestByIdResponse => {
  const body = readRecord(value)

  if (body.success !== true) {
    throw new ApiError(
      "Client request response is missing required data.",
      500,
      "INVALID_CLIENT_REQUEST_RESPONSE",
    )
  }

  return {
    success: true,
    data: parseClientRequest(body.data),
  }
}
