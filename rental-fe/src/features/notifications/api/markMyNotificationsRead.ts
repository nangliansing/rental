import { ApiError, apiClient } from "@/lib/api-client"

import { readNumber, readRecord } from "./parseUtils"

export type MarkMyNotificationsReadResponse = {
  success: true
  data: {
    matchedCount: number
    modifiedCount: number
  }
}

const parseMarkMyNotificationsReadResponse = (
  value: unknown,
): MarkMyNotificationsReadResponse => {
  const body = readRecord(value)
  const data = readRecord(body.data)
  const matchedCount = readNumber(data.matchedCount, Number.NaN)
  const modifiedCount = readNumber(data.modifiedCount, Number.NaN)

  if (
    body.success !== true ||
    !Number.isInteger(matchedCount) ||
    matchedCount < 0 ||
    !Number.isInteger(modifiedCount) ||
    modifiedCount < 0
  ) {
    throw new ApiError(
      "Notification read response is missing required data.",
      500,
      "INVALID_NOTIFICATION_READ_RESPONSE",
    )
  }

  return {
    success: true,
    data: {
      matchedCount,
      modifiedCount,
    },
  }
}

export async function markMyNotificationsRead() {
  const response = await apiClient.patch<MarkMyNotificationsReadResponse>(
    "/notifications/me/read-all",
  )

  return parseMarkMyNotificationsReadResponse(response.data)
}
