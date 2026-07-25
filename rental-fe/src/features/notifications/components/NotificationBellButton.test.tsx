import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/renderWithProviders"

import type { NotificationItem } from "../types"
import { NotificationBellButton } from "./NotificationBellButton"

const mocks = vi.hoisted(() => ({
  notifications: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock("../useNotifications", () => ({
  useNotifications: () => mocks.notifications(),
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  )

  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  }
})

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

function renderBell(variant: "desktop" | "mobile" = "desktop") {
  return renderWithProviders(<NotificationBellButton variant={variant} />)
}

describe("NotificationBellButton", () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
    mocks.notifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      markAllAsRead: vi.fn(),
    })
  })

  it("shows the default notifications label when there are no unread items", () => {
    renderBell()

    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).toBeInTheDocument()
  })

  it("shows an unread badge and opens the empty panel", async () => {
    mocks.notifications.mockReturnValue({
      notifications: [],
      unreadCount: 2,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      markAllAsRead: vi.fn(),
    })

    const { user } = renderBell()

    expect(
      screen.getByRole("button", { name: "2 unread notifications" }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "2 unread notifications" }))

    expect(screen.getByRole("heading", { name: "Notifications" })).toBeVisible()
    expect(screen.getByText("No notifications yet")).toBeVisible()
  })

  it("marks notifications read when the panel opens", async () => {
    const markAllAsRead = vi.fn().mockResolvedValue(undefined)
    mocks.notifications.mockReturnValue({
      notifications: [notification()],
      unreadCount: 1,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      markAllAsRead,
    })

    const { user } = renderBell()

    await user.click(
      screen.getByRole("button", { name: "1 unread notifications" }),
    )

    await waitFor(() => expect(markAllAsRead).toHaveBeenCalledTimes(1))
    expect(
      screen.getByText("Bangkapi Residence is now ฿13k/month."),
    ).toBeVisible()
  })

  it("navigates when a notification with a link is clicked", async () => {
    mocks.notifications.mockReturnValue({
      notifications: [notification()],
      unreadCount: 0,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      markAllAsRead: vi.fn(),
    })

    const { user } = renderBell()

    await user.click(screen.getByRole("button", { name: "Notifications" }))
    await user.click(
      screen.getByRole("button", { name: /Saved listing price changed/i }),
    )

    expect(mocks.navigate).toHaveBeenCalledWith("/profile?tab=saved")
  })
})
