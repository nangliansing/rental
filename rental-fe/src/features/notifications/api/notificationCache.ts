import type { InfiniteData } from "@tanstack/react-query"

import type { NotificationItem } from "../types"
import type { GetMyNotificationsResponse } from "./getMyNotifications"

export type NotificationsInfiniteData = InfiniteData<
  GetMyNotificationsResponse,
  number
>

const notificationPageSize = 20

function isNotificationVisible(notification: NotificationItem) {
  const expiresAt = Date.parse(notification.expiresAt)
  return Number.isFinite(expiresAt) && expiresAt > Date.now()
}

export function isVisibleNotification(notification: NotificationItem) {
  return isNotificationVisible(notification)
}

export function mergeNotificationIntoCache(
  currentData: NotificationsInfiniteData | undefined,
  incoming: NotificationItem,
): NotificationsInfiniteData {
  if (!isNotificationVisible(incoming)) {
    return currentData ?? {
      pageParams: [1],
      pages: [{
        success: true,
        data: [],
        unreadCount: 0,
        pagination: { page: 1, limit: notificationPageSize, total: 0 },
      }],
    }
  }

  if (!currentData) {
    return {
      pageParams: [1],
      pages: [{
        success: true,
        data: [incoming],
        unreadCount: incoming.isRead ? 0 : 1,
        pagination: { page: 1, limit: notificationPageSize, total: 1 },
      }],
    }
  }

  const alreadyExists = currentData.pages.some((page) =>
    page.data.some((notification) => notification._id === incoming._id),
  )
  const nextTotal = Math.max(
    alreadyExists
      ? currentData.pages[0]?.pagination.total ?? 0
      : (currentData.pages[0]?.pagination.total ?? 0) + 1,
    1,
  )

  return {
    ...currentData,
    pages: currentData.pages.map((page, pageIndex) => {
      const withoutIncoming = page.data.filter(
        (notification) => notification._id !== incoming._id,
      )
      return {
        ...page,
        data: pageIndex === 0 ? [incoming, ...withoutIncoming] : withoutIncoming,
        unreadCount: pageIndex === 0
          ? Math.max(
              (page.unreadCount ?? 0) +
                (alreadyExists || incoming.isRead ? 0 : 1),
              0,
            )
          : page.unreadCount,
        pagination: { ...page.pagination, total: nextTotal },
      }
    }),
  }
}

export function markNotificationsReadInCache(
  currentData: NotificationsInfiniteData | undefined,
): NotificationsInfiniteData | undefined {
  if (!currentData) return currentData
  const readAt = new Date().toISOString()

  return {
    ...currentData,
    pages: currentData.pages.map((page) => ({
      ...page,
      unreadCount: 0,
      data: page.data.map((notification) => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt ?? readAt,
      })),
    })),
  }
}

export function rollbackNotificationsReadInCache(
  currentData: NotificationsInfiniteData | undefined,
  snapshot: NotificationsInfiniteData | undefined,
) {
  if (!currentData || !snapshot) return snapshot ?? currentData

  const previous = new Map(
    snapshot.pages.flatMap((page) =>
      page.data.map((notification) => [notification._id, notification] as const),
    ),
  )
  const newUnreadCount = currentData.pages
    .flatMap((page) => page.data)
    .filter((notification) =>
      !previous.has(notification._id) && !notification.isRead,
    ).length

  return {
    ...currentData,
    pages: currentData.pages.map((page, pageIndex) => ({
      ...page,
      unreadCount:
        (snapshot.pages[pageIndex]?.unreadCount ?? 0) +
        (pageIndex === 0 ? newUnreadCount : 0),
      data: page.data.map((notification) => {
        const previousNotification = previous.get(notification._id)
        return previousNotification
          ? {
              ...notification,
              isRead: previousNotification.isRead,
              readAt: previousNotification.readAt,
            }
          : notification
      }),
    })),
  }
}
