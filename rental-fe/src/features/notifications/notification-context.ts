import { createContext } from "react"

import type {
  NotificationConnectionStatus,
  NotificationItem,
} from "./types"

export type NotificationContextValue = {
  notifications: NotificationItem[]
  unreadCount: number
  connectionStatus: NotificationConnectionStatus
  isLoading: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  error: Error | null
  addNotification: (notification: NotificationItem) => void
  clearNotifications: () => void
  fetchNextPage: () => void
  markAllAsRead: () => Promise<void>
  refetchNotifications: () => void
  setNotificationsPanelOpen: (open: boolean) => void
}

export const NotificationContext =
  createContext<NotificationContextValue | null>(null)
