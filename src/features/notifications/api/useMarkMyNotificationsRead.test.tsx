import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import {
  mergeNotificationIntoCache,
  type NotificationsInfiniteData,
} from "./notificationCache"
import type { NotificationItem } from "../types"

const mocks = vi.hoisted(() => ({ markMyNotificationsRead: vi.fn() }))
vi.mock("./markMyNotificationsRead", () => ({
  markMyNotificationsRead: mocks.markMyNotificationsRead,
}))

import { useMarkMyNotificationsRead } from "./useMarkMyNotificationsRead"

function notification(id: string): NotificationItem {
  return {
    _id: id,
    recipient: "user-1",
    actor: null,
    type: "SYSTEM",
    title: "Update",
    message: "Message",
    entityType: "SYSTEM",
    entityId: null,
    link: null,
    metadata: {},
    isRead: false,
    readAt: null,
    expiresAt: "2099-01-01T00:00:00.000Z",
    createdAt: "2026-07-22T00:00:00.000Z",
    updatedAt: "2026-07-22T00:00:00.000Z",
  }
}

function data(items: NotificationItem[]): NotificationsInfiniteData {
  return {
    pageParams: [1],
    pages: [{
      success: true,
      data: items,
      unreadCount: items.filter((item) => !item.isRead).length,
      pagination: { page: 1, limit: 20, total: items.length },
    }],
  }
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  queryClient.setQueryData(
    queryKeys.notifications.me,
    data([notification("notification-1")]),
  )

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useMarkMyNotificationsRead(), { wrapper: Wrapper }),
    queryClient,
  }
}

describe("useMarkMyNotificationsRead", () => {
  beforeEach(() => {
    mocks.markMyNotificationsRead.mockReset()
  })

  it("marks cached notifications read immediately", async () => {
    let resolve!: (value: unknown) => void
    mocks.markMyNotificationsRead.mockImplementation(
      () => new Promise((done) => { resolve = done }),
    )
    const { result, queryClient } = setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    act(() => result.current.mutate())
    await waitFor(() => expect(mocks.markMyNotificationsRead).toHaveBeenCalled())
    const optimistic = queryClient.getQueryData<NotificationsInfiniteData>(
      queryKeys.notifications.me,
    )
    expect(optimistic?.pages[0].unreadCount).toBe(0)
    expect(optimistic?.pages[0].data[0].isRead).toBe(true)
    expect(cancel).toHaveBeenCalledWith({ queryKey: queryKeys.notifications.me })

    await act(async () => resolve({ success: true }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("rolls back previous items without losing a concurrent socket event", async () => {
    let reject!: (error: Error) => void
    mocks.markMyNotificationsRead.mockImplementation(
      () => new Promise((_resolve, done) => { reject = done }),
    )
    const { result, queryClient } = setup()

    act(() => result.current.mutate())
    await waitFor(() => expect(mocks.markMyNotificationsRead).toHaveBeenCalled())
    queryClient.setQueryData<NotificationsInfiniteData>(
      queryKeys.notifications.me,
      (current) =>
        mergeNotificationIntoCache(current, notification("notification-2")),
    )
    await act(async () => reject(new Error("Network error")))
    await waitFor(() => expect(result.current.isError).toBe(true))

    const rolledBack = queryClient.getQueryData<NotificationsInfiniteData>(
      queryKeys.notifications.me,
    )
    expect(rolledBack?.pages[0].unreadCount).toBe(2)
    expect(
      rolledBack?.pages[0].data.map((item) => [item._id, item.isRead]),
    ).toEqual([
      ["notification-2", false],
      ["notification-1", false],
    ])
  })

  it("invalidates only the active central notification query on success", async () => {
    mocks.markMyNotificationsRead.mockResolvedValue({ success: true })
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate())
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.notifications.me,
      refetchType: "active",
    })
  })
})
