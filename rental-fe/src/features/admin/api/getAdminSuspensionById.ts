import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseAdminSuspensionListItem,
  type AdminSuspensionListItem,
} from "./searchAdminSuspensions"

export type GetAdminSuspensionByIdResponse = {
  success: true
  data: AdminSuspensionListItem
}

const INVALID_ADMIN_SUSPENSION_RESPONSE = "INVALID_ADMIN_SUSPENSION_RESPONSE"

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseGetAdminSuspensionByIdResponse(
  value: unknown,
): GetAdminSuspensionByIdResponse {
  const response = readRecord(value)

  if (!response || response.success !== true) {
    throw new ApiError(
      "Admin suspension response is missing suspension data.",
      500,
      INVALID_ADMIN_SUSPENSION_RESPONSE,
    )
  }

  return {
    success: true,
    data: parseAdminSuspensionListItem(response.data),
  }
}

export async function getAdminSuspensionById(suspensionId: string) {
  const response = await apiClient.get<unknown>(
    `/admin/suspensions/${encodeURIComponent(suspensionId)}`,
  )

  return parseGetAdminSuspensionByIdResponse(response.data).data
}
