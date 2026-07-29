import { ApiError, apiClient } from "@/lib/api-client"

import type { AdminBuildingEditRequest } from "./buildingEditRequestTypes"
import { parseAdminBuildingEditRequest } from "./searchAdminBuildingEditRequests"

export type GetAdminBuildingEditRequestByIdResponse = {
  success: true
  data: AdminBuildingEditRequest
}

const INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE =
  "INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE"

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseGetAdminBuildingEditRequestByIdResponse(
  value: unknown,
): GetAdminBuildingEditRequestByIdResponse {
  const response = readRecord(value)

  if (!response || response.success !== true) {
    throw new ApiError(
      "Admin building edit request response is missing request data.",
      500,
      INVALID_ADMIN_BUILDING_EDIT_REQUEST_RESPONSE,
    )
  }

  return {
    success: true,
    data: parseAdminBuildingEditRequest(response.data),
  }
}

export async function getAdminBuildingEditRequestById(
  buildingEditRequestId: string,
  signal?: AbortSignal,
) {
  const response = await apiClient.get<unknown>(
    `/admin/building-edit-requests/${buildingEditRequestId}`,
    { signal },
  )

  return parseGetAdminBuildingEditRequestByIdResponse(response.data).data
}
