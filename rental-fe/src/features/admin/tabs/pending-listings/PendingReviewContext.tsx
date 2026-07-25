import { createContext, useContext } from "react"

import type { AdminPendingPost } from "../../api"

export type PendingReviewAction = {
  type: "approve" | "reject"
  post: AdminPendingPost
} | null

export type PendingReviewContextValue = {
  selectedPost: AdminPendingPost | null
  isReviewSubmitting: boolean
  selectPost: (postId: string | null) => void
  openApproveDialog: (post: AdminPendingPost) => void
  openRejectDialog: (post: AdminPendingPost) => void
  action: PendingReviewAction
  selectedRejectReason: string
  reviewNote: string
  error: string | null
  setSelectedRejectReason: (value: string) => void
  setReviewNote: (value: string) => void
  closeDialog: () => void
  confirmAction: () => void
}

export const PendingReviewContext =
  createContext<PendingReviewContextValue | null>(null)

export function usePendingReview() {
  const context = useContext(PendingReviewContext)

  if (!context) {
    throw new Error("usePendingReview must be used inside PendingListingsTab")
  }

  return context
}
