import { ApiError, apiClient } from "@/lib/api-client"

import type { AuthUser } from "@/features/auth/types"

import { parseAuthUser } from "./createAdminSuspension"

export type AdminPlatformAdmin = AuthUser & {
  role: "OWNER" | "ADMIN"
}

export type AdminPlatformAdminsPagination = {
  page: number
  limit: number
  total: number
}

export type SearchAdminPlatformAdminsInput = {
  page?: number
  limit?: number
  signal?: AbortSignal
}

export type SearchAdminPlatformAdminsResponse = {
  success: true
  data: AdminPlatformAdmin[]
  pagination: AdminPlatformAdminsPagination
}

const INVALID_ADMIN_PLATFORM_ADMINS_RESPONSE =
  "INVALID_ADMIN_PLATFORM_ADMINS_RESPONSE"

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseAdminPlatformAdmin(value: unknown): AdminPlatformAdmin {
  const user = parseAuthUser(value)

  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    throw new ApiError(
      "Admin platform admins response is missing user data.",
      500,
      INVALID_ADMIN_PLATFORM_ADMINS_RESPONSE,
    )
  }

  return user as AdminPlatformAdmin
}

function parsePagination(value: unknown): AdminPlatformAdminsPagination {
  const pagination = readRecord(value)

  if (
    !pagination ||
    typeof pagination.page !== "number" ||
    typeof pagination.limit !== "number" ||
    typeof pagination.total !== "number"
  ) {
    throw new ApiError(
      "Admin platform admins response is missing pagination data.",
      500,
      INVALID_ADMIN_PLATFORM_ADMINS_RESPONSE,
    )
  }

  return pagination as AdminPlatformAdminsPagination
}

function parseSearchAdminPlatformAdminsResponse(
  value: unknown,
): SearchAdminPlatformAdminsResponse {
  const response = readRecord(value)

  if (!response || response.success !== true || !Array.isArray(response.data)) {
    throw new ApiError(
      "Admin platform admins response is missing user data.",
      500,
      INVALID_ADMIN_PLATFORM_ADMINS_RESPONSE,
    )
  }

  return {
    success: true,
    data: response.data.map(parseAdminPlatformAdmin),
    pagination: parsePagination(response.pagination),
  }
}

export async function searchAdminPlatformAdmins({
  page = 1,
  limit = 20,
  signal,
}: SearchAdminPlatformAdminsInput = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  const response = await apiClient.get<unknown>(
    `/admin/users/platform-admins?${searchParams.toString()}`,
    { signal },
  )

  return parseSearchAdminPlatformAdminsResponse(response.data)
}
