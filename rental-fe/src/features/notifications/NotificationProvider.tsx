import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { io, type Socket } from "socket.io-client"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { getAccessToken } from "@/lib/api-client"
import { getSocketUrl } from "@/lib/public-env"

import {
  NOTIFICATIONS_QUERY_KEY,
  notificationsQueryOptions,
  parseNotificationItem,
  useMarkMyNotificationsRead,
} from "./api"
import {
  isVisibleNotification,
  markNotificationsReadInCache,
  mergeNotificationIntoCache,
  type NotificationsInfiniteData,
} from "./api/notificationCache"
import type {
  NotificationConnectionStatus,
  NotificationItem,
} from "./types"
import {
  NotificationContext,
  type NotificationContextValue,
} from "./notification-context"

type ServerToClientEvents = {
  "notification:new": (notification: NotificationItem) => void
}

type ClientToServerEvents = Record<string, never>

const MARK_READ_SYNC_DEBOUNCE_MS = 500

type MarkAllAsReadOptions = {
  syncEvenIfCacheRead?: boolean
}

function getUnreadCount(currentData: NotificationsInfiniteData | undefined) {
  return currentData?.pages[0]?.unreadCount ?? 0
}

function deferStateUpdate(update: () => void) {
  queueMicrotask(update)
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const markNotificationsReadMutation = useMarkMyNotificationsRead()
  const socketRef =
    useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
  const isPanelOpenRef = useRef(false)
  const markReadPromiseRef = useRef<Promise<void> | null>(null)
  const markReadSyncTimeoutRef = useRef<number | null>(null)
  const [connectionStatus, setConnectionStatus] =
    useState<NotificationConnectionStatus>("idle")
  const shouldUseNotifications =
    !isLoading && isAuthenticated && user?.status === "ACTIVE"

  const notificationsQuery = useInfiniteQuery(
    notificationsQueryOptions(shouldUseNotifications),
  )
  const {
    data: notificationsData,
    error: notificationsError,
    fetchNextPage: fetchNextNotificationsPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isLoading: isNotificationsLoading,
    refetch: refetchNotificationsQuery,
  } = notificationsQuery

  const markAllAsRead = useCallback(async (options: MarkAllAsReadOptions = {}) => {
    const currentData = queryClient.getQueryData<NotificationsInfiniteData>(
      NOTIFICATIONS_QUERY_KEY,
    )
    if (
      !options.syncEvenIfCacheRead &&
      getUnreadCount(currentData) === 0
    ) {
      return
    }

    if (markReadPromiseRef.current) {
      return markReadPromiseRef.current
    }

    const promise = (async () => {
      try {
        await markNotificationsReadMutation.mutateAsync()
      } catch {
        // The mutation restores cached read state while preserving socket events.
      } finally {
        markReadPromiseRef.current = null
      }
    })()

    markReadPromiseRef.current = promise
    return promise
  }, [markNotificationsReadMutation, queryClient])

  const scheduleMarkReadSync = useCallback(() => {
    if (!isPanelOpenRef.current) return

    if (markReadSyncTimeoutRef.current) {
      window.clearTimeout(markReadSyncTimeoutRef.current)
    }

    markReadSyncTimeoutRef.current = window.setTimeout(() => {
      markReadSyncTimeoutRef.current = null
      void markAllAsRead({ syncEvenIfCacheRead: true })
    }, MARK_READ_SYNC_DEBOUNCE_MS)
  }, [markAllAsRead])

  const scheduleMarkReadSyncRef = useRef(scheduleMarkReadSync)
  scheduleMarkReadSyncRef.current = scheduleMarkReadSync

  const addNotification = useCallback((notification: NotificationItem) => {
    let parsedNotification = parseNotificationItem(notification)
    const isVisible = isVisibleNotification(parsedNotification)

    if (isPanelOpenRef.current && isVisible) {
      parsedNotification = {
        ...parsedNotification,
        isRead: true,
        readAt: parsedNotification.readAt ?? new Date().toISOString(),
      }
    }

    queryClient.setQueryData<NotificationsInfiniteData>(
      NOTIFICATIONS_QUERY_KEY,
      (currentData) =>
        mergeNotificationIntoCache(currentData, parsedNotification),
    )

    if (isPanelOpenRef.current && isVisible) {
      scheduleMarkReadSyncRef.current()
    }
  }, [queryClient])

  const addNotificationRef = useRef(addNotification)
  addNotificationRef.current = addNotification

  const clearNotifications = useCallback(() => {
    queryClient.removeQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
  }, [queryClient])

  const unreadCount = useMemo(
    () => notificationsData?.pages[0]?.unreadCount ?? 0,
    [notificationsData],
  )

  const setNotificationsPanelOpen = useCallback((open: boolean) => {
    isPanelOpenRef.current = open

    if (open) {
      const currentData = queryClient.getQueryData<NotificationsInfiniteData>(
        NOTIFICATIONS_QUERY_KEY,
      )
      const hadUnread = getUnreadCount(currentData) > 0

      if (hadUnread) {
        queryClient.setQueryData<NotificationsInfiniteData>(
          NOTIFICATIONS_QUERY_KEY,
          markNotificationsReadInCache,
        )
        void markAllAsRead({ syncEvenIfCacheRead: true })
      }

      return
    }

    if (markReadSyncTimeoutRef.current) {
      window.clearTimeout(markReadSyncTimeoutRef.current)
      markReadSyncTimeoutRef.current = null
    }
  }, [markAllAsRead, queryClient])

  useEffect(() => {
    return () => {
      if (markReadSyncTimeoutRef.current) {
        window.clearTimeout(markReadSyncTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const token = getAccessToken()
    const socketUrl = getSocketUrl()

    if (!shouldUseNotifications || !token || !socketUrl) {
      socketRef.current?.disconnect()
      socketRef.current = null
      deferStateUpdate(() => {
        queryClient.removeQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
        setConnectionStatus("idle")
      })
      return
    }

    deferStateUpdate(() => {
      setConnectionStatus("connecting")
    })

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
      socketUrl,
      {
        auth: { token },
        transports: ["websocket", "polling"],
        withCredentials: true,
      },
    )

    socketRef.current = socket

    socket.on("connect", () => {
      setConnectionStatus("connected")
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATIONS_QUERY_KEY,
      })
    })

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected")
    })

    socket.on("connect_error", () => {
      setConnectionStatus("error")
    })

    const handleNotification = (notification: NotificationItem) => {
      addNotificationRef.current(notification)
    }

    socket.on("notification:new", handleNotification)

    return () => {
      socket.off("notification:new", handleNotification)
      socket.disconnect()

      if (socketRef.current === socket) {
        socketRef.current = null
      }
    }
  }, [
    queryClient,
    shouldUseNotifications,
    user?._id,
  ])

  const notifications = useMemo(() => {
    return notificationsData?.pages.flatMap((page) => page.data) ?? []
  }, [notificationsData])

  const fetchNextPage = useCallback(() => {
    void fetchNextNotificationsPage()
  }, [fetchNextNotificationsPage])

  const refetchNotifications = useCallback(() => {
    void refetchNotificationsQuery()
  }, [refetchNotificationsQuery])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      connectionStatus,
      isLoading: isNotificationsLoading,
      isFetching,
      isFetchingNextPage,
      hasNextPage: Boolean(hasNextPage),
      error: notificationsError instanceof Error ? notificationsError : null,
      addNotification,
      clearNotifications,
      fetchNextPage,
      markAllAsRead,
      refetchNotifications,
      setNotificationsPanelOpen,
    }),
    [
      addNotification,
      clearNotifications,
      connectionStatus,
      fetchNextPage,
      hasNextPage,
      isFetching,
      isFetchingNextPage,
      isNotificationsLoading,
      markAllAsRead,
      notifications,
      notificationsError,
      refetchNotifications,
      setNotificationsPanelOpen,
      unreadCount,
    ],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
