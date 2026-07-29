import { ApiError, apiClient } from "@/lib/api-client"

import type {
  NotificationEntityType,
  NotificationItem,
  NotificationType,
} from "../types"
import {
  normalizePositiveInteger,
  readBoolean,
  readNullableString,
  readNumber,
  readRecord,
  readString,
} from "./parseUtils"

export type NotificationReadFilter = boolean | null

export type NotificationsPagination = {
  page: number
  limit: number
  total: number
}

export type GetMyNotificationsInput = {
  isRead?: NotificationReadFilter
  page?: number
  limit?: number
  signal?: AbortSignal
}

export type GetMyNotificationsResponse = {
  success: true
  data: NotificationItem[]
  pagination: NotificationsPagination
  unreadCount: number
}

const parseMetadata = (value: unknown): Record<string, unknown> => {
  return readRecord(value)
}

const parsePagination = (
  value: unknown,
  fallback: { page: number; limit: number },
): NotificationsPagination => {
  const pagination = readRecord(value)

  return {
    page: readNumber(pagination.page, fallback.page),
    limit: readNumber(pagination.limit, fallback.limit),
    total: readNumber(pagination.total, 0),
  }
}

export const parseNotificationItem = (value: unknown): NotificationItem => {
  const notification = readRecord(value)
  const id = readString(notification._id)
  const recipient = readString(notification.recipient)

  if (!id || !recipient) {
    throw new ApiError(
      "Notification response is missing required data.",
      500,
      "INVALID_NOTIFICATION_RESPONSE",
    )
  }

  return {
    _id: id,
    recipient,
    actor: readNullableString(notification.actor),
    type: readString(notification.type, "SYSTEM") as
      | NotificationType
      | (string & {}),
    title: readString(notification.title),
    message: readString(notification.message),
    entityType: readString(
      notification.entityType,
      "SYSTEM",
    ) as NotificationEntityType,
    entityId: readNullableString(notification.entityId),
    link: readNullableString(notification.link),
    metadata: parseMetadata(notification.metadata),
    isRead: readBoolean(notification.isRead),
    readAt: readNullableString(notification.readAt),
    expiresAt: readString(notification.expiresAt),
    createdAt: readString(notification.createdAt),
    updatedAt: readString(notification.updatedAt),
  }
}

const parseGetMyNotificationsResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): GetMyNotificationsResponse => {
  const body = readRecord(value)
  const data = Array.isArray(body.data)
    ? body.data.map(parseNotificationItem)
    : []

  return {
    success: true,
    data,
    pagination: parsePagination(body.pagination, fallback),
    unreadCount: readNumber(body.unreadCount, 0),
  }
}

export async function getMyNotifications({
  isRead,
  page = 1,
  limit = 20,
  signal,
}: GetMyNotificationsInput = {}) {
  const normalizedPage = normalizePositiveInteger(page, 1)
  const normalizedLimit = normalizePositiveInteger(limit, 20)
  const searchParams = new URLSearchParams({
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  })

  if (isRead !== undefined && isRead !== null) {
    searchParams.set("isRead", String(isRead))
  }

  const response = await apiClient.get<GetMyNotificationsResponse>(
    `/notifications/me?${searchParams.toString()}`,
    { signal },
  )

  return parseGetMyNotificationsResponse(response.data, {
    page: normalizedPage,
    limit: normalizedLimit,
  })
}
