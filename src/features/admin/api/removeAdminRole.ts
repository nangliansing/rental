import { ApiError, apiClient } from "@/lib/api-client"

import type { AuthUser } from "@/features/auth/types"

import { parseAuthUser } from "./createAdminSuspension"

export type RemoveAdminRoleInput = {
  userId: string
}

export type RemoveAdminRoleResponse = {
  success: true
  data: AuthUser
}

const INVALID_ADMIN_REMOVE_ROLE_RESPONSE =
  "INVALID_ADMIN_REMOVE_ROLE_RESPONSE"

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseRemoveAdminRoleResponse(value: unknown): AuthUser {
  const response = readRecord(value)
  const user = parseAuthUser(response?.data)

  if (response?.success !== true || !user || user.role !== "USER") {
    throw new ApiError(
      "Remove admin role response is missing user data.",
      500,
      INVALID_ADMIN_REMOVE_ROLE_RESPONSE,
    )
  }

  return user
}

export async function removeAdminRole({ userId }: RemoveAdminRoleInput) {
  const normalizedUserId = userId.trim()
  if (!normalizedUserId) {
    throw new ApiError("User id is required.", 422, "VALIDATION_ERROR")
  }

  const response = await apiClient.patch<unknown>(
    `/admin/users/${encodeURIComponent(normalizedUserId)}/remove-admin`,
  )

  return parseRemoveAdminRoleResponse(response.data)
}
