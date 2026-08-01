export type NotificationType =
  | "PENDING_LISTING_APPROVED"
  | "PENDING_LISTING_REJECTED"
  | "LISTING_DELETED"
  | "LISTING_VISIBILITY_CHANGED"
  | "BUILDING_EDIT_APPROVED"
  | "BUILDING_EDIT_REJECTED"
  | "REPORT_REVIEWED"
  | "REPORT_DISMISSED"
  | "REPORT_ACTION_TAKEN"
  | "USER_SUSPENDED"
  | "SUSPENSION_LIFTED"
  | "ADMIN_ROLE_REMOVED"
  | "SAVED_LISTING_PRICE_CHANGED"
  | "SAVED_LISTING_BECAME_UNAVAILABLE"
  | "SAVED_LISTING_AVAILABLE_AGAIN"
  | "FOLLOWED_BUILDING_PRICE_DROPPED"
  | "FOLLOWED_BUILDING_NEW_LISTING"
  | "FOLLOWED_BUILDING_AVAILABLE_AGAIN"
  | "REVIEW_RECEIVED"
  | "REVIEW_REPLY_RECEIVED"
  | "REVIEW_REMOVED"
  | "SYSTEM"

export type NotificationEntityType =
  | "LISTING"
  | "PENDING_LISTING"
  | "BUILDING"
  | "BUILDING_EDIT_REQUEST"
  | "REPORT"
  | "SUSPENSION"
  | "USER"
  | "AGENT_PROFILE"
  | "REVIEW"
  | "SAVED_LISTING"
  | "SYSTEM"

export type NotificationItem = {
  _id: string
  recipient: string
  actor: string | null
  type: NotificationType | (string & {})
  title: string
  message: string
  entityType: NotificationEntityType
  entityId: string | null
  link: string | null
  metadata: Record<string, unknown>
  isRead: boolean
  readAt: string | null
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export type NotificationConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
