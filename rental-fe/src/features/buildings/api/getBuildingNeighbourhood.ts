import { ApiError, apiClient } from "@/lib/api-client"
import {
  readNumber,
  readRecord,
  readString,
} from "@/features/listing/api/listingResponseParsers"

import {
  NEIGHBOURHOOD_DEFAULT_RADIUS_METERS,
  NEIGHBOURHOOD_FETCH_RADIUS_METERS,
} from "../constants/neighbourhood"

export type NeighbourhoodCacheStatus = "miss" | "hit" | "bypass" | "stale"

export type NeighbourhoodCategoryKey =
  | "public_transport"
  | "convenience"
  | "supermarket"
  | "restaurant"
  | "cafe"
  | "pharmacy"
  | "market"
  | "shopping_mall"
  | "gym"
  | "hospital"

export type NeighbourhoodPlace = {
  id: string
  name: string
  lat: number
  lng: number
  category: NeighbourhoodCategoryKey
  distanceMeters: number
  mode?: string
  line?: string
}

export type NeighbourhoodCategory = {
  key: NeighbourhoodCategoryKey
  label: string
  priority: number
  count: number
}

export type BuildingNeighbourhood = {
  buildingId: string
  origin: {
    lat: number
    lng: number
  }
  radiusMeters: number
  fetchRadiusMeters: number
  fetchedAt: string
  cacheStatus: NeighbourhoodCacheStatus
  source: "openstreetmap"
  summary: {
    all: number
    truncated?: boolean
    totalWithinRadius?: number
  } & Partial<Record<NeighbourhoodCategoryKey, number>>
  categories: NeighbourhoodCategory[]
  places: NeighbourhoodPlace[]
}

export type GetBuildingNeighbourhoodResponse = {
  success: true
  data: BuildingNeighbourhood
}

export type GetBuildingNeighbourhoodInput = {
  buildingId: string
  radiusM?: number
  fetchRadiusM?: number
}

const INVALID_GET_BUILDING_NEIGHBOURHOOD_RESPONSE =
  "INVALID_GET_BUILDING_NEIGHBOURHOOD_RESPONSE"

const NEIGHBOURHOOD_CATEGORY_KEYS = new Set<NeighbourhoodCategoryKey>([
  "public_transport",
  "convenience",
  "supermarket",
  "restaurant",
  "cafe",
  "pharmacy",
  "market",
  "shopping_mall",
  "gym",
  "hospital",
])

const NEIGHBOURHOOD_CACHE_STATUSES = new Set<NeighbourhoodCacheStatus>([
  "miss",
  "hit",
  "bypass",
  "stale",
])

function isNeighbourhoodCategoryKey(
  value: string,
): value is NeighbourhoodCategoryKey {
  return NEIGHBOURHOOD_CATEGORY_KEYS.has(value as NeighbourhoodCategoryKey)
}

function parseOrigin(value: unknown) {
  const origin = readRecord(value)
  const lat = readNumber(origin.lat)
  const lng = readNumber(origin.lng)

  if (lat == null || lng == null) {
    throw new ApiError(
      "Could not read neighbourhood origin.",
      500,
      INVALID_GET_BUILDING_NEIGHBOURHOOD_RESPONSE,
    )
  }

  return { lat, lng }
}

function parseNeighbourhoodPlace(value: unknown): NeighbourhoodPlace | null {
  const place = readRecord(value)
  const id = readString(place.id)
  const name = readString(place.name)
  const category = readString(place.category)
  const lat = readNumber(place.lat)
  const lng = readNumber(place.lng)
  const distanceMeters = readNumber(place.distanceMeters)

  if (
    !id ||
    !name ||
    !isNeighbourhoodCategoryKey(category) ||
    lat == null ||
    lng == null ||
    distanceMeters == null
  ) {
    return null
  }

  const mode = readString(place.mode)
  const line = readString(place.line)

  return {
    id,
    name,
    lat,
    lng,
    category,
    distanceMeters,
    ...(mode ? { mode } : {}),
    ...(line ? { line } : {}),
  }
}

function parseNeighbourhoodCategory(
  value: unknown,
): NeighbourhoodCategory | null {
  const category = readRecord(value)
  const key = readString(category.key)
  const label = readString(category.label)
  const priority = readNumber(category.priority)
  const count = readNumber(category.count)

  if (
    !isNeighbourhoodCategoryKey(key) ||
    !label ||
    priority == null ||
    count == null
  ) {
    return null
  }

  return { key, label, priority, count }
}

function parseNeighbourhoodSummary(value: unknown) {
  const summary = readRecord(value)
  const all = readNumber(summary.all)

  if (all == null) {
    throw new ApiError(
      "Could not read neighbourhood summary.",
      500,
      INVALID_GET_BUILDING_NEIGHBOURHOOD_RESPONSE,
    )
  }

  const parsedSummary: BuildingNeighbourhood["summary"] = { all }

  const truncated = summary.truncated
  if (truncated === true) {
    parsedSummary.truncated = true
  }

  const totalWithinRadius = readNumber(summary.totalWithinRadius)
  if (totalWithinRadius != null) {
    parsedSummary.totalWithinRadius = totalWithinRadius
  }

  for (const key of NEIGHBOURHOOD_CATEGORY_KEYS) {
    const count = readNumber(summary[key])

    if (count != null) {
      parsedSummary[key] = count
    }
  }

  return parsedSummary
}

function parseBuildingNeighbourhood(value: unknown): BuildingNeighbourhood {
  const neighbourhood = readRecord(value)
  const buildingId = readString(neighbourhood.buildingId)
  const fetchedAt = readString(neighbourhood.fetchedAt)
  const cacheStatus = readString(neighbourhood.cacheStatus)
  const source = readString(neighbourhood.source)
  const radiusMeters = readNumber(neighbourhood.radiusMeters)
  const fetchRadiusMeters = readNumber(neighbourhood.fetchRadiusMeters)

  if (
    !buildingId ||
    !fetchedAt ||
    !NEIGHBOURHOOD_CACHE_STATUSES.has(cacheStatus as NeighbourhoodCacheStatus) ||
    source !== "openstreetmap" ||
    radiusMeters == null ||
    fetchRadiusMeters == null
  ) {
    throw new ApiError(
      "Could not read neighbourhood response.",
      500,
      INVALID_GET_BUILDING_NEIGHBOURHOOD_RESPONSE,
    )
  }

  const places = Array.isArray(neighbourhood.places)
    ? neighbourhood.places.flatMap((place) => {
        const parsedPlace = parseNeighbourhoodPlace(place)

        return parsedPlace ? [parsedPlace] : []
      })
    : []

  const categories = Array.isArray(neighbourhood.categories)
    ? neighbourhood.categories.flatMap((category) => {
        const parsedCategory = parseNeighbourhoodCategory(category)

        return parsedCategory ? [parsedCategory] : []
      })
    : []

  return {
    buildingId,
    origin: parseOrigin(neighbourhood.origin),
    radiusMeters,
    fetchRadiusMeters,
    fetchedAt,
    cacheStatus: cacheStatus as NeighbourhoodCacheStatus,
    source: "openstreetmap",
    summary: parseNeighbourhoodSummary(neighbourhood.summary),
    categories,
    places,
  }
}

function parseGetBuildingNeighbourhoodResponse(value: unknown) {
  const response = readRecord(value)

  if (!response || response.success !== true || !("data" in response)) {
    throw new ApiError(
      "Could not read neighbourhood response.",
      500,
      INVALID_GET_BUILDING_NEIGHBOURHOOD_RESPONSE,
    )
  }

  return parseBuildingNeighbourhood(response.data)
}

export async function getBuildingNeighbourhood({
  buildingId,
  radiusM = NEIGHBOURHOOD_DEFAULT_RADIUS_METERS,
  fetchRadiusM = NEIGHBOURHOOD_FETCH_RADIUS_METERS,
}: GetBuildingNeighbourhoodInput) {
  const searchParams = new URLSearchParams({
    radiusM: String(radiusM),
    fetchRadiusM: String(fetchRadiusM),
  })

  const response = await apiClient.get<GetBuildingNeighbourhoodResponse>(
    `/buildings/${buildingId}/neighbourhood?${searchParams.toString()}`,
  )

  return parseGetBuildingNeighbourhoodResponse(response.data)
}
