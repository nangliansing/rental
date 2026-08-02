export type NotificationsPanelOpenTransitionInput = {
  wasOpen: boolean
  open: boolean
  cacheUnreadCount: number
}

export type NotificationsPanelOpenTransition = {
  isPanelOpen: boolean
  shouldMarkAllAsRead: boolean
}

export function getDisplayUnreadCount(
  isPanelOpen: boolean,
  cacheUnreadCount: number,
) {
  if (isPanelOpen) {
    return 0
  }

  return normalizeUnreadCount(cacheUnreadCount)
}

export function resolveNotificationsPanelOpenTransition({
  wasOpen,
  open,
  cacheUnreadCount,
}: NotificationsPanelOpenTransitionInput): NotificationsPanelOpenTransition {
  const normalizedUnreadCount = normalizeUnreadCount(cacheUnreadCount)

  return {
    isPanelOpen: open,
    shouldMarkAllAsRead:
      !open && wasOpen && normalizedUnreadCount > 0,
  }
}

function normalizeUnreadCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }

  return Math.floor(value)
}
