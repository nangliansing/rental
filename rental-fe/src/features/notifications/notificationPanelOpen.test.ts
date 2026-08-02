import { describe, expect, it } from "vitest"

import {
  getDisplayUnreadCount,
  resolveNotificationsPanelOpenTransition,
} from "./notificationPanelOpen"

describe("getDisplayUnreadCount", () => {
  describe("when the panel is closed", () => {
    it("returns zero when there are no unread notifications", () => {
      expect(getDisplayUnreadCount(false, 0)).toBe(0)
    })

    it("returns the cache unread count when notifications are unread", () => {
      expect(getDisplayUnreadCount(false, 3)).toBe(3)
    })

    it("normalizes negative cache values to zero", () => {
      expect(getDisplayUnreadCount(false, -2)).toBe(0)
    })

    it("floors fractional cache values", () => {
      expect(getDisplayUnreadCount(false, 2.9)).toBe(2)
    })

    it("treats non-finite cache values as zero", () => {
      expect(getDisplayUnreadCount(false, Number.NaN)).toBe(0)
      expect(getDisplayUnreadCount(false, Number.POSITIVE_INFINITY)).toBe(0)
    })
  })

  describe("when the panel is open", () => {
    it("always hides the badge even when the cache has unread notifications", () => {
      expect(getDisplayUnreadCount(true, 0)).toBe(0)
      expect(getDisplayUnreadCount(true, 1)).toBe(0)
      expect(getDisplayUnreadCount(true, 99)).toBe(0)
    })

    it("still hides the badge for invalid cache values", () => {
      expect(getDisplayUnreadCount(true, -5)).toBe(0)
      expect(getDisplayUnreadCount(true, Number.NaN)).toBe(0)
    })
  })
})

describe("resolveNotificationsPanelOpenTransition", () => {
  describe("when the panel stays closed", () => {
    it("does not mark notifications read", () => {
      expect(
        resolveNotificationsPanelOpenTransition({
          wasOpen: false,
          open: false,
          cacheUnreadCount: 4,
        }),
      ).toEqual({
        isPanelOpen: false,
        shouldMarkAllAsRead: false,
      })
    })
  })

  describe("when the panel opens", () => {
    it("never marks notifications read on open", () => {
      expect(
        resolveNotificationsPanelOpenTransition({
          wasOpen: false,
          open: true,
          cacheUnreadCount: 1,
        }),
      ).toEqual({
        isPanelOpen: true,
        shouldMarkAllAsRead: false,
      })
    })

    it("does not mark notifications read when opening with zero unread", () => {
      expect(
        resolveNotificationsPanelOpenTransition({
          wasOpen: false,
          open: true,
          cacheUnreadCount: 0,
        }),
      ).toEqual({
        isPanelOpen: true,
        shouldMarkAllAsRead: false,
      })
    })

    it("does not mark notifications read when open is set repeatedly", () => {
      expect(
        resolveNotificationsPanelOpenTransition({
          wasOpen: true,
          open: true,
          cacheUnreadCount: 3,
        }),
      ).toEqual({
        isPanelOpen: true,
        shouldMarkAllAsRead: false,
      })
    })
  })

  describe("when the panel closes", () => {
    it("marks notifications read when unread items exist", () => {
      expect(
        resolveNotificationsPanelOpenTransition({
          wasOpen: true,
          open: false,
          cacheUnreadCount: 2,
        }),
      ).toEqual({
        isPanelOpen: false,
        shouldMarkAllAsRead: true,
      })
    })

    it("does not mark notifications read when closing with zero unread", () => {
      expect(
        resolveNotificationsPanelOpenTransition({
          wasOpen: true,
          open: false,
          cacheUnreadCount: 0,
        }),
      ).toEqual({
        isPanelOpen: false,
        shouldMarkAllAsRead: false,
      })
    })

    it("does not mark notifications read when close is set repeatedly", () => {
      expect(
        resolveNotificationsPanelOpenTransition({
          wasOpen: false,
          open: false,
          cacheUnreadCount: 5,
        }),
      ).toEqual({
        isPanelOpen: false,
        shouldMarkAllAsRead: false,
      })
    })
  })

  describe("invalid or edge cache unread counts", () => {
    it("treats negative unread counts as zero unread on close", () => {
      expect(
        resolveNotificationsPanelOpenTransition({
          wasOpen: true,
          open: false,
          cacheUnreadCount: -1,
        }),
      ).toEqual({
        isPanelOpen: false,
        shouldMarkAllAsRead: false,
      })
    })

    it("treats non-finite unread counts as zero unread on close", () => {
      expect(
        resolveNotificationsPanelOpenTransition({
          wasOpen: true,
          open: false,
          cacheUnreadCount: Number.NaN,
        }),
      ).toEqual({
        isPanelOpen: false,
        shouldMarkAllAsRead: false,
      })
    })

    it("marks read on close when many unread notifications exist", () => {
      expect(
        resolveNotificationsPanelOpenTransition({
          wasOpen: true,
          open: false,
          cacheUnreadCount: 42,
        }),
      ).toEqual({
        isPanelOpen: false,
        shouldMarkAllAsRead: true,
      })
    })
  })
})
