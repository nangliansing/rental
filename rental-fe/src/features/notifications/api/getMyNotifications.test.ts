import { describe, expect, it } from "vitest"

import { parseNotificationItem } from "./getMyNotifications"

describe("parseNotificationItem", () => {
  it("parses a complete notification payload", () => {
    const notification = parseNotificationItem({
      _id: "notification-1",
      recipient: "user-1",
      actor: "admin-1",
      type: "SAVED_LISTING_PRICE_CHANGED",
      title: "Saved listing price changed",
      message: "Bangkapi Residence is now ฿13k/month.",
      entityType: "SAVED_LISTING",
      entityId: "saved-1",
      link: "/profile?tab=saved",
      metadata: { listingLabel: "Bangkapi Residence" },
      isRead: false,
      readAt: null,
      expiresAt: "2099-01-01T00:00:00.000Z",
      createdAt: "2026-07-25T08:00:00.000Z",
      updatedAt: "2026-07-25T08:00:00.000Z",
    })

    expect(notification._id).toBe("notification-1")
    expect(notification.type).toBe("SAVED_LISTING_PRICE_CHANGED")
    expect(notification.link).toBe("/profile?tab=saved")
    expect(notification.metadata.listingLabel).toBe("Bangkapi Residence")
  })

  it("defaults unknown fields to safe fallbacks", () => {
    const notification = parseNotificationItem({
      _id: "notification-2",
      recipient: "user-1",
    })

    expect(notification.type).toBe("SYSTEM")
    expect(notification.entityType).toBe("SYSTEM")
    expect(notification.isRead).toBe(false)
    expect(notification.metadata).toEqual({})
  })
})
