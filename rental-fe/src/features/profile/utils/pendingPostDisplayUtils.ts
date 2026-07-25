import {
  CheckCircle2,
  Clock3,
  FileX2,
  XCircle,
} from "lucide-react"
import type { ComponentType } from "react"

import type { PendingPost } from "@/features/pending-post"

import { MAP_SEARCH_LIST_ROOM_PATH } from "@/features/map-search/constants"

export type PendingPostStatusStyle = {
  label: string
  icon: ComponentType<{ className?: string }>
  className: string
}

const STATUS_STYLES: Record<PendingPost["status"], PendingPostStatusStyle> = {
  PENDING: {
    label: "Pending",
    icon: Clock3,
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-rose-50 text-rose-700 ring-rose-100",
  },
  CANCELED: {
    label: "Canceled",
    icon: FileX2,
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  },
}

const DEFAULT_STATUS_STYLE: PendingPostStatusStyle = {
  label: "Unknown",
  icon: Clock3,
  className: "bg-slate-100 text-slate-600 ring-slate-200",
}

export function getPendingPostStatusStyle(
  status: PendingPost["status"] | string | null | undefined,
): PendingPostStatusStyle {
  if (status && status in STATUS_STYLES) {
    return STATUS_STYLES[status as PendingPost["status"]]
  }

  return DEFAULT_STATUS_STYLE
}

export function getPendingPostBuildingName(post: PendingPost) {
  return post.existingBuilding?.name ?? post.building?.name ?? "New building"
}

export function getPendingPostSubmissionType(post: PendingPost) {
  return post.existingBuildingId ? "Existing building" : "New building"
}

export function formatPendingPostSubmittedAt(value: string | null | undefined) {
  if (!value) return "recently"

  const submittedAt = new Date(value)

  if (Number.isNaN(submittedAt.getTime())) return "recently"

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(submittedAt)
}

export const PENDING_EMPTY_COPY = {
  all: {
    title: "No submissions yet",
    description:
      "Submitted rooms appear here while they wait for review. Start from the map to create your first submission.",
    action: {
      label: "Submit your first listing",
      href: MAP_SEARCH_LIST_ROOM_PATH,
    },
  },
  pending: {
    title: "No pending listings",
    description:
      "Rooms waiting for review will appear here after you submit them from the map.",
    action: {
      label: "Start listing",
      href: MAP_SEARCH_LIST_ROOM_PATH,
    },
  },
  approved: {
    title: "No approved submissions",
    description: "Approved listing submissions will appear here.",
  },
  rejected: {
    title: "No rejected submissions",
    description: "Rejected listing submissions will appear here.",
  },
} as const

export const OWNER_PENDING_STATUS_BY_PROFILE_FILTER = {
  all: "all",
  pending: "PENDING",
  approved: "APPROVED",
  rejected: "REJECTED",
} as const
