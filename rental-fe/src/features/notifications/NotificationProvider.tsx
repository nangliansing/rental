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

function deferStateUpdate(update: () => void) {
  queueMicrotask(update)
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const markNotificationsReadMutation = useMarkMyNotificationsRead()
  const socketRef =
    useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null)
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

  const addNotification = useCallback((notification: NotificationItem) => {
    const parsedNotification = parseNotificationItem(notification)

    queryClient.setQueryData<NotificationsInfiniteData>(
      NOTIFICATIONS_QUERY_KEY,
      (currentData) =>
        mergeNotificationIntoCache(currentData, parsedNotification),
    )
  }, [queryClient])

  const clearNotifications = useCallback(() => {
    queryClient.removeQueries({ queryKey: NOTIFICATIONS_QUERY_KEY })
  }, [queryClient])

  const unreadCount = useMemo(
    () => notificationsData?.pages[0]?.unreadCount ?? 0,
    [notificationsData],
  )

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return
    try {
      await markNotificationsReadMutation.mutateAsync()
    } catch {
      // The mutation restores cached read state while preserving socket events.
    }
  }, [markNotificationsReadMutation, unreadCount])

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

    socket.on("notification:new", addNotification)

    return () => {
      socket.off("notification:new", addNotification)
      socket.disconnect()

      if (socketRef.current === socket) {
        socketRef.current = null
      }
    }
  }, [
    addNotification,
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
      unreadCount,
    ],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
