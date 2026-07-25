import { ApiError, apiClient } from "@/lib/api-client"

import type {
  AdminBuildingEditRequestAgentProfile,
  AdminBuildingEditRequestBuilding,
  AdminBuildingEditRequest,
  AdminBuildingEditRequestsPagination,
  AdminBuildingEditRequestStatus,
  AdminBuildingEditRequestUser,
} from "./buildingEditRequestTypes"

export type AdminBuildingEditRequestStatusFilter =
  AdminBuildingEditRequestStatus

export type SearchAdminBuildingEditRequestsInput = {
  status?: AdminBuildingEditRequestStatusFilter
  page?: number
  limit?: number
}

export type SearchAdminBuildingEditRequestsResponse = {
  success: true
  data: AdminBuildingEditRequest[]
  pagination: AdminBuildingEditRequestsPagination
}

const INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE =
  "INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE"

const VALID_ADMIN_BUILDING_EDIT_REQUEST_STATUSES =
  new Set<AdminBuildingEditRequestStatus>(["PENDING", "APPROVED", "REJECTED"])

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function parseUser(value: unknown): AdminBuildingEditRequestUser | null {
  if (value === null || value === undefined) return null

  const user = readRecord(value)

  if (
    !user ||
    typeof user._id !== "string" ||
    typeof user.name !== "string" ||
    typeof user.email !== "string" ||
    typeof user.role !== "string" ||
    typeof user.status !== "string"
  ) {
    throw new ApiError(
      "Admin building edit request response is missing user data.",
      500,
      INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return user as AdminBuildingEditRequestUser
}

function parseAgentProfile(
  value: unknown,
): AdminBuildingEditRequestAgentProfile | null {
  if (value === null || value === undefined) return null

  const profile = readRecord(value)

  if (
    !profile ||
    typeof profile._id !== "string" ||
    typeof profile.userId !== "string" ||
    typeof profile.isOnline !== "boolean" ||
    typeof profile.isVerified !== "boolean"
  ) {
    throw new ApiError(
      "Admin building edit request response is missing agent profile data.",
      500,
      INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return {
    _id: profile._id,
    userId: profile.userId,
    isOnline: profile.isOnline,
    isDeleted:
      typeof profile.isDeleted === "boolean" ? profile.isDeleted : undefined,
    displayName: readNullableString(profile.displayName),
    profilePhoto: profile.profilePhoto as AdminBuildingEditRequestAgentProfile["profilePhoto"],
    phone: readNullableString(profile.phone),
    lineUrl: readNullableString(profile.lineUrl),
    whatsappPhone: readNullableString(profile.whatsappPhone),
    telegramUrl: readNullableString(profile.telegramUrl),
    viberPhone: readNullableString(profile.viberPhone),
    supportLanguages: readStringArray(profile.supportLanguages),
    isVerified: profile.isVerified,
  }
}

function parseBuildingSnapshot(value: unknown, fieldName: string) {
  const building = readRecord(value)
  const location = readRecord(building?.location)
  const coordinates = location?.coordinates
  const lng = Array.isArray(coordinates) ? coordinates[0] : undefined
  const lat = Array.isArray(coordinates) ? coordinates[1] : undefined

  if (
    !building ||
    typeof building.name !== "string" ||
    typeof building.buildingType !== "string" ||
    !location ||
    location.type !== "Point" ||
    typeof lng !== "number" ||
    typeof lat !== "number"
  ) {
    throw new ApiError(
      `Admin building edit request response is missing ${fieldName} data.`,
      500,
      INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return {
    name: building.name,
    buildingType: building.buildingType,
    facilities: readStringArray(building.facilities),
    security: readStringArray(building.security),
    location: {
      type: "Point" as const,
      coordinates: [lng, lat] as [number, number],
    },
    address: readNullableString(building.address) ?? "",
  }
}

export function parseAdminBuildingEditRequestBuilding(
  value: unknown,
): AdminBuildingEditRequestBuilding | null {
  if (value === null || value === undefined) return null

  const building = readRecord(value)
  const snapshot = parseBuildingSnapshot(value, "building")

  if (!building || typeof building._id !== "string") {
    throw new ApiError(
      "Admin building edit request response is missing building data.",
      500,
      INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return {
    ...snapshot,
    _id: building._id,
    isActive: building.isActive !== false,
    minRent: typeof building.minRent === "number" ? building.minRent : null,
    maxRent: typeof building.maxRent === "number" ? building.maxRent : null,
  }
}

export function parseAdminBuildingEditRequest(
  value: unknown,
): AdminBuildingEditRequest {
  const request = readRecord(value)
  const requestedBy = parseUser(request?.requestedBy)

  if (
    !request ||
    typeof request._id !== "string" ||
    typeof request.status !== "string" ||
    !VALID_ADMIN_BUILDING_EDIT_REQUEST_STATUSES.has(
      request.status as AdminBuildingEditRequestStatus,
    ) ||
    typeof request.buildingId !== "string" ||
    !requestedBy ||
    typeof request.createdAt !== "string" ||
    typeof request.updatedAt !== "string"
  ) {
    throw new ApiError(
      "Admin building edit request response is missing request data.",
      500,
      INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return {
    _id: request._id,
    status: request.status as AdminBuildingEditRequestStatus,
    buildingId: request.buildingId,
    building: parseAdminBuildingEditRequestBuilding(request.building),
    requestedBy,
    agentProfile: parseAgentProfile(request.agentProfile),
    requestReason: readNullableString(request.requestReason),
    originalBuilding: parseBuildingSnapshot(
      request.originalBuilding,
      "originalBuilding",
    ),
    proposedBuilding: parseBuildingSnapshot(
      request.proposedBuilding,
      "proposedBuilding",
    ),
    reviewedBy: parseUser(request.reviewedBy),
    reviewedAt: readNullableString(request.reviewedAt),
    reviewReason: readNullableString(request.reviewReason),
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }
}

function parsePagination(value: unknown): AdminBuildingEditRequestsPagination {
  const pagination = readRecord(value)

  if (
    !pagination ||
    typeof pagination.page !== "number" ||
    typeof pagination.limit !== "number" ||
    typeof pagination.total !== "number"
  ) {
    throw new ApiError(
      "Admin building edit request response is missing pagination data.",
      500,
      INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return pagination as AdminBuildingEditRequestsPagination
}

function parseSearchAdminBuildingEditRequestsResponse(
  value: unknown,
): SearchAdminBuildingEditRequestsResponse {
  const response = readRecord(value)

  if (
    !response ||
    response.success !== true ||
    !Array.isArray(response.data)
  ) {
    throw new ApiError(
      "Admin building edit request response is missing request data.",
      500,
      INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return {
    success: true,
    data: response.data.map(parseAdminBuildingEditRequest),
    pagination: parsePagination(response.pagination),
  }
}

export async function searchAdminBuildingEditRequests({
  status,
  page = 1,
  limit = 20,
}: SearchAdminBuildingEditRequestsInput = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (status) {
    searchParams.set("status", status)
  }

  const response = await apiClient.get<unknown>(
    `/admin/building-edit-requests?${searchParams.toString()}`,
  )

  return parseSearchAdminBuildingEditRequestsResponse(response.data)
}
