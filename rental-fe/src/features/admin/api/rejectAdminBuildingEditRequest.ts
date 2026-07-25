import { ApiError, apiClient } from "@/lib/api-client"

import type { AdminBuildingEditRequest } from "./buildingEditRequestTypes"
import { parseAdminBuildingEditRequest } from "./searchAdminBuildingEditRequests"

export type RejectAdminBuildingEditRequestInput = {
  buildingEditRequestId: string
  reviewReason: string
}

type RejectAdminBuildingEditRequestResponse = {
  success: true
  data: AdminBuildingEditRequest
}

const INVALID_ADMIN_REJECT_BUILDING_EDIT_REQUEST_RESPONSE =
  "INVALID_ADMIN_REJECT_BUILDING_EDIT_REQUEST_RESPONSE"

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseRejectAdminBuildingEditRequestResponse(
  value: unknown,
): RejectAdminBuildingEditRequestResponse {
  const response = readRecord(value)

  if (!response || response.success !== true) {
    throw new ApiError(
      "Reject building edit response is missing request data.",
      500,
      INVALID_ADMIN_REJECT_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return {
    success: true,
    data: parseAdminBuildingEditRequest(response.data),
  }
}

export async function rejectAdminBuildingEditRequest({
  buildingEditRequestId,
  reviewReason,
}: RejectAdminBuildingEditRequestInput) {
  const normalizedRequestId = buildingEditRequestId.trim()
  const normalizedReviewReason = reviewReason.trim()

  if (!normalizedRequestId) {
    throw new ApiError(
      "Building edit request id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  if (!normalizedReviewReason) {
    throw new ApiError(
      "Rejection reason is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.patch<unknown>(
    `/admin/building-edit-requests/${encodeURIComponent(normalizedRequestId)}/reject`,
    {
      reviewReason: normalizedReviewReason,
    },
  )

  return parseRejectAdminBuildingEditRequestResponse(response.data).data
}
