import { ApiError, apiClient } from "@/lib/api-client"

import type { BuildingFormValues } from "@/features/listing/components/BuildingForm"

export type BuildingEditRequestStatus = "PENDING" | "APPROVED" | "REJECTED"

export type BuildingEditRequestSnapshot = BuildingFormValues & {
  location: {
    type: "Point"
    coordinates: [number, number]
  }
}

export type CreateBuildingEditRequestInput = {
  buildingId: string
  proposedBuilding: BuildingEditRequestSnapshot
  requestReason?: string | null
}

export type BuildingEditRequest = {
  _id: string
  status: BuildingEditRequestStatus
  buildingId: string
  requestedBy: string
  requestReason: string | null
  originalBuilding: BuildingEditRequestSnapshot
  proposedBuilding: BuildingEditRequestSnapshot
  reviewedBy: string | null
  reviewedAt: string | null
  reviewReason: string | null
  createdAt: string
  updatedAt: string
}

type CreateBuildingEditRequestResponse = {
  success: true
  data: BuildingEditRequest
}

const INVALID_CREATE_BUILDING_EDIT_REQUEST_RESPONSE =
  "INVALID_CREATE_BUILDING_EDIT_REQUEST_RESPONSE"

const validBuildingEditRequestStatuses = new Set<BuildingEditRequestStatus>([
  "PENDING",
  "APPROVED",
  "REJECTED",
])

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function readStringArray(value: unknown) {
  return isStringArray(value) ? value : []
}

function readNullableString(value: unknown) {
  return typeof value === "string" || value === null ? value : null
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null
}

function parseBuildingEditRequestSnapshot(
  value: unknown,
  fieldName: string,
): BuildingEditRequestSnapshot {
  const building = readRecord(value)
  const location = readRecord(building?.location)
  const coordinates = location?.coordinates
  const lng = Array.isArray(coordinates) ? coordinates[0] : undefined
  const lat = Array.isArray(coordinates) ? coordinates[1] : undefined

  if (
    !building ||
    typeof building.name !== "string" ||
    typeof building.buildingType !== "string" ||
    !isStringArray(building.facilities) ||
    !isStringArray(building.security) ||
    !location ||
    location.type !== "Point" ||
    typeof lng !== "number" ||
    typeof lat !== "number"
  ) {
    throw new ApiError(
      `Could not read ${fieldName} from building edit request response.`,
      500,
      INVALID_CREATE_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return {
    name: building.name,
    buildingType: building.buildingType,
    facilities: readStringArray(building.facilities),
    security: readStringArray(building.security),
    location: {
      type: "Point",
      coordinates: [lng, lat],
    },
    address: readNullableString(building.address) ?? "",
  }
}

function parseBuildingEditRequest(value: unknown): BuildingEditRequest {
  const request = readRecord(value)

  if (
    !request ||
    typeof request._id !== "string" ||
    typeof request.status !== "string" ||
    !validBuildingEditRequestStatuses.has(
      request.status as BuildingEditRequestStatus,
    ) ||
    typeof request.buildingId !== "string" ||
    typeof request.requestedBy !== "string" ||
    !isNullableString(request.requestReason) ||
    !isNullableString(request.reviewedBy) ||
    !isNullableString(request.reviewedAt) ||
    !isNullableString(request.reviewReason) ||
    typeof request.createdAt !== "string" ||
    typeof request.updatedAt !== "string"
  ) {
    throw new ApiError(
      "Could not read building edit request response.",
      500,
      INVALID_CREATE_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return {
    _id: request._id,
    status: request.status as BuildingEditRequestStatus,
    buildingId: request.buildingId,
    requestedBy: request.requestedBy,
    requestReason: readNullableString(request.requestReason),
    originalBuilding: parseBuildingEditRequestSnapshot(
      request.originalBuilding,
      "originalBuilding",
    ),
    proposedBuilding: parseBuildingEditRequestSnapshot(
      request.proposedBuilding,
      "proposedBuilding",
    ),
    reviewedBy: readNullableString(request.reviewedBy),
    reviewedAt: readNullableString(request.reviewedAt),
    reviewReason: readNullableString(request.reviewReason),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }
}

function parseCreateBuildingEditRequestResponse(value: unknown) {
  const response = readRecord(value)

  if (!response || response.success !== true || !("data" in response)) {
    throw new ApiError(
      "Could not read building edit request response.",
      500,
      INVALID_CREATE_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return parseBuildingEditRequest(response.data)
}

export async function createBuildingEditRequest(
  input: CreateBuildingEditRequestInput,
) {
  const buildingId = input.buildingId.trim()
  const requestReason = input.requestReason?.trim()

  if (!buildingId) {
    throw new ApiError("Building id is required.", 422, "VALIDATION_ERROR")
  }

  const response = await apiClient.post<CreateBuildingEditRequestResponse>(
    "/building-edit-requests",
    {
      buildingId,
      proposedBuilding: input.proposedBuilding,
      ...(requestReason ? { requestReason } : {}),
    },
  )

  return parseCreateBuildingEditRequestResponse(response.data)
}
