import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { NotificationItem } from "../types"

import {
  markNotificationsReadInCache,
  type NotificationsInfiniteData,
} from "./notificationCache"

const REFERENCE_TIME = new Date("2026-07-22T12:00:00.000Z")
const EXISTING_READ_AT = "2026-07-22T01:00:00.000Z"

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

describe("markNotificationsReadInCache", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(REFERENCE_TIME)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("when current data is missing or empty", () => {
    it("returns undefined when current data is undefined", () => {
      expect(markNotificationsReadInCache(undefined)).toBeUndefined()
    })

    it("returns an empty page with zero unread count when no notifications are cached", () => {
      const current = singlePageData([], { unreadCount: 0, total: 0 })

      const next = markNotificationsReadInCache(current)

      expect(next?.pages[0].data).toEqual([])
      expect(next?.pages[0].unreadCount).toBe(0)
    })

    it("returns an empty pages array unchanged except for unread counts", () => {
      const current: NotificationsInfiniteData = {
        pageParams: [],
        pages: [],
      }

      const next = markNotificationsReadInCache(current)

      expect(next?.pageParams).toEqual([])
      expect(next?.pages).toEqual([])
    })
  })

  describe("when marking notifications read on a single page", () => {
    it("marks every unread notification read and clears unread count", () => {
      const next = markNotificationsReadInCache(
        singlePageData([
          notification("notification-1"),
          notification("notification-2"),
        ]),
      )

      expect(next?.pages[0].unreadCount).toBe(0)
      expect(next?.pages[0].data.every((item) => item.isRead)).toBe(true)
    })

    it("leaves already-read notifications read", () => {
      const next = markNotificationsReadInCache(
        singlePageData([
          notification("notification-1", {
            isRead: true,
            readAt: EXISTING_READ_AT,
          }),
        ]),
      )

      expect(next?.pages[0].data[0]).toMatchObject({
        isRead: true,
        readAt: EXISTING_READ_AT,
      })
      expect(next?.pages[0].unreadCount).toBe(0)
    })

    it("handles a mix of read and unread notifications", () => {
      const next = markNotificationsReadInCache(
        singlePageData([
          notification("notification-1"),
          notification("notification-2", {
            isRead: true,
            readAt: EXISTING_READ_AT,
          }),
        ]),
      )

      expect(next?.pages[0].data[0].isRead).toBe(true)
      expect(next?.pages[0].data[1]).toMatchObject({
        isRead: true,
        readAt: EXISTING_READ_AT,
      })
      expect(next?.pages[0].unreadCount).toBe(0)
    })

    it("clears a stale unread count even when every item is already read", () => {
      const current = singlePageData(
        [
          notification("notification-1", {
            isRead: true,
            readAt: EXISTING_READ_AT,
          }),
        ],
        { unreadCount: 3 },
      )

      const next = markNotificationsReadInCache(current)

      expect(next?.pages[0].unreadCount).toBe(0)
    })
  })

  describe("when assigning readAt timestamps", () => {
    it("assigns the same readAt timestamp to all newly read notifications", () => {
      const next = markNotificationsReadInCache(
        singlePageData([
          notification("notification-1"),
          notification("notification-2"),
        ]),
      )

      const expectedReadAt = REFERENCE_TIME.toISOString()

      expect(next?.pages[0].data[0].readAt).toBe(expectedReadAt)
      expect(next?.pages[0].data[1].readAt).toBe(expectedReadAt)
    })

    it("preserves an existing readAt when the notification was already read", () => {
      const next = markNotificationsReadInCache(
        singlePageData([
          notification("notification-1", {
            isRead: true,
            readAt: EXISTING_READ_AT,
          }),
        ]),
      )

      expect(next?.pages[0].data[0].readAt).toBe(EXISTING_READ_AT)
    })

    it("assigns readAt when isRead is true but readAt is missing", () => {
      const next = markNotificationsReadInCache(
        singlePageData([
          notification("notification-1", {
            isRead: true,
            readAt: null,
          }),
        ]),
      )

      expect(next?.pages[0].data[0].readAt).toBe(REFERENCE_TIME.toISOString())
    })
  })

  describe("when the cache spans multiple pages", () => {
    it("marks notifications read on every page", () => {
      const next = markNotificationsReadInCache(
        multiPageData(
          [notification("notification-1")],
          [notification("notification-2"), notification("notification-3")],
        ),
      )

      expect(next?.pages[0].data.every((item) => item.isRead)).toBe(true)
      expect(next?.pages[1].data.every((item) => item.isRead)).toBe(true)
    })

    it("clears unread count on every page", () => {
      const next = markNotificationsReadInCache(
        multiPageData(
          [notification("notification-1")],
          [notification("notification-2")],
          { firstPageUnreadCount: 1, secondPageUnreadCount: 1 },
        ),
      )

      expect(next?.pages[0].unreadCount).toBe(0)
      expect(next?.pages[1].unreadCount).toBe(0)
    })

    it("preserves pageParams and pagination metadata", () => {
      const current = multiPageData(
        [notification("notification-1")],
        [notification("notification-2")],
        { total: 10 },
      )

      const next = markNotificationsReadInCache(current)

      expect(next?.pageParams).toEqual([1, 2])
      expect(next?.pages[0].pagination).toEqual({
        page: 1,
        limit: 20,
        total: 10,
      })
      expect(next?.pages[1].pagination).toEqual({
        page: 2,
        limit: 20,
        total: 10,
      })
    })
  })

  describe("defensive handling and immutability", () => {
    it("preserves non-read notification fields", () => {
      const incoming = notification("notification-1", {
        title: "Important update",
        message: "Details here",
        metadata: { source: "socket" },
      })

      const next = markNotificationsReadInCache(singlePageData([incoming]))

      expect(next?.pages[0].data[0]).toMatchObject({
        _id: "notification-1",
        title: "Important update",
        message: "Details here",
        metadata: { source: "socket" },
        isRead: true,
      })
    })

    it("does not mutate the input cache object", () => {
      const current = singlePageData([notification("notification-1")])
      const originalUnread = current.pages[0].unreadCount
      const originalIsRead = current.pages[0].data[0].isRead

      markNotificationsReadInCache(current)

      expect(current.pages[0].unreadCount).toBe(originalUnread)
      expect(current.pages[0].data[0].isRead).toBe(originalIsRead)
      expect(current.pages[0].data[0].readAt).toBeNull()
    })

    it("returns a new object reference", () => {
      const current = singlePageData([notification("notification-1")])

      const next = markNotificationsReadInCache(current)

      expect(next).not.toBe(current)
      expect(next?.pages[0]).not.toBe(current.pages[0])
      expect(next?.pages[0].data[0]).not.toBe(current.pages[0].data[0])
    })

    it("preserves the page success flag and other page-level fields", () => {
      const current = singlePageData([notification("notification-1")])

      const next = markNotificationsReadInCache(current)

      expect(next?.pages[0].success).toBe(true)
    })
  })
})
