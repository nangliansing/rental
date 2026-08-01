import {
  Bell,
  BellRing,
  Building2,
  ChevronRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Flag,
  Heart,
  Inbox,
  Info,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserMinus,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"
import { FloatingActionPanel } from "@/shared/components/navigation/FloatingActionPanel"
import { cn } from "@/lib/utils"

import { useNotifications } from "../useNotifications"
import type { NotificationItem, NotificationType } from "../types"

type NotificationBellButtonProps = {
  variant: "desktop" | "mobile"
}

const notificationTypes: NotificationType[] = [
  "PENDING_LISTING_APPROVED",
  "PENDING_LISTING_REJECTED",
  "LISTING_DELETED",
  "LISTING_VISIBILITY_CHANGED",
  "BUILDING_EDIT_APPROVED",
  "BUILDING_EDIT_REJECTED",
  "REPORT_REVIEWED",
  "REPORT_DISMISSED",
  "REPORT_ACTION_TAKEN",
  "USER_SUSPENDED",
  "SUSPENSION_LIFTED",
  "ADMIN_ROLE_REMOVED",
  "SAVED_LISTING_PRICE_CHANGED",
  "SAVED_LISTING_BECAME_UNAVAILABLE",
  "SAVED_LISTING_AVAILABLE_AGAIN",
  "FOLLOWED_BUILDING_PRICE_DROPPED",
  "FOLLOWED_BUILDING_NEW_LISTING",
  "FOLLOWED_BUILDING_AVAILABLE_AGAIN",
  "REVIEW_RECEIVED",
  "REVIEW_REPLY_RECEIVED",
  "REVIEW_REMOVED",
  "SYSTEM",
]

const notificationDisplay = {
  PENDING_LISTING_APPROVED: {
    icon: CheckCircle2,
    tone: "text-emerald-600 bg-emerald-50",
  },
  PENDING_LISTING_REJECTED: {
    icon: XCircle,
    tone: "text-rose-600 bg-rose-50",
  },
  LISTING_DELETED: {
    icon: Trash2,
    tone: "text-rose-600 bg-rose-50",
  },
  LISTING_VISIBILITY_CHANGED: {
    icon: Eye,
    tone: "text-blue-600 bg-blue-50",
  },
  BUILDING_EDIT_APPROVED: {
    icon: Building2,
    tone: "text-emerald-600 bg-emerald-50",
  },
  BUILDING_EDIT_REJECTED: {
    icon: Building2,
    tone: "text-rose-600 bg-rose-50",
  },
  REPORT_REVIEWED: {
    icon: Flag,
    tone: "text-slate-600 bg-slate-100",
  },
  REPORT_DISMISSED: {
    icon: Flag,
    tone: "text-slate-600 bg-slate-100",
  },
  REPORT_ACTION_TAKEN: {
    icon: ShieldCheck,
    tone: "text-emerald-600 bg-emerald-50",
  },
  USER_SUSPENDED: {
    icon: ShieldAlert,
    tone: "text-amber-700 bg-amber-50",
  },
  SUSPENSION_LIFTED: {
    icon: ShieldCheck,
    tone: "text-emerald-600 bg-emerald-50",
  },
  ADMIN_ROLE_REMOVED: {
    icon: UserMinus,
    tone: "text-slate-600 bg-slate-100",
  },
  SAVED_LISTING_PRICE_CHANGED: {
    icon: Heart,
    tone: "text-blue-600 bg-blue-50",
  },
  SAVED_LISTING_BECAME_UNAVAILABLE: {
    icon: EyeOff,
    tone: "text-amber-700 bg-amber-50",
  },
  SAVED_LISTING_AVAILABLE_AGAIN: {
    icon: Heart,
    tone: "text-emerald-600 bg-emerald-50",
  },
  FOLLOWED_BUILDING_PRICE_DROPPED: {
    icon: Building2,
    tone: "text-emerald-600 bg-emerald-50",
  },
  FOLLOWED_BUILDING_NEW_LISTING: {
    icon: Building2,
    tone: "text-blue-600 bg-blue-50",
  },
  FOLLOWED_BUILDING_AVAILABLE_AGAIN: {
    icon: Building2,
    tone: "text-emerald-600 bg-emerald-50",
  },
  REVIEW_RECEIVED: {
    icon: MessageSquare,
    tone: "text-blue-600 bg-blue-50",
  },
  REVIEW_REPLY_RECEIVED: {
    icon: MessageSquare,
    tone: "text-blue-600 bg-blue-50",
  },
  REVIEW_REMOVED: {
    icon: MessageSquare,
    tone: "text-rose-600 bg-rose-50",
  },
  SYSTEM: {
    icon: Info,
    tone: "text-slate-600 bg-slate-100",
  },
} satisfies Record<
  NotificationType,
  {
    icon: typeof Bell
    tone: string
  }
>

function isKnownNotificationType(type: string): type is NotificationType {
  return notificationTypes.includes(type as NotificationType)
}

function formatNotificationTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function getStringMetadata(
  notification: NotificationItem,
  key: string,
) {
  const value = notification.metadata[key]

  return typeof value === "string" && value.trim() ? value.trim() : null
}

function getNotificationMessage(notification: NotificationItem) {
  if (notification.type !== "LISTING_DELETED") {
    return notification.message
  }

  const listingLabel = getStringMetadata(notification, "listingLabel")
  const reason = getStringMetadata(notification, "reason")

  if (listingLabel && reason) {
    return `Your ${listingLabel} was removed. Reason: ${reason}`
  }

  if (reason) {
    return `Your listing was removed. Reason: ${reason}`
  }

  return notification.message.replace(
    /^Your listing [a-f\d]{24} was removed:\s*/i,
    "Your listing was removed. Reason: ",
  )
}

function getNotificationDisplay(notification: NotificationItem) {
  const type = isKnownNotificationType(notification.type)
    ? notification.type
    : "SYSTEM"

  return {
    ...notificationDisplay[type],
    message: getNotificationMessage(notification),
  }
}

export function NotificationBellButton({
  variant,
}: NotificationBellButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [highlightedNotificationIds, setHighlightedNotificationIds] = useState<
    Set<string>
  >(() => new Set())
  const closeTimeoutRef = useRef<number | null>(null)
  const {
    notifications,
    unreadCount,
    setNotificationsPanelOpen,
  } = useNotifications()

  const openPanel = useCallback(() => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }

    setHighlightedNotificationIds(
      new Set(
        notifications
          .filter((notification) => !notification.isRead)
          .map((notification) => notification._id),
      ),
    )
    setNotificationsPanelOpen(true)
    setIsOpen(true)
    window.requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [notifications, setNotificationsPanelOpen])

  const closePanel = useCallback(() => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current)
    }

    setNotificationsPanelOpen(false)
    setIsVisible(false)

    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false)
      setHighlightedNotificationIds(new Set())
      closeTimeoutRef.current = null
    }, 220)
  }, [setNotificationsPanelOpen])

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  const Icon = unreadCount > 0 ? BellRing : Bell
  const label = unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        className={cn(
          "relative flex items-center justify-center text-slate-600 transition-all duration-200 ease-out hover:text-slate-950 active:scale-95",
          variant === "desktop"
            ? "h-10 w-10 rounded-full hover:bg-slate-100"
            : "flex-col gap-1 text-xs font-medium",
          isOpen && variant === "desktop" && "bg-slate-100 text-slate-950",
          isOpen && variant === "mobile" && "text-slate-950",
        )}
        onClick={() => {
          if (isVisible) {
            closePanel()
          } else {
            openPanel()
          }
        }}
      >
        <span className="relative">
          <Icon
            className={cn(
              "transition-transform duration-200 ease-out",
              variant === "desktop" ? "h-4 w-4" : "h-5 w-5",
              isVisible && "rotate-12 scale-110",
            )}
          />
          {unreadCount > 0 && (
            <span className="absolute -right-2.5 -top-2 flex h-4 min-w-4 animate-[notification-badge-pop_260ms_ease-out] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4 text-white shadow-sm ring-2 ring-white after:absolute after:inset-0 after:animate-ping after:rounded-full after:bg-rose-400 after:opacity-25">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        {variant === "mobile" && <span>Noti</span>}
      </button>

      {isOpen && (
        <NotificationPanel
          variant={variant}
          isVisible={isVisible}
          highlightedNotificationIds={highlightedNotificationIds}
          onClose={closePanel}
        />
      )}
    </>
  )
}

type NotificationPanelProps = {
  variant: "desktop" | "mobile"
  isVisible: boolean
  highlightedNotificationIds: Set<string>
  onClose: () => void
}

function NotificationPanel({
  variant,
  isVisible,
  highlightedNotificationIds,
  onClose,
}: NotificationPanelProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const {
    notifications,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useNotifications()

  return (
    <FloatingActionPanel
      variant={variant}
      isVisible={isVisible}
      title="Notifications"
      subtitle="Recent account updates"
      closeLabel="Close notifications"
      bodyRef={scrollRef}
      onClose={onClose}
    >
      {isLoading ? (
        <NotificationLoading />
      ) : notifications.length === 0 ? (
        <NotificationEmpty />
      ) : (
        <div className="divide-y divide-slate-100">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification._id}
              notification={notification}
              isHighlighted={
                !notification.isRead ||
                highlightedNotificationIds.has(notification._id)
              }
              onClose={onClose}
            />
          ))}
          <InfiniteScrollSentinel
            rootRef={scrollRef}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onFetchNextPage={fetchNextPage}
            endMessage="No more notifications"
          />
        </div>
      )}
    </FloatingActionPanel>
  )
}

function NotificationRow({
  notification,
  isHighlighted,
  onClose,
}: {
  notification: NotificationItem
  isHighlighted: boolean
  onClose: () => void
}) {
  const navigate = useNavigate()
  const isClickable = Boolean(notification.link)
  const display = getNotificationDisplay(notification)
  const Icon = display.icon

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors",
        !isHighlighted
          ? isClickable && "hover:bg-slate-50"
          : "bg-blue-50/45 hover:bg-blue-50/70",
        !isClickable && "cursor-default",
      )}
      onClick={() => {
        if (!notification.link) return

        onClose()
        navigate(notification.link)
      }}
    >
      <span
        className={cn(
          "relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          display.tone,
        )}
      >
        <Icon className="h-4 w-4" />
        {isHighlighted && (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-950">
          {notification.title}
        </span>
        <span className="mt-1 line-clamp-2 block text-sm font-medium leading-5 text-slate-600">
          {display.message}
        </span>
        <span className="mt-2 block text-xs font-semibold text-slate-400">
          {formatNotificationTime(notification.createdAt)}
        </span>
      </span>
      {isClickable && (
        <ChevronRight className="mt-5 h-4 w-4 shrink-0 text-slate-400" />
      )}
    </button>
  )
}

function NotificationLoading() {
  return (
    <div className="flex h-48 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
      <LoaderIcon className="h-4 w-4" />
      Loading notifications...
    </div>
  )
}

function NotificationEmpty() {
  return (
    <div className="flex h-64 flex-col items-center justify-center px-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Inbox className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-bold text-slate-950">
        No notifications yet
      </h3>
      <p className="mt-1 text-sm font-medium text-slate-500">
        Updates about listings, reports, and account actions will appear here.
      </p>
    </div>
  )
}
