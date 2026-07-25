import { createContext, useContext } from "react"

import type { AdminReport, AdminReportListing } from "../../api"

export type ReportReviewStatus = Exclude<
  AdminReport["status"],
  "OPEN"
>

export type ReportReviewAction = {
  report: AdminReport
  status: ReportReviewStatus
} | null

export type ReportListingDeleteAction = {
  report: AdminReport
  listing: AdminReportListing
} | null

export type ReportReviewContextValue = {
  selectedReport: AdminReport | null
  isReviewSubmitting: boolean
  isDeletingListing: boolean
  selectReport: (reportId: string | null) => void
  openReviewDialog: (report: AdminReport, status: ReportReviewStatus) => void
  openDeleteListingDialog: (
    report: AdminReport,
    listing: AdminReportListing,
  ) => void
  action: ReportReviewAction
  deleteAction: ReportListingDeleteAction
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
  closeDeleteListingDialog: () => void
  confirmReview: () => void
  confirmDeleteListing: () => void
}

export const ReportReviewContext =
  createContext<ReportReviewContextValue | null>(null)

export function useReportReview() {
  const context = useContext(ReportReviewContext)

  if (!context) {
    throw new Error("useReportReview must be used inside ReportedListingsTab")
  }

  return context
}
