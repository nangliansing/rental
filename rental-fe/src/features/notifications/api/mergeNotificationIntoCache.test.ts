import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { NotificationItem } from "../types"

import {
  mergeNotificationIntoCache,
  type NotificationsInfiniteData,
} from "./notificationCache"

const REFERENCE_TIME = new Date("2026-07-22T12:00:00.000Z")

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
  total?: number,
): NotificationsInfiniteData {
  const resolvedTotal = total ?? firstPageItems.length + secondPageItems.length

  return {
    pageParams: [1, 2],
    pages: [
      {
        success: true,
        data: firstPageItems,
        unreadCount: firstPageItems.filter((item) => !item.isRead).length,
        pagination: { page: 1, limit: 20, total: resolvedTotal },
      },
      {
        success: true,
        data: secondPageItems,
        unreadCount: secondPageItems.filter((item) => !item.isRead).length,
        pagination: { page: 2, limit: 20, total: resolvedTotal },
      },
    ],
  }
}

function emptyDefaultCache(): NotificationsInfiniteData {
  return {
    pageParams: [1],
    pages: [
      {
        success: true,
        data: [],
        unreadCount: 0,
        pagination: { page: 1, limit: 20, total: 0 },
      },
    ],
  }
}

describe("mergeNotificationIntoCache", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(REFERENCE_TIME)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("when the incoming notification is not visible", () => {
    it("returns the default empty cache when current data is undefined", () => {
      const next = mergeNotificationIntoCache(
        undefined,
        notification("expired-notification", {
          expiresAt: "2020-01-01T00:00:00.000Z",
        }),
      )

      expect(next).toEqual(emptyDefaultCache())
    })

    it("returns the existing cache unchanged when data is already loaded", () => {
      const current = singlePageData([notification("notification-1")])

      const next = mergeNotificationIntoCache(
        current,
        notification("expired-notification", {
          expiresAt: "2020-01-01T00:00:00.000Z",
        }),
      )

      expect(next).toBe(current)
      expect(next.pages[0].data).toHaveLength(1)
      expect(next.pages[0].unreadCount).toBe(1)
    })

    it("treats an expiry exactly at the current time as not visible", () => {
      const current = singlePageData([notification("notification-1")])

      const next = mergeNotificationIntoCache(
        current,
        notification("boundary-notification", {
          expiresAt: REFERENCE_TIME.toISOString(),
        }),
      )

      expect(next).toBe(current)
    })

    it("treats an invalid expiresAt value as not visible", () => {
      const current = singlePageData([notification("notification-1")])

      const next = mergeNotificationIntoCache(
        current,
        notification("invalid-expiry", {
          expiresAt: "not-a-date",
        }),
      )

      expect(next).toBe(current)
    })
  })

  describe("when the cache is empty (undefined current data)", () => {
    it("creates the first page with unread count 1 for a new unread notification", () => {
      const incoming = notification("notification-1")

      const next = mergeNotificationIntoCache(undefined, incoming)

      expect(next.pageParams).toEqual([1])
      expect(next.pages[0].data).toEqual([incoming])
      expect(next.pages[0].unreadCount).toBe(1)
      expect(next.pages[0].pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
      })
    })

    it("creates the first page with unread count 0 for a new read notification", () => {
      const incoming = notification("notification-1", {
        isRead: true,
        readAt: "2026-07-22T01:00:00.000Z",
      })

      const next = mergeNotificationIntoCache(undefined, incoming)

      expect(next.pages[0].data).toEqual([incoming])
      expect(next.pages[0].unreadCount).toBe(0)
      expect(next.pages[0].pagination.total).toBe(1)
    })
  })

  describe("when merging a new notification into an existing cache", () => {
    it("prepends the notification to the first page and increments unread count", () => {
      const next = mergeNotificationIntoCache(
        singlePageData([notification("notification-1")]),
        notification("notification-2"),
      )

      expect(next.pages[0].data.map((item) => item._id)).toEqual([
        "notification-2",
        "notification-1",
      ])
      expect(next.pages[0].unreadCount).toBe(2)
      expect(next.pages[0].pagination.total).toBe(2)
    })

    it("prepends a read notification without incrementing unread count", () => {
      const next = mergeNotificationIntoCache(
        singlePageData([notification("notification-1")]),
        notification("notification-2", {
          isRead: true,
          readAt: "2026-07-22T01:00:00.000Z",
        }),
      )

      expect(next.pages[0].data[0]._id).toBe("notification-2")
      expect(next.pages[0].unreadCount).toBe(1)
      expect(next.pages[0].pagination.total).toBe(2)
    })

    it("keeps unread count at zero when all cached notifications are already read", () => {
      const next = mergeNotificationIntoCache(
        singlePageData([
          notification("notification-1", {
            isRead: true,
            readAt: "2026-07-22T01:00:00.000Z",
          }),
        ]),
        notification("notification-2", {
          isRead: true,
          readAt: "2026-07-22T02:00:00.000Z",
        }),
      )

      expect(next.pages[0].unreadCount).toBe(0)
    })
  })

  describe("when merging a duplicate notification id", () => {
    it("updates the item in place at the front without incrementing unread count", () => {
      const next = mergeNotificationIntoCache(
        singlePageData([notification("notification-1")]),
        notification("notification-1", {
          title: "Updated title",
          message: "Updated message",
        }),
      )

      expect(next.pages[0].data).toHaveLength(1)
      expect(next.pages[0].data[0]).toMatchObject({
        _id: "notification-1",
        title: "Updated title",
        message: "Updated message",
      })
      expect(next.pages[0].unreadCount).toBe(1)
      expect(next.pages[0].pagination.total).toBe(1)
    })

    it("does not increment unread count when the duplicate is already read", () => {
      const next = mergeNotificationIntoCache(
        singlePageData([notification("notification-1")]),
        notification("notification-1", {
          isRead: true,
          readAt: "2026-07-22T01:00:00.000Z",
          title: "Already read update",
        }),
      )

      expect(next.pages[0].unreadCount).toBe(1)
      expect(next.pages[0].data[0].title).toBe("Already read update")
    })

    it("does not decrement unread count when re-merging the same unread id", () => {
      const next = mergeNotificationIntoCache(
        singlePageData([notification("notification-1")], { unreadCount: 1 }),
        notification("notification-1", {
          message: "Duplicate socket delivery",
        }),
      )

      expect(next.pages[0].unreadCount).toBe(1)
    })
  })

  describe("when the cache spans multiple pages", () => {
    it("prepends only on the first page and leaves later pages unchanged except dedupe", () => {
      const current = multiPageData(
        [notification("notification-1")],
        [notification("notification-2")],
      )

      const next = mergeNotificationIntoCache(
        current,
        notification("notification-3"),
      )

      expect(next.pages[0].data.map((item) => item._id)).toEqual([
        "notification-3",
        "notification-1",
      ])
      expect(next.pages[1].data.map((item) => item._id)).toEqual([
        "notification-2",
      ])
      expect(next.pages[0].unreadCount).toBe(2)
      expect(next.pages[1].unreadCount).toBe(1)
    })

    it("removes a duplicate id from later pages when the update arrives on page one", () => {
      const current = multiPageData(
        [notification("notification-1")],
        [notification("notification-2")],
      )

      const next = mergeNotificationIntoCache(
        current,
        notification("notification-2", {
          title: "Moved to page one",
        }),
      )

      expect(next.pages[0].data.map((item) => item._id)).toEqual([
        "notification-2",
        "notification-1",
      ])
      expect(next.pages[1].data).toHaveLength(0)
      expect(next.pages[0].pagination.total).toBe(2)
    })

    it("updates pagination total on every page consistently", () => {
      const current = multiPageData(
        [notification("notification-1")],
        [notification("notification-2")],
      )

      const next = mergeNotificationIntoCache(
        current,
        notification("notification-3"),
      )

      expect(next.pages[0].pagination.total).toBe(3)
      expect(next.pages[1].pagination.total).toBe(3)
    })

    it("preserves pageParams across the merge", () => {
      const current = multiPageData(
        [notification("notification-1")],
        [notification("notification-2")],
      )

      const next = mergeNotificationIntoCache(
        current,
        notification("notification-3"),
      )

      expect(next.pageParams).toEqual([1, 2])
    })
  })

  describe("defensive handling of cache metadata", () => {
    it("treats a missing unreadCount on page one as zero before incrementing", () => {
      const current = singlePageData([notification("notification-1")])
      current.pages[0].unreadCount = undefined as unknown as number

      const next = mergeNotificationIntoCache(
        current,
        notification("notification-2"),
      )

      expect(next.pages[0].unreadCount).toBe(1)
    })

    it("never produces a negative unread count on page one", () => {
      const current = singlePageData([], { unreadCount: 0, total: 0 })

      const next = mergeNotificationIntoCache(
        current,
        notification("notification-1", {
          isRead: true,
          readAt: "2026-07-22T01:00:00.000Z",
        }),
      )

      expect(next.pages[0].unreadCount).toBeGreaterThanOrEqual(0)
    })

    it("keeps pagination total at least 1 when a visible notification is merged", () => {
      const current = singlePageData([], { unreadCount: 0, total: 0 })

      const next = mergeNotificationIntoCache(
        current,
        notification("notification-1"),
      )

      expect(next.pages[0].pagination.total).toBeGreaterThanOrEqual(1)
    })

    it("does not mutate the input cache object", () => {
      const current = singlePageData([notification("notification-1")])
      const originalIds = current.pages[0].data.map((item) => item._id)
      const originalUnread = current.pages[0].unreadCount

      mergeNotificationIntoCache(current, notification("notification-2"))

      expect(current.pages[0].data.map((item) => item._id)).toEqual(originalIds)
      expect(current.pages[0].unreadCount).toBe(originalUnread)
    })
  })

  describe("visibility boundary with a controlled clock", () => {
    it("merges a notification that expires one millisecond after now", () => {
      const incoming = notification("just-valid", {
        expiresAt: new Date(REFERENCE_TIME.getTime() + 1).toISOString(),
      })

      const next = mergeNotificationIntoCache(undefined, incoming)

      expect(next.pages[0].data).toHaveLength(1)
      expect(next.pages[0].data[0]._id).toBe("just-valid")
    })

    it("ignores a notification that expired one millisecond before now", () => {
      const current = singlePageData([notification("notification-1")])

      const next = mergeNotificationIntoCache(
        current,
        notification("just-expired", {
          expiresAt: new Date(REFERENCE_TIME.getTime() - 1).toISOString(),
        }),
      )

      expect(next).toBe(current)
    })
  })
})
