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
    title: `Title ${id}`,
    message: `Message ${id}`,
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

function singlePageData(
  items: NotificationItem[],
  overrides: {
    unreadCount?: number
    total?: number
  } = {},
): NotificationsInfiniteData {
  return {
    pageParams: [1],
    pages: [
      {
        success: true,
        data: items,
        unreadCount:
          overrides.unreadCount ?? items.filter((item) => !item.isRead).length,
        pagination: {
          page: 1,
          limit: 20,
          total: overrides.total ?? items.length,
        },
      },
    ],
  }
}

function multiPageData(
  firstPageItems: NotificationItem[],
  secondPageItems: NotificationItem[],
  overrides: {
    firstPageUnreadCount?: number
    secondPageUnreadCount?: number
    total?: number
  } = {},
): NotificationsInfiniteData {
  const resolvedTotal =
    overrides.total ?? firstPageItems.length + secondPageItems.length

  return {
    pageParams: [1, 2],
    pages: [
      {
        success: true,
        data: firstPageItems,
        unreadCount:
          overrides.firstPageUnreadCount ??
          firstPageItems.filter((item) => !item.isRead).length,
        pagination: { page: 1, limit: 20, total: resolvedTotal },
      },
      {
        success: true,
        data: secondPageItems,
        unreadCount:
          overrides.secondPageUnreadCount ??
          secondPageItems.filter((item) => !item.isRead).length,
        pagination: { page: 2, limit: 20, total: resolvedTotal },
      },
    ],
  }
}

describe("rollbackNotificationsReadInCache", () => {
  describe("when current data or snapshot is missing", () => {
    it("returns the snapshot when current data is undefined", () => {
      const snapshot = singlePageData([notification("notification-1")])

      expect(rollbackNotificationsReadInCache(undefined, snapshot)).toBe(snapshot)
    })

    it("returns the current data when snapshot is undefined", () => {
      const current = singlePageData([notification("notification-1")])

      expect(rollbackNotificationsReadInCache(current, undefined)).toBe(current)
    })

    it("returns undefined when both arguments are undefined", () => {
      expect(rollbackNotificationsReadInCache(undefined, undefined)).toBeUndefined()
    })
  })

  describe("when rolling back a failed read-all mutation", () => {
    it("restores unread state for every notification that existed in the snapshot", () => {
      const snapshot = singlePageData([
        notification("notification-1"),
        notification("notification-2", {
          isRead: true,
          readAt: "2026-07-22T01:00:00.000Z",
        }),
      ])
      const current = markNotificationsReadInCache(snapshot)

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].data).toEqual([
        expect.objectContaining({
          _id: "notification-1",
          isRead: false,
          readAt: null,
        }),
        expect.objectContaining({
          _id: "notification-2",
          isRead: true,
          readAt: "2026-07-22T01:00:00.000Z",
        }),
      ])
      expect(rolledBack?.pages[0].unreadCount).toBe(1)
    })

    it("restores the snapshot unread count on page one when no socket events arrived", () => {
      const snapshot = singlePageData(
        [notification("notification-1"), notification("notification-2")],
        { unreadCount: 2 },
      )
      const current = markNotificationsReadInCache(snapshot)

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].unreadCount).toBe(2)
      expect(
        rolledBack?.pages[0].data.every((item) => !item.isRead),
      ).toBe(true)
    })

    it("preserves non-read fields from the current cache while restoring read state", () => {
      const snapshot = singlePageData([notification("notification-1")])
      const current = markNotificationsReadInCache(snapshot)
      current.pages[0].data[0] = {
        ...current.pages[0].data[0],
        title: "Updated while optimistic",
        message: "Live edit",
      }

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].data[0]).toMatchObject({
        _id: "notification-1",
        title: "Updated while optimistic",
        message: "Live edit",
        isRead: false,
        readAt: null,
      })
    })
  })

  describe("when concurrent socket events arrived during the mutation", () => {
    it("keeps a new unread notification and adds it to page-one unread count", () => {
      const snapshot = singlePageData([notification("notification-1")])
      let current = markNotificationsReadInCache(snapshot)
      current = mergeNotificationIntoCache(
        current,
        notification("notification-2"),
      )

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].data.map((item) => item._id)).toEqual([
        "notification-2",
        "notification-1",
      ])
      expect(rolledBack?.pages[0].unreadCount).toBe(2)
      expect(rolledBack?.pages[0].data.every((item) => !item.isRead)).toBe(true)
    })

    it("keeps a new read notification without incrementing unread count", () => {
      const snapshot = singlePageData([notification("notification-1")])
      let current = markNotificationsReadInCache(snapshot)
      current = mergeNotificationIntoCache(
        current,
        notification("notification-2", {
          isRead: true,
          readAt: "2026-07-22T02:00:00.000Z",
        }),
      )

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].unreadCount).toBe(1)
      expect(rolledBack?.pages[0].data[0]).toMatchObject({
        _id: "notification-2",
        isRead: true,
      })
      expect(rolledBack?.pages[0].data[1]).toMatchObject({
        _id: "notification-1",
        isRead: false,
      })
    })

    it("counts multiple new unread notifications that were not in the snapshot", () => {
      const snapshot = singlePageData([notification("notification-1")])
      let current = markNotificationsReadInCache(snapshot)
      current = mergeNotificationIntoCache(
        current,
        notification("notification-2"),
      )
      current = mergeNotificationIntoCache(
        current,
        notification("notification-3"),
      )

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].unreadCount).toBe(3)
      expect(rolledBack?.pages[0].data.map((item) => item._id)).toEqual([
        "notification-3",
        "notification-2",
        "notification-1",
      ])
    })

    it("does not count a new unread notification twice when it replaces a snapshot id", () => {
      const snapshot = singlePageData([notification("notification-1")])
      let current = markNotificationsReadInCache(snapshot)
      current = mergeNotificationIntoCache(
        current,
        notification("notification-1", {
          title: "Updated duplicate",
        }),
      )

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].unreadCount).toBe(1)
      expect(rolledBack?.pages[0].data[0].title).toBe("Updated duplicate")
      expect(rolledBack?.pages[0].data[0].isRead).toBe(false)
    })
  })

  describe("when the cache spans multiple pages", () => {
    it("restores unread counts on later pages from the snapshot only", () => {
      const snapshot = multiPageData(
        [notification("notification-1")],
        [notification("notification-2"), notification("notification-3")],
        { firstPageUnreadCount: 1, secondPageUnreadCount: 2 },
      )
      const current = markNotificationsReadInCache(snapshot)

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].unreadCount).toBe(1)
      expect(rolledBack?.pages[1].unreadCount).toBe(2)
    })

    it("adds new unread socket events only to page-one unread count", () => {
      const snapshot = multiPageData(
        [notification("notification-1")],
        [notification("notification-2")],
      )
      let current = markNotificationsReadInCache(snapshot)
      current = mergeNotificationIntoCache(
        current,
        notification("notification-3"),
      )

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].unreadCount).toBe(2)
      expect(rolledBack?.pages[1].unreadCount).toBe(1)
    })

    it("restores read state for notifications on later pages", () => {
      const snapshot = multiPageData(
        [notification("notification-1", {
          isRead: true,
          readAt: "2026-07-22T01:00:00.000Z",
        })],
        [notification("notification-2")],
      )
      const current = markNotificationsReadInCache(snapshot)

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[1].data[0]).toMatchObject({
        _id: "notification-2",
        isRead: false,
        readAt: null,
      })
    })

    it("preserves pageParams and pagination metadata from the current cache", () => {
      const snapshot = multiPageData(
        [notification("notification-1")],
        [notification("notification-2")],
        { total: 5 },
      )
      const current = markNotificationsReadInCache(snapshot)

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pageParams).toEqual([1, 2])
      expect(rolledBack?.pages[0].pagination.total).toBe(5)
      expect(rolledBack?.pages[1].pagination.total).toBe(5)
    })
  })

  describe("defensive handling of cache metadata", () => {
    it("treats a missing snapshot page unread count as zero", () => {
      const snapshot = singlePageData([notification("notification-1")])
      const current: NotificationsInfiniteData = {
        pageParams: [1, 2],
        pages: [
          ...snapshot.pages,
          {
            success: true,
            data: [notification("notification-2")],
            unreadCount: 0,
            pagination: { page: 2, limit: 20, total: 2 },
          },
        ],
      }
      const markedCurrent = markNotificationsReadInCache(current)

      const rolledBack = rollbackNotificationsReadInCache(
        markedCurrent,
        snapshot,
      )

      expect(rolledBack?.pages[1].unreadCount).toBe(0)
    })

    it("does not mutate the input current data or snapshot", () => {
      const snapshot = singlePageData([notification("notification-1")])
      const current = markNotificationsReadInCache(snapshot)
      const snapshotUnread = snapshot.pages[0].unreadCount
      const currentUnread = current.pages[0].unreadCount

      rollbackNotificationsReadInCache(current, snapshot)

      expect(snapshot.pages[0].unreadCount).toBe(snapshotUnread)
      expect(current.pages[0].unreadCount).toBe(currentUnread)
      expect(current.pages[0].data[0].isRead).toBe(true)
    })

    it("does not re-insert notifications that were removed from the current cache", () => {
      const snapshot = singlePageData([
        notification("notification-1"),
        notification("notification-2"),
      ])
      const current = singlePageData([
        notification("notification-1", {
          isRead: true,
          readAt: "2026-07-22T03:00:00.000Z",
        }),
      ])

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].data).toHaveLength(1)
      expect(rolledBack?.pages[0].data[0]._id).toBe("notification-1")
      expect(rolledBack?.pages[0].data[0].isRead).toBe(false)
      expect(rolledBack?.pages[0].unreadCount).toBe(2)
    })

    it("leaves notifications that only exist in the current cache untouched", () => {
      const snapshot = singlePageData([notification("notification-1")])
      const current = singlePageData([
        notification("notification-1", {
          isRead: true,
          readAt: "2026-07-22T03:00:00.000Z",
        }),
        notification("notification-2"),
      ])

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].data[1]).toMatchObject({
        _id: "notification-2",
        isRead: false,
        readAt: null,
      })
      expect(rolledBack?.pages[0].unreadCount).toBe(2)
    })
  })

  describe("read-at restoration edge cases", () => {
    it("preserves an existing readAt when the notification was already read in the snapshot", () => {
      const snapshot = singlePageData([
        notification("notification-1", {
          isRead: true,
          readAt: "2026-07-22T01:00:00.000Z",
        }),
      ])
      const current = markNotificationsReadInCache(snapshot)

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].data[0].readAt).toBe(
        "2026-07-22T01:00:00.000Z",
      )
      expect(rolledBack?.pages[0].data[0].isRead).toBe(true)
    })

    it("replaces an optimistic readAt with null when the snapshot item was unread", () => {
      const snapshot = singlePageData([notification("notification-1")])
      const current = markNotificationsReadInCache(snapshot)

      expect(current?.pages[0].data[0].readAt).not.toBeNull()

      const rolledBack = rollbackNotificationsReadInCache(current, snapshot)

      expect(rolledBack?.pages[0].data[0].readAt).toBeNull()
      expect(rolledBack?.pages[0].data[0].isRead).toBe(false)
    })
  })
})
