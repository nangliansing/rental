import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { setAccessToken } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/renderWithProviders"

import type { NotificationsInfiniteData } from "../api/notificationCache"
import { NotificationProvider } from "../NotificationProvider"
import type { NotificationItem } from "../types"
import { NotificationBellButton } from "./NotificationBellButton"

const mocks = vi.hoisted(() => ({
  getMyNotifications: vi.fn(),
  markMyNotificationsRead: vi.fn(),
}))

vi.mock("../api/getMyNotifications", async () => {
  const actual = await vi.importActual<typeof import("../api/getMyNotifications")>(
    "../api/getMyNotifications",
  )

  return {
    ...actual,
    getMyNotifications: mocks.getMyNotifications,
  }
})

vi.mock("../api/markMyNotificationsRead", () => ({
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
  overrides: Partial<NotificationItem> = {},
): NotificationItem {
  return {
    _id: "notification-1",
    recipient: "user-1",
    actor: null,
    type: "SAVED_LISTING_PRICE_CHANGED",
    title: "Saved listing price changed",
    message: "Bangkapi Residence is now ฿13k/month.",
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

function seedNotifications(items: NotificationItem[]) {
  let notifications = [...items]
  let unreadCount = notifications.filter((item) => !item.isRead).length

  const buildPage = () => ({
    success: true as const,
    data: notifications,
    unreadCount,
    pagination: { page: 1, limit: 20, total: notifications.length },
  })

  mocks.getMyNotifications.mockImplementation(async () => buildPage())

  mocks.markMyNotificationsRead.mockImplementation(async () => {
    notifications = notifications.map((item) => ({
      ...item,
      isRead: true,
      readAt: item.readAt ?? "2026-07-25T09:00:00.000Z",
    }))
    unreadCount = 0

    return {
      success: true,
      data: {
        matchedCount: notifications.length,
        modifiedCount: notifications.length,
      },
    }
  })

  const queryClient = createTestQueryClient()
  queryClient.setQueryDefaults(queryKeys.notifications.me, {
    staleTime: Infinity,
    gcTime: Infinity,
  })
  queryClient.setQueryData<NotificationsInfiniteData>(queryKeys.notifications.me, {
    pageParams: [1],
    pages: [buildPage()],
  })

  return queryClient
}

function renderBellWithProvider(items: NotificationItem[]) {
  const queryClient = seedNotifications(items)

  return renderWithProviders(
    <NotificationProvider>
      <NotificationBellButton variant="desktop" />
    </NotificationProvider>,
    { queryClient },
  )
}

describe("NotificationBellButton integration", () => {
  beforeEach(() => {
    setAccessToken("test-token")
    mocks.getMyNotifications.mockReset()
    mocks.markMyNotificationsRead.mockReset()
  })

  it("clears the unread badge after opening the panel", async () => {
    const { user } = renderBellWithProvider([notification()])

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "1 unread notifications" }),
      ).toBeInTheDocument(),
    )

    await user.click(
      screen.getByRole("button", { name: "1 unread notifications" }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Notifications", exact: true }),
      ).toBeInTheDocument(),
    )
    expect(
      screen.getByText("Bangkapi Residence is now ฿13k/month."),
    ).toBeVisible()
    expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1)
  })

  it("closes the panel and restores the default bell label", async () => {
    const { user } = renderBellWithProvider([notification({ isRead: true })])

    const bell = await screen.findByRole("button", { name: "Notifications" })
    await user.click(bell)
    await screen.findByRole("heading", { name: "Notifications" })

    await user.click(screen.getByRole("button", { name: "Close notifications" }))

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Notifications" }),
      ).not.toBeInTheDocument(),
    )
  })
})
