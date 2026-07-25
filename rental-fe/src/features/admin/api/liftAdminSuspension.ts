import { ApiError, apiClient } from "@/lib/api-client"

import type { AuthUser } from "@/features/auth/types"

import { parseAuthUser } from "./createAdminSuspension"
import {
  parseAdminSuspensionListItem,
  type AdminSuspensionListItem,
} from "./searchAdminSuspensions"

export type LiftAdminSuspensionInput = {
  suspensionId: string
  liftReason: string
}

export type LiftAdminSuspensionResult = {
  suspension: AdminSuspensionListItem
  user: AuthUser
}

const INVALID_ADMIN_LIFT_SUSPENSION_RESPONSE =
  "INVALID_ADMIN_LIFT_SUSPENSION_RESPONSE"

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseLiftAdminSuspensionResponse(
  value: unknown,
): LiftAdminSuspensionResult {
  const response = readRecord(value)
  const data = readRecord(response?.data)
  const user = parseAuthUser(data?.user)

  if (response?.success !== true || !data || !user) {
    throw new ApiError(
      "Admin suspension response is missing suspension data.",
      500,
      INVALID_ADMIN_LIFT_SUSPENSION_RESPONSE,
    )
  }

  return {
    suspension: parseAdminSuspensionListItem(data.suspension),
    user,
  }
}

export async function liftAdminSuspension({
  suspensionId,
  liftReason,
}: LiftAdminSuspensionInput) {
  const normalizedSuspensionId = suspensionId.trim()
  const normalizedLiftReason = liftReason.trim()

  if (!normalizedSuspensionId) {
    throw new ApiError("Suspension id is required.", 422, "VALIDATION_ERROR")
  }
  if (!normalizedLiftReason) {
    throw new ApiError("Lift reason is required.", 422, "VALIDATION_ERROR")
  }

  const response = await apiClient.patch<unknown>(
    `/admin/suspensions/${encodeURIComponent(normalizedSuspensionId)}/lift`,
    {
      liftReason: normalizedLiftReason,
    },
  )

  return parseLiftAdminSuspensionResponse(response.data)
}
