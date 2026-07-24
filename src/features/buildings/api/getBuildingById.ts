import { ApiError, apiClient } from "@/lib/api-client"

import type { BuildingLocation } from "@/features/map-search/types"

export type BuildingDetails = {
  _id: string
  name: string
  buildingType: string
  facilities: string[]
  security: string[]
  location: BuildingLocation
  address: string | null
  minRent: number | null
  maxRent: number | null
  createdAt: string
  updatedAt: string
}

export type GetBuildingByIdResponse = {
  success: true
  data: BuildingDetails
}

const INVALID_GET_BUILDING_BY_ID_RESPONSE =
  "INVALID_GET_BUILDING_BY_ID_RESPONSE"

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null
}

function isNullableNumber(value: unknown): value is number | null {
  return (typeof value === "number" && Number.isFinite(value)) || value === null
}

function parseBuildingLocation(value: unknown): BuildingLocation {
  const location = readRecord(value)
  const coordinates = location?.coordinates
  const lng = Array.isArray(coordinates) ? coordinates[0] : undefined
  const lat = Array.isArray(coordinates) ? coordinates[1] : undefined

  if (
    !location ||
    location.type !== "Point" ||
    typeof lng !== "number" ||
    !Number.isFinite(lng) ||
    typeof lat !== "number" ||
    !Number.isFinite(lat)
  ) {
    throw new ApiError(
      "Could not read building location response.",
      500,
      INVALID_GET_BUILDING_BY_ID_RESPONSE,
    )
  }

  return {
    type: "Point",
    coordinates: [lng, lat],
  }
}

function parseBuildingDetails(value: unknown): BuildingDetails {
  const building = readRecord(value)

  if (
    !building ||
    typeof building._id !== "string" ||
    typeof building.name !== "string" ||
    typeof building.buildingType !== "string" ||
    !isStringArray(building.facilities) ||
    !isStringArray(building.security) ||
    !isNullableString(building.address) ||
    !isNullableNumber(building.minRent) ||
    !isNullableNumber(building.maxRent) ||
    typeof building.createdAt !== "string" ||
    typeof building.updatedAt !== "string"
  ) {
    throw new ApiError(
      "Could not read building response.",
      500,
      INVALID_GET_BUILDING_BY_ID_RESPONSE,
    )
  }

  return {
    _id: building._id,
    name: building.name,
    buildingType: building.buildingType,
    facilities: building.facilities,
    security: building.security,
    location: parseBuildingLocation(building.location),
    address: building.address,
    minRent: building.minRent,
    maxRent: building.maxRent,
    createdAt: building.createdAt,
    updatedAt: building.updatedAt,
  }
}

function parseGetBuildingByIdResponse(value: unknown) {
  const response = readRecord(value)

  if (!response || response.success !== true || !("data" in response)) {
    throw new ApiError(
      "Could not read building response.",
      500,
      INVALID_GET_BUILDING_BY_ID_RESPONSE,
    )
  }

  return parseBuildingDetails(response.data)
}

export async function getBuildingById(buildingId: string) {
  const response = await apiClient.get<GetBuildingByIdResponse>(
    `/buildings/${buildingId}`,
  )

  return parseGetBuildingByIdResponse(response.data)
}
