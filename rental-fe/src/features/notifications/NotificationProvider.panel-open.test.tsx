import type { PropsWithChildren } from "react"
import { act, render, screen, waitFor } from "@testing-library/react"
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
      <output aria-label="Unread count">{unreadCount}</output>
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
            notification("live-notification-2", {
              type: "FOLLOWED_BUILDING_NEW_LISTING",
              title: "New listing",
            }),
          )
        }
      >
        Push second live notification
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
  const page = notificationsPage(items)
  mocks.getMyNotifications.mockResolvedValue(page)

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  })

  queryClient.setQueryData<NotificationsInfiniteData>(
    queryKeys.notifications.me,
    infiniteNotificationsData(items),
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

describe("NotificationProvider panel-open scenarios", () => {
  beforeEach(() => {
    mocks.getMyNotifications.mockReset()
    mocks.markMyNotificationsRead.mockReset()
    mocks.markMyNotificationsRead.mockResolvedValue({
      success: true,
      data: { matchedCount: 1, modifiedCount: 1 },
    })
  })

  it("does not call read-all when opening the panel with zero unread", async () => {
    const { user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await waitFor(() =>
      expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled(),
    )
  })

  it("calls read-all once when opening the panel with unread notifications", async () => {
    const { user } = renderNotificationsProbe([notification("notification-1")])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("1"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))

    await waitFor(() =>
      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
    )
  })

  it("clears unread count optimistically before read-all resolves", async () => {
    let resolveReadAll: ((value: unknown) => void) | undefined
    mocks.markMyNotificationsRead.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReadAll = resolve
        }),
    )

    const { user } = renderNotificationsProbe([notification("notification-1")])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("1"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
    )

    await act(async () => {
      resolveReadAll?.({
        success: true,
        data: { matchedCount: 1, modifiedCount: 1 },
      })
    })
  })

  it("does not loop read-all requests when the API returns 429", async () => {
    mocks.markMyNotificationsRead.mockRejectedValue(
      Object.assign(new Error("Too Many Requests"), { status: 429 }),
    )

    const { user } = renderNotificationsProbe([notification("notification-1")])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("1"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))

    await waitFor(() =>
      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
    )

    await waitFor(
      () => expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
      { timeout: 1_000 },
    )

    await new Promise((resolve) => setTimeout(resolve, 300))

    expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1)
  })

  it("dedupes concurrent read-all requests into one in-flight call", async () => {
    let resolveReadAll: ((value: unknown) => void) | undefined
    mocks.markMyNotificationsRead.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReadAll = resolve
        }),
    )

    const { user } = renderNotificationsProbe([notification("notification-1")])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("1"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Push live notification" }))

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 600))
    })

    expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveReadAll?.({
        success: true,
        data: { matchedCount: 1, modifiedCount: 1 },
      })
    })
  })

  it("marks live notifications as read while the panel is open without raising unread count", async () => {
    const { queryClient, user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Push live notification" }))

    const cached = queryClient.getQueryData<NotificationsInfiniteData>(
      queryKeys.notifications.me,
    )

    expect(screen.getByLabelText("Unread count")).toHaveTextContent("0")
    expect(cached?.pages[0].data[0]).toMatchObject({
      _id: "live-notification",
      isRead: true,
    })
  })

  it("debounces read-all sync for rapid live notifications while the panel is open", async () => {
    const { user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Push live notification" }))
    await user.click(
      screen.getByRole("button", { name: "Push second live notification" }),
    )

    expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()

    await waitFor(
      () => expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1),
      { timeout: 1_000 },
    )

    await new Promise((resolve) => setTimeout(resolve, 700))

    expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1)
  })

  it("cancels pending debounced sync when the panel closes", async () => {
    const { user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Push live notification" }))
    await user.click(screen.getByRole("button", { name: "Close panel" }))

    await new Promise((resolve) => setTimeout(resolve, 700))

    expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()
  })

  it("increments unread count for live notifications while the panel is closed", async () => {
    const { user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
    )

    await user.click(screen.getByRole("button", { name: "Push live notification" }))

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("1"),
    )
  })

  it("keeps unread count stable when live notifications arrive during a 429 read-all response", async () => {
    mocks.markMyNotificationsRead.mockRejectedValue(
      Object.assign(new Error("Too Many Requests"), { status: 429 }),
    )

    const { user } = renderNotificationsProbe([notification("notification-1")])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("1"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
    )

    await user.click(screen.getByRole("button", { name: "Push live notification" }))
    await user.click(
      screen.getByRole("button", { name: "Push second live notification" }),
    )

    expect(screen.getByLabelText("Unread count")).toHaveTextContent("0")

    await waitFor(
      () => expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(2),
      { timeout: 1_000 },
    )
  })

  it("ignores expired live notifications while the panel is open", async () => {
    const { queryClient, user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(
      screen.getByRole("button", { name: "Push expired notification" }),
    )

    const cached = queryClient.getQueryData<NotificationsInfiniteData>(
      queryKeys.notifications.me,
    )

    expect(cached?.pages[0].data).toHaveLength(1)
    expect(mocks.markMyNotificationsRead).not.toHaveBeenCalled()
  })

  it("does not increment unread count when the same live notification is pushed twice while open", async () => {
    const { queryClient, user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))
    await user.click(screen.getByRole("button", { name: "Push live notification" }))
    await user.click(screen.getByRole("button", { name: "Push live notification" }))

    const cached = queryClient.getQueryData<NotificationsInfiniteData>(
      queryKeys.notifications.me,
    )

    expect(cached?.pages[0].unreadCount).toBe(0)
    expect(cached?.pages[0].data.filter((item) => item._id === "live-notification")).toHaveLength(1)
  })

  it("marks newly unread notifications read when the panel is reopened", async () => {
    const { user } = renderNotificationsProbe([
      notification("notification-1", { isRead: true }),
    ])

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
    )

    await user.click(screen.getByRole("button", { name: "Push live notification" }))

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("1"),
    )

    await user.click(screen.getByRole("button", { name: "Open panel" }))

    await waitFor(() =>
      expect(screen.getByLabelText("Unread count")).toHaveTextContent("0"),
    )
    expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1)
  })
})
