import { ApiError, apiClient } from "@/lib/api-client"

import type {
  AdminBuildingEditRequest,
  AdminBuildingEditRequestBuilding,
} from "./buildingEditRequestTypes"
import {
  parseAdminBuildingEditRequest,
  parseAdminBuildingEditRequestBuilding,
} from "./searchAdminBuildingEditRequests"

export type ApproveAdminBuildingEditRequestInput = {
  buildingEditRequestId: string
  reviewReason?: string | null
}

export type ApproveAdminBuildingEditRequestResult = {
  request: AdminBuildingEditRequest
  building: AdminBuildingEditRequestBuilding
}

type ApproveAdminBuildingEditRequestResponse = {
  success: true
  data: ApproveAdminBuildingEditRequestResult
}

const INVALID_ADMIN_APPROVE_BUILDING_EDIT_REQUEST_RESPONSE =
  "INVALID_ADMIN_APPROVE_BUILDING_EDIT_REQUEST_RESPONSE"

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseApproveAdminBuildingEditRequestResponse(
  value: unknown,
): ApproveAdminBuildingEditRequestResponse {
  const response = readRecord(value)
  const data = readRecord(response?.data)
  const building = parseAdminBuildingEditRequestBuilding(data?.building)

  if (!response || response.success !== true || !data || !building) {
    throw new ApiError(
      "Approve building edit response is missing request or building data.",
      500,
      INVALID_ADMIN_APPROVE_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return {
    success: true,
    data: {
      request: parseAdminBuildingEditRequest(data.request),
      building,
    },
  }
}

export async function approveAdminBuildingEditRequest({
  buildingEditRequestId,
  reviewReason,
}: ApproveAdminBuildingEditRequestInput) {
  const normalizedRequestId = buildingEditRequestId.trim()

  if (!normalizedRequestId) {
    throw new ApiError(
      "Building edit request id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const body =
    reviewReason == null || reviewReason.trim() === ""
      ? undefined
      : { reviewReason: reviewReason.trim() }

  const response = await apiClient.patch<unknown>(
    `/admin/building-edit-requests/${encodeURIComponent(normalizedRequestId)}/approve`,
    body,
  )

  return parseApproveAdminBuildingEditRequestResponse(response.data).data
}
