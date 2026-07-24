import { ApiError, apiClient } from "@/lib/api-client"

import type { AuthUser } from "@/features/auth/types"

export type AdminSuspensionStatus = "ACTIVE" | "LIFTED" | "EXPIRED"

export type AdminSuspension = {
  _id: string
  userId: string
  status: AdminSuspensionStatus
  reason: string
  note: string | null
  startsAt: string
  expiresAt: string
  createdBy: string
  liftedBy: string | null
  liftedAt: string | null
  liftReason: string | null
  createdAt: string
  updatedAt: string
}

export type CreateAdminSuspensionInput = {
  userId: string
  reason: string
  note?: string
  startsAt?: string
  expiresAt: string
}

export type CreateAdminSuspensionResult = {
  suspension: AdminSuspension
  user: AuthUser
}

type CreateAdminSuspensionResponse = {
  success: true
  data: CreateAdminSuspensionResult
}

const INVALID_ADMIN_CREATE_SUSPENSION_RESPONSE =
  "INVALID_ADMIN_CREATE_SUSPENSION_RESPONSE"

const adminSuspensionStatuses = new Set<AdminSuspensionStatus>([
  "ACTIVE",
  "LIFTED",
  "EXPIRED",
])

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null
}

export function parseAuthUser(value: unknown): AuthUser | null {
  const user = readRecord(value)

  if (
    !user ||
    typeof user._id !== "string" ||
    typeof user.name !== "string" ||
    typeof user.email !== "string" ||
    typeof user.authProvider !== "string" ||
    typeof user.role !== "string" ||
    typeof user.status !== "string" ||
    typeof user.createdAt !== "string" ||
    typeof user.updatedAt !== "string"
  ) {
    return null
  }

  return user as AuthUser
}

export function parseAdminSuspension(value: unknown): AdminSuspension | null {
  const suspension = readRecord(value)

  if (
    !suspension ||
    typeof suspension._id !== "string" ||
    typeof suspension.userId !== "string" ||
    typeof suspension.status !== "string" ||
    !adminSuspensionStatuses.has(suspension.status as AdminSuspensionStatus) ||
    typeof suspension.reason !== "string" ||
    !isNullableString(suspension.note) ||
    typeof suspension.startsAt !== "string" ||
    typeof suspension.expiresAt !== "string" ||
    typeof suspension.createdBy !== "string" ||
    !isNullableString(suspension.liftedBy) ||
    !isNullableString(suspension.liftedAt) ||
    !isNullableString(suspension.liftReason) ||
    typeof suspension.createdAt !== "string" ||
    typeof suspension.updatedAt !== "string"
  ) {
    return null
  }

  return suspension as AdminSuspension
}

function parseCreateAdminSuspensionResponse(
  value: unknown,
): CreateAdminSuspensionResult {
  const response = readRecord(value)
  const data = readRecord(response?.data)
  const suspension = parseAdminSuspension(data?.suspension)
  const user = parseAuthUser(data?.user)

  if (response?.success !== true || !suspension || !user) {
    throw new ApiError(
      "Admin suspension response is missing suspension data.",
      500,
      INVALID_ADMIN_CREATE_SUSPENSION_RESPONSE,
    )
  }

  return { suspension, user }
}

export async function createAdminSuspension({
  userId,
  reason,
  note,
  startsAt,
  expiresAt,
}: CreateAdminSuspensionInput) {
  const trimmedNote = note?.trim()

  const response = await apiClient.post<CreateAdminSuspensionResponse>(
    "/admin/suspensions",
    {
      userId,
      reason: reason.trim(),
      ...(trimmedNote ? { note: trimmedNote } : {}),
      ...(startsAt ? { startsAt } : {}),
      expiresAt,
    },
  )

  return parseCreateAdminSuspensionResponse(response.data)
}
