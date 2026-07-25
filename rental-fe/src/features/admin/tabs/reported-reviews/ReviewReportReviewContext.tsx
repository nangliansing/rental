import { createContext, useContext } from "react"

import type { AdminReviewReport } from "../../api"

export type ReviewReportReviewStatus = Exclude<
  AdminReviewReport["status"],
  "OPEN"
>

export type ReviewReportReviewAction = {
  report: AdminReviewReport
  status: ReviewReportReviewStatus
} | null

export type ReviewReportDeleteReviewAction = AdminReviewReport | null

export type ReviewReportReviewContextValue = {
  selectedReviewReport: AdminReviewReport | null
  isReviewSubmitting: boolean
  isDeletingReview: boolean
  selectReviewReport: (reviewReportId: string | null) => void
  openReviewDialog: (
    report: AdminReviewReport,
    status: ReviewReportReviewStatus,
  ) => void
  openDeleteReviewDialog: (report: AdminReviewReport) => void
  action: ReviewReportReviewAction
  deleteAction: ReviewReportDeleteReviewAction
  selectedReviewReason: string
  reviewNote: string
  deleteReason: string
  deleteNote: string
  error: string | null
  deleteError: string | null
  setSelectedReviewReason: (value: string) => void
  setReviewNote: (value: string) => void
  setDeleteReason: (value: string) => void
  setDeleteNote: (value: string) => void
  closeDialog: () => void
  closeDeleteReviewDialog: () => void
  confirmReview: () => void
  confirmDeleteReview: () => void
}

export const ReviewReportReviewContext =
  createContext<ReviewReportReviewContextValue | null>(null)

export function useReviewReportReview() {
  const context = useContext(ReviewReportReviewContext)

  if (!context) {
    throw new Error(
      "useReviewReportReview must be used inside ReportedReviewsTab",
    )
  }

  return context
}
