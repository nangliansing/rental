import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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
  overrides: { unreadCount?: number } = {},
): NotificationsInfiniteData {
  return {
    pageParams: [1],
    pages: [
      {
        success: true,
        data: items,
        unreadCount:
          overrides.unreadCount ?? items.filter((item) => !item.isRead).length,
        pagination: { page: 1, limit: 20, total: items.length },
      },
    ],
  }
}

function multiPageData(
  firstPageItems: NotificationItem[],
  secondPageItems: NotificationItem[],
): NotificationsInfiniteData {
  const total = firstPageItems.length + secondPageItems.length

  return {
    pageParams: [1, 2],
    pages: [
      {
        success: true,
        data: firstPageItems,
        unreadCount: firstPageItems.filter((item) => !item.isRead).length,
        pagination: { page: 1, limit: 20, total },
      },
      {
        success: true,
        data: secondPageItems,
        unreadCount: secondPageItems.filter((item) => !item.isRead).length,
        pagination: { page: 2, limit: 20, total },
      },
    ],
  }
}

function successResponse() {
  return {
    success: true as const,
    data: { matchedCount: 1, modifiedCount: 1 },
  }
}

type SetupOptions = {
  cache?: NotificationsInfiniteData
}

function setup(options: SetupOptions = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })

  if (options.cache) {
    queryClient.setQueryData(queryKeys.notifications.me, options.cache)
  }

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

function setupWithUnreadNotification() {
  return setup({
    cache: singlePageData([notification("notification-1")]),
  })
}

function getCachedNotifications(queryClient: QueryClient) {
  return queryClient.getQueryData<NotificationsInfiniteData>(
    queryKeys.notifications.me,
  )
}

describe("useMarkMyNotificationsRead", () => {
  beforeEach(() => {
    mocks.markMyNotificationsRead.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("optimistic cache updates", () => {
    it("marks cached notifications read immediately while the request is pending", async () => {
      let resolve!: (value: unknown) => void
      mocks.markMyNotificationsRead.mockImplementation(
        () => new Promise((done) => { resolve = done }),
      )
      const { result, queryClient } = setupWithUnreadNotification()
      const cancel = vi.spyOn(queryClient, "cancelQueries")

      act(() => result.current.mutate())
      await waitFor(() => expect(mocks.markMyNotificationsRead).toHaveBeenCalled())

      const optimistic = getCachedNotifications(queryClient)
      expect(optimistic?.pages[0].unreadCount).toBe(0)
      expect(optimistic?.pages[0].data[0].isRead).toBe(true)
      expect(cancel).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.me,
      })

      await act(async () => resolve(successResponse()))
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it("marks every page read when the cache spans multiple pages", async () => {
      mocks.markMyNotificationsRead.mockImplementation(
        () => new Promise(() => {}),
      )
      const { result, queryClient } = setup({
        cache: multiPageData(
          [notification("notification-1")],
          [notification("notification-2")],
        ),
      })

      act(() => result.current.mutate())
      await waitFor(() => expect(mocks.markMyNotificationsRead).toHaveBeenCalled())

      const optimistic = getCachedNotifications(queryClient)
      expect(optimistic?.pages[0].unreadCount).toBe(0)
      expect(optimistic?.pages[1].unreadCount).toBe(0)
      expect(
        optimistic?.pages.flatMap((page) => page.data).every((item) => item.isRead),
      ).toBe(true)
    })

    it("preserves existing readAt values for notifications that were already read", async () => {
      mocks.markMyNotificationsRead.mockImplementation(
        () => new Promise(() => {}),
      )
      const { result, queryClient } = setup({
        cache: singlePageData([
          notification("notification-1", {
            isRead: true,
            readAt: EXISTING_READ_AT,
          }),
        ]),
      })

      act(() => result.current.mutate())
      await waitFor(() => expect(mocks.markMyNotificationsRead).toHaveBeenCalled())

      expect(getCachedNotifications(queryClient)?.pages[0].data[0].readAt).toBe(
        EXISTING_READ_AT,
      )
    })

    it("does not throw when the notification cache is missing", async () => {
      mocks.markMyNotificationsRead.mockResolvedValue(successResponse())
      const { result, queryClient } = setup()

      await act(async () => result.current.mutate())
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getCachedNotifications(queryClient)).toBeUndefined()
      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1)
    })
  })

  describe("successful settlement", () => {
    it("invalidates only the active central notification query on success", async () => {
      mocks.markMyNotificationsRead.mockResolvedValue(successResponse())
      const { result, queryClient } = setupWithUnreadNotification()
      const invalidate = vi.spyOn(queryClient, "invalidateQueries")

      await act(async () => result.current.mutate())
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.notifications.me,
        refetchType: "active",
      })
    })

    it("calls markMyNotificationsRead exactly once per mutate", async () => {
      mocks.markMyNotificationsRead.mockResolvedValue(successResponse())
      const { result } = setupWithUnreadNotification()

      await act(async () => result.current.mutate())
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1)
    })

    it("leaves notifications read in cache after success", async () => {
      mocks.markMyNotificationsRead.mockResolvedValue(successResponse())
      const { result, queryClient } = setupWithUnreadNotification()

      await act(async () => result.current.mutate())
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const cached = getCachedNotifications(queryClient)
      expect(cached?.pages[0].unreadCount).toBe(0)
      expect(cached?.pages[0].data[0].isRead).toBe(true)
    })
  })

  describe("failed settlement", () => {
    it("rolls back unread state when the API fails with no concurrent socket events", async () => {
      mocks.markMyNotificationsRead.mockRejectedValue(new Error("Network error"))
      const { result, queryClient } = setupWithUnreadNotification()

      await act(async () => result.current.mutate())
      await waitFor(() => expect(result.current.isError).toBe(true))

      const rolledBack = getCachedNotifications(queryClient)
      expect(rolledBack?.pages[0].unreadCount).toBe(1)
      expect(rolledBack?.pages[0].data[0].isRead).toBe(false)
      expect(rolledBack?.pages[0].data[0].readAt).toBeNull()
    })

    it("rolls back previous items without losing a concurrent socket event", async () => {
      let reject!: (error: Error) => void
      mocks.markMyNotificationsRead.mockImplementation(
        () => new Promise((_resolve, done) => { reject = done }),
      )
      const { result, queryClient } = setupWithUnreadNotification()

      act(() => result.current.mutate())
      await waitFor(() => expect(mocks.markMyNotificationsRead).toHaveBeenCalled())

      queryClient.setQueryData<NotificationsInfiniteData>(
        queryKeys.notifications.me,
        (current) =>
          mergeNotificationIntoCache(current, notification("notification-2")),
      )

      await act(async () => reject(new Error("Network error")))
      await waitFor(() => expect(result.current.isError).toBe(true))

      const rolledBack = getCachedNotifications(queryClient)
      expect(rolledBack?.pages[0].unreadCount).toBe(2)
      expect(
        rolledBack?.pages[0].data.map((item) => [item._id, item.isRead]),
      ).toEqual([
        ["notification-2", false],
        ["notification-1", false],
      ])
    })

    it("does not invalidate notification queries after a network error", async () => {
      mocks.markMyNotificationsRead.mockRejectedValue(new Error("Network error"))
      const { result, queryClient } = setupWithUnreadNotification()
      const invalidate = vi.spyOn(queryClient, "invalidateQueries")

      await act(async () => result.current.mutate())
      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(invalidate).not.toHaveBeenCalled()
    })

    it("does not invalidate notification queries after a 429 response", async () => {
      mocks.markMyNotificationsRead.mockRejectedValue(
        Object.assign(new Error("Too Many Requests"), { status: 429 }),
      )
      const { result, queryClient } = setupWithUnreadNotification()
      const invalidate = vi.spyOn(queryClient, "invalidateQueries")

      await act(async () => result.current.mutate())
      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(invalidate).not.toHaveBeenCalled()
      expect(getCachedNotifications(queryClient)?.pages[0].unreadCount).toBe(1)
    })
  })

  describe("queued retries through mutation scope", () => {
    it("restores read state when a queued retry succeeds after the first attempt fails", async () => {
      mocks.markMyNotificationsRead
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(successResponse())

      const { result, queryClient } = setupWithUnreadNotification()

      await act(async () => {
        result.current.mutate()
        result.current.mutate()
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(2)
      expect(getCachedNotifications(queryClient)?.pages[0].unreadCount).toBe(0)
      expect(getCachedNotifications(queryClient)?.pages[0].data[0].isRead).toBe(
        true,
      )
    })

    it("does not leave the cache stuck unread when the first attempt fails and the retry succeeds", async () => {
      mocks.markMyNotificationsRead
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(successResponse())

      const { result, queryClient } = setupWithUnreadNotification()

      await act(async () => {
        result.current.mutate()
        result.current.mutate()
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getCachedNotifications(queryClient)?.pages[0].data[0].isRead).toBe(
        true,
      )
    })
  })

  describe("already-read cache", () => {
    it("still calls the API when every cached notification is already read", async () => {
      mocks.markMyNotificationsRead.mockResolvedValue(successResponse())
      const { result } = setup({
        cache: singlePageData([
          notification("notification-1", {
            isRead: true,
            readAt: EXISTING_READ_AT,
          }),
        ]),
      })

      await act(async () => result.current.mutate())
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mocks.markMyNotificationsRead).toHaveBeenCalledTimes(1)
    })

    it("keeps unread count at zero after success when the cache was already read", async () => {
      mocks.markMyNotificationsRead.mockResolvedValue(successResponse())
      const { result, queryClient } = setup({
        cache: singlePageData([
          notification("notification-1", {
            isRead: true,
            readAt: EXISTING_READ_AT,
          }),
        ], { unreadCount: 0 }),
      })

      await act(async () => result.current.mutate())
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(getCachedNotifications(queryClient)?.pages[0].unreadCount).toBe(0)
    })
  })
})
