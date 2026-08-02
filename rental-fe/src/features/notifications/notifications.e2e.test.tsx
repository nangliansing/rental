import { screen, waitFor } from "@testing-library/react"
import type { UserEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { setAccessToken } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/renderWithProviders"

import type { NotificationsInfiniteData } from "./api/notificationCache"
import { NotificationProvider } from "./NotificationProvider"
import type { NotificationItem } from "./types"
import { NotificationBellButton } from "./components/NotificationBellButton"

const mocks = vi.hoisted(() => ({
  getMyNotifications: vi.fn(),
  markMyNotificationsRead: vi.fn(),
  socketHandlers: new Map<string, (...args: unknown[]) => void>(),
}))

vi.mock("./api/getMyNotifications", async () => {
  const actual = await vi.importActual<typeof import("./api/getMyNotifications")>(
    "./api/getMyNotifications",
  )

  return {
    ...actual,
    getMyNotifications: mocks.getMyNotifications,
  }
})

vi.mock("./api/markMyNotificationsRead", () => ({
  markMyNotificationsRead: mocks.markMyNotificationsRead,
}))

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { _id: "user-1", status: "ACTIVE" },
    isAuthenticated: true,
    isLoading: false,
  }),
}))

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>(
    "@/lib/api-client",
  )

  return {
    ...actual,
    getAccessToken: () => "test-token",
  }
})

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      mocks.socketHandlers.set(event, handler)
    }),
    off: vi.fn(),
    disconnect: vi.fn(),
  })),
}))

vi.mock("@/lib/public-env", () => ({
  getSocketUrl: () => "ws://localhost:3001",
}))

function notification(
  id: string,
  overrides: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    _id: id,
    recipient: "user-1",
    actor: null,
    type: "SAVED_LISTING_PRICE_CHANGED",
    title: `Update ${id}`,
    message: `Message for ${id}`,
    entityType: "SAVED_LISTING",
    entityId: "saved-1",
    link: "/profile?tab=saved",
    metadata: {},
    isRead: false,
    readAt: null,
    expiresAt: "2099-01-01T00:00:00.000Z",
    createdAt: "2026-07-25T08:00:00.000Z",
    updatedAt: "2026-07-25T08:00:00.000Z",
    ...overrides,
  }
}

type NotificationStore = {
  notifications: NotificationItem[]
  unreadCount: number
}

function createNotificationStore(items: NotificationItem[]): NotificationStore {
  return {
    notifications: [...items],
    unreadCount: items.filter((item) => !item.isRead).length,
  }
}

function buildPage(store: NotificationStore) {
  return {
    success: true as const,
    data: store.notifications,
    unreadCount: store.unreadCount,
    pagination: {
      page: 1,
      limit: 20,
      total: store.notifications.length,
    },
  }
}

function seedNotificationApi(store: NotificationStore) {
  mocks.getMyNotifications.mockImplementation(async () => buildPage(store))

  mocks.markMyNotificationsRead.mockImplementation(async () => {
    store.notifications = store.notifications.map((item) => ({
      ...item,
      isRead: true,
      readAt: item.readAt ?? "2026-07-25T09:00:00.000Z",
    }))
    store.unreadCount = 0

    return {
      success: true,
      data: {
        matchedCount: store.notifications.length,
        modifiedCount: store.notifications.length,
      },
    }
  })
}

function renderNotificationFlow(
  items: NotificationItem[],
  options: {
    markReadImpl?: typeof mocks.markMyNotificationsRead
  } = {},
) {
  const store = createNotificationStore(items)
  seedNotificationApi(store)

  if (options.markReadImpl) {
    mocks.markMyNotificationsRead.mockImplementation(options.markReadImpl)
  }

  const queryClient = createTestQueryClient()
  queryClient.setQueryDefaults(queryKeys.notifications.me, {
    staleTime: Infinity,
    gcTime: Infinity,
  })
  queryClient.setQueryData<NotificationsInfiniteData>(queryKeys.notifications.me, {
    pageParams: [1],
    pages: [buildPage(store)],
  })

  const view = renderWithProviders(
    <NotificationProvider>
      <NotificationBellButton variant="desktop" />
    </NotificationProvider>,
    { queryClient },
  )

  return { ...view, store, queryClient }
}

function emitSocketNotification(payload: NotificationItem) {
  const handler = mocks.socketHandlers.get("notification:new")
  if (!handler) {
    throw new Error("Socket notification handler was not registered.")
  }

  handler(payload)
}

async function waitForBellLabel(label: string | RegExp) {
  await waitFor(() =>
    expect(
      screen.getByRole("button", {
        name: typeof label === "string" ? label : label,
      }),
    ).toBeInTheDocument(),
  )
}

async function openNotificationsPanel(user: UserEvent) {
  const bell = screen.getByRole("button", {
    name: /notifications/i,
  })
  await user.click(bell)
  await screen.findByRole("heading", { name: "Notifications" })
}

async function closeNotificationsPanel(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "Close notifications" }))
  await waitFor(() =>
    expect(
      screen.queryByRole("heading", { name: "Notifications" }),
    ).not.toBeInTheDocument(),
  )
}

describe("notifications end-to-end flow", () => {
  beforeEach(() => {
    setAccessToken("test-token")
    mocks.getMyNotifications.mockReset()
    mocks.markMyNotificationsRead.mockReset()
    mocks.socketHandlers.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe("badge and panel open/close", () => {
    it("shows the unread badge when notifications are waiting and the panel is closed", async () => {
      renderNotificationFlow([notification("notification-1")])

      await waitForBellLabel("1 unread notifications")
    })

    it("hides the badge while the panel is open without calling read-all", async () => {
      const { user } = renderNotificationFlow([notification("notification-1")])

      await waitForBellLabel("1 unread notifications")
      await openNotificationsPanel(user)

      await waitForBellLabel(/^Notifications$/)
      expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()
    })

    it("displays notification content inside the open panel", async () => {
      const { user } = renderNotificationFlow([
        notification("notification-1", {
          title: "Price drop",
          message: "Bangkapi Residence is now ฿13k/month.",
        }),
      ])

      await openNotificationsPanel(user)

      expect(screen.getByText("Price drop")).toBeVisible()
      expect(
        screen.getByText("Bangkapi Residence is now ฿13k/month."),
      ).toBeVisible()
    })

    it("calls read-all once when closing a panel that had unread notifications", async () => {
      const { user } = renderNotificationFlow([notification("notification-1")])

      await openNotificationsPanel(user)
      await closeNotificationsPanel(user)

      await waitFor(() =>
        expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
      )
    })

    it("clears the badge after a successful read-all on close", async () => {
      const { user } = renderNotificationFlow([notification("notification-1")])

      await openNotificationsPanel(user)
      await closeNotificationsPanel(user)

      await waitForBellLabel(/^Notifications$/)
    })

    it("does not call read-all when closing a panel that had zero unread notifications", async () => {
      const { user } = renderNotificationFlow([
        notification("notification-1", {
          isRead: true,
          readAt: "2026-07-25T09:00:00.000Z",
        }),
      ])

      await openNotificationsPanel(user)
      await closeNotificationsPanel(user)

      expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()
    })

    it("does not call read-all when opening the panel", async () => {
      const { user } = renderNotificationFlow([notification("notification-1")])

      await openNotificationsPanel(user)

      expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()
    })

    it("closes the panel from the bell toggle without calling read-all until dismissed", async () => {
      const { user } = renderNotificationFlow([notification("notification-1")])

      await waitForBellLabel("1 unread notifications")
      await openNotificationsPanel(user)

      await user.click(screen.getByRole("button", { name: /^Notifications$/ }))

      await waitFor(() =>
        expect(
          screen.queryByRole("heading", { name: "Notifications" }),
        ).not.toBeInTheDocument(),
      )

      await waitFor(() =>
        expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
      )
    })

    it("shows the empty state when there are no notifications", async () => {
      const { user } = renderNotificationFlow([])

      await openNotificationsPanel(user)

      expect(screen.getByText("No notifications yet")).toBeVisible()
      expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()

      await closeNotificationsPanel(user)

      expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()
    })
  })

  describe("live socket notifications", () => {
    it("increments the badge when a live notification arrives while the panel is closed", async () => {
      renderNotificationFlow([
        notification("notification-1", {
          isRead: true,
          readAt: "2026-07-25T09:00:00.000Z",
        }),
      ])

      await waitForBellLabel(/^Notifications$/)

      emitSocketNotification(notification("notification-2"))

      await waitForBellLabel("1 unread notifications")
    })

    it("shows a live notification in the panel without calling read-all until close", async () => {
      const { user } = renderNotificationFlow([
        notification("notification-1", {
          isRead: true,
          readAt: "2026-07-25T09:00:00.000Z",
        }),
      ])

      await openNotificationsPanel(user)
      emitSocketNotification(
        notification("notification-2", {
          title: "Live update",
          message: "A new listing is available.",
        }),
      )

      await waitFor(() =>
        expect(screen.getByText("Live update")).toBeVisible(),
      )
      expect(screen.getByText("A new listing is available.")).toBeVisible()
      expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()

      await closeNotificationsPanel(user)

      await waitFor(() =>
        expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
      )
    })

    it("keeps the badge hidden while live notifications arrive with the panel open", async () => {
      const { user } = renderNotificationFlow([
        notification("notification-1", {
          isRead: true,
          readAt: "2026-07-25T09:00:00.000Z",
        }),
      ])

      await openNotificationsPanel(user)
      emitSocketNotification(notification("notification-2"))
      emitSocketNotification(notification("notification-3"))

      await waitForBellLabel(/^Notifications$/)
      expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()
    })

    it("ignores expired socket notifications", async () => {
      renderNotificationFlow([
        notification("notification-1", {
          isRead: true,
          readAt: "2026-07-25T09:00:00.000Z",
        }),
      ])

      await waitForBellLabel(/^Notifications$/)

      emitSocketNotification(
        notification("expired-notification", {
          expiresAt: "2020-01-01T00:00:00.000Z",
        }),
      )

      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Notifications", exact: true }),
        ).toBeInTheDocument(),
      )
    })
  })

  describe("read-all failures and recovery", () => {
    it("does not loop read-all requests when the API returns 429 on close", async () => {
      const { user } = renderNotificationFlow([notification("notification-1")], {
        markReadImpl: async () => {
          throw Object.assign(new Error("Too Many Requests"), { status: 429 })
        },
      })

      await openNotificationsPanel(user)
      await closeNotificationsPanel(user)

      await waitFor(() =>
        expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
      )

      await new Promise((resolve) => setTimeout(resolve, 300))

      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1)
    })

    it("restores the unread badge after read-all fails on close", async () => {
      const { user } = renderNotificationFlow([notification("notification-1")], {
        markReadImpl: async () => {
          throw new Error("Network error")
        },
      })

      await openNotificationsPanel(user)
      await closeNotificationsPanel(user)

      await waitFor(() =>
        expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
      )

      await waitForBellLabel("1 unread notifications")
    })

    it("preserves a live socket notification when read-all fails on close", async () => {
      const { user, queryClient } = renderNotificationFlow(
        [
          notification("notification-1", {
            isRead: true,
            readAt: "2026-07-25T09:00:00.000Z",
          }),
        ],
        {
          markReadImpl: async () => {
            throw new Error("Network error")
          },
        },
      )

      await openNotificationsPanel(user)
      emitSocketNotification(notification("notification-2"))
      await closeNotificationsPanel(user)

      await waitFor(() =>
        expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
      )

      const cached = queryClient.getQueryData<NotificationsInfiniteData>(
        queryKeys.notifications.me,
      )

      expect(cached?.pages[0].data.map((item) => item._id)).toEqual([
        "notification-2",
        "notification-1",
      ])
      expect(cached?.pages[0].unreadCount).toBe(1)
      await waitForBellLabel("1 unread notifications")
    })
  })

  describe("multiple unread notifications and repeat sessions", () => {
    it("shows the exact unread count for multiple waiting notifications", async () => {
      renderNotificationFlow([
        notification("notification-1"),
        notification("notification-2"),
        notification("notification-3"),
      ])

      await waitForBellLabel("3 unread notifications")
    })

    it("caps the badge display at 9+ for ten or more unread notifications", async () => {
      const items = Array.from({ length: 10 }, (_, index) =>
        notification(`notification-${index + 1}`),
      )

      renderNotificationFlow(items)

      await waitFor(() => {
        expect(screen.getByText("9+")).toBeInTheDocument()
        expect(
          screen.getByRole("button", { name: "10 unread notifications" }),
        ).toBeInTheDocument()
      })
    })

    it("calls read-all again in a later panel session after a new unread arrives", async () => {
      const { user } = renderNotificationFlow([
        notification("notification-1", {
          isRead: true,
          readAt: "2026-07-25T09:00:00.000Z",
        }),
      ])

      emitSocketNotification(notification("notification-2"))
      await waitForBellLabel("1 unread notifications")

      await openNotificationsPanel(user)
      await closeNotificationsPanel(user)

      await waitFor(() =>
        expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
      )

      emitSocketNotification(notification("notification-3"))
      await waitForBellLabel("1 unread notifications")

      await openNotificationsPanel(user)
      await closeNotificationsPanel(user)

      await waitFor(() =>
        expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(2),
      )
    })
  })
})
