import { ApiError, apiClient } from "@/lib/api-client"

import type { AuthUser } from "@/features/auth/types"

import {
  parseAdminSuspension,
  type AdminSuspension,
  type AdminSuspensionStatus,
} from "./createAdminSuspension"

export type AdminSuspensionStatusFilter = AdminSuspensionStatus | "all"

export type AdminSuspensionUser = Pick<
  AuthUser,
  "_id" | "name" | "email" | "role" | "status"
>

export type AdminSuspensionListItem = Omit<
  AdminSuspension,
  "createdBy" | "liftedBy"
> & {
  user: AdminSuspensionUser | null
  createdBy: AdminSuspensionUser | null
  liftedBy: AdminSuspensionUser | null
}

export type AdminSuspensionsPagination = {
  page: number
  limit: number
  total: number
}

export type SearchAdminSuspensionsInput = {
  status?: AdminSuspensionStatusFilter
  page?: number
  limit?: number
}

export type SearchAdminSuspensionsResponse = {
  success: true
  data: AdminSuspensionListItem[]
  pagination: AdminSuspensionsPagination
}

const INVALID_ADMIN_SUSPENSION_RESPONSE = "INVALID_ADMIN_SUSPENSION_RESPONSE"

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseAdminSuspensionUser(value: unknown): AdminSuspensionUser | null {
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
      "Admin suspension response is missing user data.",
      500,
      INVALID_ADMIN_SUSPENSION_RESPONSE,
    )
  }

  return user as AdminSuspensionUser
}

export function parseAdminSuspensionListItem(
  value: unknown,
): AdminSuspensionListItem {
  const row = readRecord(value)

  if (!row) {
    throw new ApiError(
      "Admin suspension response is missing suspension data.",
      500,
      INVALID_ADMIN_SUSPENSION_RESPONSE,
    )
  }

  const createdByValue = row.createdBy
  const liftedByValue = row.liftedBy
  const baseSuspension = parseAdminSuspension({
    ...row,
    createdBy:
      typeof createdByValue === "string"
        ? createdByValue
        : readRecord(createdByValue)?._id,
    liftedBy:
      typeof liftedByValue === "string"
        ? liftedByValue
        : (readRecord(liftedByValue)?._id ?? null),
  })

  if (!baseSuspension) {
    throw new ApiError(
      "Admin suspension response is missing suspension data.",
      500,
      INVALID_ADMIN_SUSPENSION_RESPONSE,
    )
  }

  return {
    _id: baseSuspension._id,
    userId: baseSuspension.userId,
    status: baseSuspension.status,
    reason: baseSuspension.reason,
    note: baseSuspension.note,
    startsAt: baseSuspension.startsAt,
    expiresAt: baseSuspension.expiresAt,
    liftedAt: baseSuspension.liftedAt,
    liftReason: baseSuspension.liftReason,
    createdAt: baseSuspension.createdAt,
    updatedAt: baseSuspension.updatedAt,
    user: parseAdminSuspensionUser(row.user),
    createdBy: parseAdminSuspensionUser(createdByValue),
    liftedBy: parseAdminSuspensionUser(liftedByValue),
  }
}

function parsePagination(value: unknown): AdminSuspensionsPagination {
  const pagination = readRecord(value)

  if (
    !pagination ||
    typeof pagination.page !== "number" ||
    typeof pagination.limit !== "number" ||
    typeof pagination.total !== "number"
  ) {
    throw new ApiError(
      "Admin suspension response is missing pagination data.",
      500,
      INVALID_ADMIN_SUSPENSION_RESPONSE,
    )
  }

  return pagination as AdminSuspensionsPagination
}

function parseSearchAdminSuspensionsResponse(
  value: unknown,
): SearchAdminSuspensionsResponse {
  const response = readRecord(value)

  if (
    !response ||
    response.success !== true ||
    !Array.isArray(response.data)
  ) {
    throw new ApiError(
      "Admin suspension response is missing suspension data.",
      500,
      INVALID_ADMIN_SUSPENSION_RESPONSE,
    )
  }

  return {
    success: true,
    data: response.data.map(parseAdminSuspensionListItem),
    pagination: parsePagination(response.pagination),
  }
}

export async function searchAdminSuspensions({
  status,
  page = 1,
  limit = 20,
}: SearchAdminSuspensionsInput = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (status && status !== "all") {
    searchParams.set("status", status)
  }

  const response = await apiClient.get<SearchAdminSuspensionsResponse>(
    `/admin/suspensions?${searchParams.toString()}`,
  )

  return parseSearchAdminSuspensionsResponse(response.data)
}
