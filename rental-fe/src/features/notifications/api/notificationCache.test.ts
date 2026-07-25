import { describe, expect, it } from "vitest"

import type { NotificationItem } from "../types"

import {
  markNotificationsReadInCache,
  mergeNotificationIntoCache,
  rollbackNotificationsReadInCache,
  type NotificationsInfiniteData,
} from "./notificationCache"

function notification(
  id: string,
  overrides: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    _id: id,
    recipient: "user-1",
    actor: null,
    type: "SYSTEM",
    title: "Update",
    message: "Message",
    entityType: "SYSTEM",
    entityId: null,
    link: null,
    metadata: {},
    isRead: false,
    readAt: null,
    expiresAt: "2099-01-01T00:00:00.000Z",
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
    ...overrides,
  }
}

function data(items: NotificationItem[]): NotificationsInfiniteData {
  return {
    pageParams: [1],
    pages: [{
      success: true,
      data: items,
      unreadCount: items.filter((item) => !item.isRead).length,
      pagination: { page: 1, limit: 20, total: items.length },
    }],
  }
}

describe("notificationCache", () => {
  it("prepends a new unread notification and increments unread count", () => {
    const next = mergeNotificationIntoCache(
      data([notification("notification-1")]),
      notification("notification-2"),
    )

    expect(next.pages[0].data.map((item) => item._id)).toEqual([
      "notification-2",
      "notification-1",
    ])
    expect(next.pages[0].unreadCount).toBe(2)
  })

  it("ignores expired socket events", () => {
    const next = mergeNotificationIntoCache(
      data([notification("notification-1")]),
      notification("notification-expired", {
        expiresAt: "2020-01-01T00:00:00.000Z",
      }),
    )

    expect(next.pages[0].data).toHaveLength(1)
    expect(next.pages[0].unreadCount).toBe(1)
  })

  it("marks all cached notifications read", () => {
    const next = markNotificationsReadInCache(
      data([notification("notification-1"), notification("notification-2")]),
    )

    expect(next?.pages[0].unreadCount).toBe(0)
    expect(next?.pages[0].data.every((item) => item.isRead)).toBe(true)
  })

  it("rolls back read state without dropping concurrent socket events", () => {
    const snapshot = data([notification("notification-1")])
    let current = markNotificationsReadInCache(snapshot)
    current = mergeNotificationIntoCache(current, notification("notification-2"))

    const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

    expect(rolledBack?.pages[0].unreadCount).toBe(2)
    expect(rolledBack?.pages[0].data.map((item) => item._id)).toEqual([
      "notification-2",
      "notification-1",
    ])
    expect(rolledBack?.pages[0].data.every((item) => !item.isRead)).toBe(true)
  })
})
