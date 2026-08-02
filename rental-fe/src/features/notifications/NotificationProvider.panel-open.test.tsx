import type { PropsWithChildren } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import type { NotificationsInfiniteData } from "./api/notificationCache"
import { NotificationProvider } from "./NotificationProvider"
import type { NotificationItem } from "./types"
import { useNotifications } from "./useNotifications"

const mocks = vi.hoisted(() => ({
  getMyNotifications: vi.fn(),
  markMyNotificationsRead: vi.fn(),
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
    on: vi.fn(),
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
    type: "SYSTEM",
    title: `Update ${id}`,
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

function notificationsPage(items: NotificationItem[]) {
  return {
    success: true as const,
    data: items,
    unreadCount: items.filter((item) => !item.isRead).length,
    pagination: {
      page: 1,
      limit: 20,
      total: items.length,
    },
  }
}

function infiniteNotificationsData(items: NotificationItem[]): NotificationsInfiniteData {
  return {
    pageParams: [1],
    pages: [notificationsPage(items)],
  }
}

function NotificationsProbe() {
  const {
    unreadCount,
    addNotification,
    setNotificationsPanelOpen,
  } = useNotifications()

  return (
    <div>
      <output aria-label="Badge unread count">{unreadCount}</output>
      <button type="button" onClick={() => setNotificationsPanelOpen(true)}>
        Open panel
      </button>
      <button type="button" onClick={() => setNotificationsPanelOpen(false)}>
        Close panel
      </button>
      <button
        type="button"
        onClick={() => addNotification(notification("live-notification"))}
      >
        Push live notification
      </button>
      <button
        type="button"
        onClick={() =>
          addNotification(
            notification("expired-notification", {
              expiresAt: "2020-01-01T00:00:00.000Z",
            }),
          )
        }
      >
        Push expired notification
      </button>
    </div>
  )
}

function renderNotificationsProbe(items: NotificationItem[]) {
  let notifications = [...items]

  const buildPage = () => notificationsPage(notifications)

  mocks.getMyNotifications.mockImplementation(async () => buildPage())

  mocks.markMyNotificationsRead.mockImplementation(async () => {
    notifications = notifications.map((item) => ({
      ...item,
      isRead: true,
      readAt: item.readAt ?? "2026-07-22T01:00:00.000Z",
    }))

    return {
      success: true,
      data: {
        matchedCount: notifications.length,
        modifiedCount: notifications.length,
      },
    }
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  })

  queryClient.setQueryData<NotificationsInfiniteData>(
    queryKeys.notifications.me,
    infiniteNotificationsData(notifications),
  )

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>{children}</NotificationProvider>
      </QueryClientProvider>
    )
  }

  return {
    queryClient,
    user: userEvent.setup(),
    ...render(<NotificationsProbe />, { wrapper: Wrapper }),
  }
}

describe("NotificationProvider panel scenarios", () => {
  beforeEach(() => {
    mocks.getMyNotifications.mockReset()
    mocks.markMyNotificationsRead.mockReset()
  })

  it("does not call read-all when opening the panel", async () => {
    const { user } = renderNotificationsProbe([notification("notification-1")])

    await waitFor(() =>
      expect(screen.getByLabelText("Badge unread count")).toHaveTextContent("1"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))

    expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()
  })

  it("hides the badge while the panel is open", async () => {
    const { user } = renderNotificationsProbe([notification("notification-1")])

    await waitFor(() =>
      expect(screen.getByLabelText("Badge unread count")).toHaveTextContent("1"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))

    expect(screen.getByLabelText("Badge unread count")).toHaveTextContent("0")
  })

  it("calls read-all once when closing the panel with unread notifications", async () => {
    const { user } = renderNotificationsProbe([notification("notification-1")])

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Close panel" }))

    await waitFor(() =>
      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
    )
  })

  it("does not call read-all when closing an empty panel", async () => {
    const { user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Close panel" }))

    expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()
  })

  it("clears the badge after closing the panel", async () => {
    const { user } = renderNotificationsProbe([notification("notification-1")])

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    expect(screen.getByLabelText("Badge unread count")).toHaveTextContent("0")

    await user.click(screen.getByRole("button", { name: "Close panel" }))

    await waitFor(() =>
      expect(screen.getByLabelText("Badge unread count")).toHaveTextContent("0"),
    )
  })

  it("does not loop read-all requests when the API returns 429 on close", async () => {
    mocks.markMyNotificationsRead.mockRejectedValue(
      Object.assign(new Error("Too Many Requests"), { status: 429 }),
    )

    const { user } = renderNotificationsProbe([notification("notification-1")])

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Close panel" }))

    await waitFor(() =>
      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
    )

    await new Promise((resolve) => setTimeout(resolve, 300))

    expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1)
  })

  it("does not call read-all for live notifications while the panel stays open", async () => {
    const { user } = renderNotificationsProbe([notification("notification-1")])

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Push live notification" }))

    expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()
  })

  it("syncs live notifications on close after they arrived while the panel was open", async () => {
    const { queryClient, user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Push live notification" }))
    await user.click(screen.getByRole("button", { name: "Close panel" }))

    await waitFor(() =>
      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
    )

    const cached = queryClient.getQueryData<NotificationsInfiniteData>(
      queryKeys.notifications.me,
    )

    expect(cached?.pages[0].unreadCount).toBe(0)
    expect(screen.getByLabelText("Badge unread count")).toHaveTextContent("0")
  })

  it("increments the badge for live notifications while the panel is closed", async () => {
    const { user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await waitFor(() =>
      expect(screen.getByLabelText("Badge unread count")).toHaveTextContent("0"),
    )

    await user.click(screen.getByRole("button", { name: "Push live notification" }))

    await waitFor(() =>
      expect(screen.getByLabelText("Badge unread count")).toHaveTextContent("1"),
    )
  })

  it("does not call read-all twice when setNotificationsPanelOpen(false) is repeated", async () => {
    const { user } = renderNotificationsProbe([notification("notification-1")])

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Close panel" }))
    await user.click(screen.getByRole("button", { name: "Close panel" }))

    await waitFor(() =>
      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
    )
  })

  it("calls read-all again after a new unread arrives in a later panel session", async () => {
    const { user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await user.click(screen.getByRole("button", { name: "Push live notification" }))
    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Close panel" }))

    await waitFor(() =>
      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
    )

    await user.click(screen.getByRole("button", { name: "Push live notification" }))
    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Close panel" }))

    await waitFor(() =>
      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(2),
    )
  })

  it("ignores expired live notifications", async () => {
    const { queryClient, user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await user.click(screen.getByRole("button", { name: "Push expired notification" }))

    const cached = queryClient.getQueryData<NotificationsInfiniteData>(
      queryKeys.notifications.me,
    )

    expect(cached?.pages[0].data).toHaveLength(1)
    expect(screen.getByLabelText("Badge unread count")).toHaveTextContent("0")
  })
})
