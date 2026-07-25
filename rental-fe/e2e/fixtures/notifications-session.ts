import type { Page } from "@playwright/test"

import {
  installAuthenticatedSessionMocks,
  smokeAuthUser,
} from "./authenticated-session"

function jsonRoute(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  }
}

export const smokeUnreadNotification = {
  _id: "notification-smoke-1",
  recipient: smokeAuthUser._id,
  actor: null,
  type: "SAVED_LISTING_PRICE_CHANGED",
  title: "Saved listing price changed",
  message: "Bangkapi Residence is now ฿13k/month.",
  entityType: "SAVED_LISTING",
  entityId: "saved-smoke-1",
  link: "/profile?tab=saved",
  metadata: {
    listingLabel: "Bangkapi Residence",
  },
  isRead: false,
  readAt: null,
  expiresAt: "2099-01-01T00:00:00.000Z",
  createdAt: "2026-07-25T08:00:00.000Z",
  updatedAt: "2026-07-25T08:00:00.000Z",
}

export type NotificationsSessionMockOptions = {
  withUnreadNotification?: boolean
}

export async function installNotificationsSessionMocks(
  page: Page,
  options: NotificationsSessionMockOptions = {},
) {
  await installAuthenticatedSessionMocks(page)

  let notifications = options.withUnreadNotification
    ? [{ ...smokeUnreadNotification }]
    : []
  let unreadCount = notifications.filter((notification) => !notification.isRead).length

  await page.route("**/api/v1/notifications/me?**", async (route) => {
    const url = new URL(route.request().url())
    const pageNumber = Number(url.searchParams.get("page") ?? "1")
    const limit = Number(url.searchParams.get("limit") ?? "20")

    await route.fulfill(
      jsonRoute({
        success: true,
        data: notifications,
        unreadCount,
        pagination: {
          page: pageNumber,
          limit,
          total: notifications.length,
        },
      }),
    )
  })

  await page.route("**/api/v1/notifications/me/read-all", async (route) => {
    notifications = notifications.map((notification) => ({
      ...notification,
      isRead: true,
      readAt: notification.readAt ?? "2026-07-25T09:00:00.000Z",
    }))
    unreadCount = 0

    await route.fulfill(
      jsonRoute({
        success: true,
        data: {
          matchedCount: 1,
          modifiedCount: 1,
        },
      }),
    )
  })
}
