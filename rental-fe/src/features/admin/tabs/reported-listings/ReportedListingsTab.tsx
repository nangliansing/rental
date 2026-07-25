import { useState } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import {
  getAdminReportById,
  searchAdminReports,
  useDeleteAdminListing,
  useUpdateAdminReportStatus,
  type AdminReport,
  type AdminReportListing,
  type AdminReportStatusFilter,
} from "../../api"
import { AdminFilterPills, AdminWorkspace } from "../../components"
import { AdminDetailState } from "../../components/AdminDetailState"
import {
  AdminEmptyState,
  AdminListState,
} from "../../components/AdminListState"
import { getNextAdminPageParam } from "../../shared/adminPagination"
import { ReportDetail } from "./ReportDetail"
import { ReportListItem } from "./ReportListItem"
import {
  ReportReviewContext,
  type ReportListingDeleteAction,
  type ReportReviewAction,
  type ReportReviewContextValue,
  type ReportReviewStatus,
} from "./ReportReviewContext"
import {
  ReportListingDeleteDialog,
  ReportReviewDialog,
} from "./ReportReviewDialogs"
import { reportStatusFilters } from "./reportedListingReasonOptions"

export type ReportedListingsTabProps = {
  enabled: boolean
  currentUserId?: string
  onSuspendUser: (target: { userId: string; name: string }) => void
}

export function ReportedListingsTab({
  enabled,
  currentUserId,
  onSuspendUser,
}: ReportedListingsTabProps) {
  const [status, setStatus] = useState<AdminReportStatusFilter | undefined>(
    "OPEN",
  )
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [reviewAction, setReviewAction] = useState<ReportReviewAction>(null)
  const [deleteAction, setDeleteAction] =
    useState<ReportListingDeleteAction>(null)
  const [selectedReviewReason, setSelectedReviewReason] = useState("")
  const [reviewNote, setReviewNote] = useState("")
  const [deleteReason, setDeleteReason] = useState("")
  const [deleteNote, setDeleteNote] = useState("")
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const reportsQuery = useInfiniteQuery({
    queryKey: queryKeys.admin.reports.list(status),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchAdminReports({
        status,
        page: Number(pageParam),
        limit: 20,
      }),
    getNextPageParam: getNextAdminPageParam,
    enabled,
  })

  const updateReportStatusMutation = useUpdateAdminReportStatus()
  const deleteReportListingMutation = useDeleteAdminListing(currentUserId)
  const isReviewSubmitting = updateReportStatusMutation.isPending
  const isDeletingListing = deleteReportListingMutation.isPending

  const reports = reportsQuery.data?.pages.flatMap((page) => page.data) ?? []
  const pagination = reportsQuery.data?.pages[0]?.pagination
  const selectedReportListItem =
    reports.find((report) => report._id === selectedReportId) ??
    reports[0] ??
    null
  const effectiveReportId = selectedReportId ?? selectedReportListItem?._id

  const reportDetailQuery = useQuery({
    queryKey: queryKeys.admin.reports.detail(effectiveReportId),
    queryFn: () => getAdminReportById(effectiveReportId!),
    enabled: enabled && Boolean(effectiveReportId),
  })

  const selectedReport =
    reportDetailQuery.data ?? selectedReportListItem ?? null

  const closeReviewDialog = () => {
    setReviewAction(null)
    setSelectedReviewReason("")
    setReviewNote("")
    setReviewError(null)
  }

  const closeDeleteListingDialog = () => {
    setDeleteAction(null)
    setDeleteReason("")
    setDeleteNote("")
    setDeleteError(null)
  }

  const handleOpenReviewDialog = (
    report: AdminReport,
    nextStatus: ReportReviewStatus,
  ) => {
    setReviewAction({ report, status: nextStatus })
    setSelectedReviewReason("")
    setReviewNote("")
    setReviewError(null)
  }

  const handleOpenDeleteListingDialog = (
    report: AdminReport,
    listing: AdminReportListing,
  ) => {
    setDeleteAction({ report, listing })
    setDeleteReason("")
    setDeleteNote("")
    setDeleteError(null)
  }

  const handleConfirmReview = () => {
    if (!reviewAction || isReviewSubmitting) return

    const trimmedReviewReason = selectedReviewReason.trim()
    const trimmedReviewNote = reviewNote.trim()
    const requiresNote =
      reviewAction.status === "DISMISSED" ||
      reviewAction.status === "ACTION_TAKEN"

    if (requiresNote && !trimmedReviewReason && !trimmedReviewNote) {
      setReviewError("Review note is required.")
      return
    }

    const reviewNoteForSubmission = trimmedReviewReason
      ? [trimmedReviewReason, trimmedReviewNote && `Note: ${trimmedReviewNote}`]
          .filter(Boolean)
          .join("\n\n")
      : trimmedReviewNote

    updateReportStatusMutation.mutate(
      {
        reportId: reviewAction.report._id,
        status: reviewAction.status,
        reviewNote: reviewNoteForSubmission,
      },
      {
        onSuccess: closeReviewDialog,
        onError: (error) => {
          setReviewError(
            error instanceof Error
              ? error.message
              : "Could not update report status.",
          )
        },
      },
    )
  }

  const handleConfirmDeleteListing = () => {
    if (!deleteAction || isDeletingListing) return

    const trimmedReason = deleteReason.trim()
    const trimmedNote = deleteNote.trim()

    if (!trimmedReason && !trimmedNote) {
      setDeleteError("Deletion reason is required.")
      return
    }

    const mergedDeleteReason = trimmedReason
      ? [trimmedReason, trimmedNote && `Note: ${trimmedNote}`]
          .filter(Boolean)
          .join("\n\n")
      : trimmedNote

    const { listing, report } = deleteAction
    deleteReportListingMutation.mutate(
      {
        listingId: listing._id,
        reportId: report._id,
        agentProfileId: report.listingAgentProfile?._id,
        listingOwnerUserId: report.listingOwner?._id,
        buildingId: listing.buildingId,
        reason: mergedDeleteReason,
      },
      {
        onSuccess: closeDeleteListingDialog,
        onError: (error) => {
          setDeleteError(
            error instanceof Error ? error.message : "Could not delete listing.",
          )
        },
      },
    )
  }

  const reportReviewContextValue: ReportReviewContextValue = {
    selectedReport,
    isReviewSubmitting,
    isDeletingListing,
    selectReport: setSelectedReportId,
    openReviewDialog: handleOpenReviewDialog,
    openDeleteListingDialog: handleOpenDeleteListingDialog,
    action: reviewAction,
    deleteAction,
    selectedReviewReason,
    reviewNote,
    deleteReason,
    deleteNote,
    error: reviewError,
    deleteError,
    setSelectedReviewReason: (value) => {
      setSelectedReviewReason(value)
      if (reviewError) setReviewError(null)
    },
    setReviewNote: (value) => {
      setReviewNote(value)
      if (reviewError) setReviewError(null)
    },
    setDeleteReason: (value) => {
      setDeleteReason(value)
      if (deleteError) setDeleteError(null)
    },
    setDeleteNote: (value) => {
      setDeleteNote(value)
      if (deleteError) setDeleteError(null)
    },
    closeDialog: closeReviewDialog,
    closeDeleteListingDialog,
    confirmReview: handleConfirmReview,
    confirmDeleteListing: handleConfirmDeleteListing,
  }

  return (
    <ReportReviewContext.Provider value={reportReviewContextValue}>
      <AdminWorkspace
        title="Reported listings"
        description="Review listing reports from renters and listers."
        total={pagination?.total}
        filters={
          <AdminFilterPills
            options={reportStatusFilters}
            value={status}
            scrollable
            onChange={(nextStatus) => {
              setStatus(nextStatus)
              setSelectedReportId(null)
            }}
          />
        }
        list={
          <AdminListState
            isLoading={reportsQuery.isLoading}
            error={reportsQuery.error}
            errorFallback="Could not load reported listings."
            isEmpty={reports.length === 0}
            emptyTitle="No reports"
            emptyDescription="Reported listings will appear here when users flag them."
            onRetry={() => void reportsQuery.refetch()}
            hasNextPage={Boolean(reportsQuery.hasNextPage)}
            isFetchingNextPage={reportsQuery.isFetchingNextPage}
            onFetchNextPage={() => void reportsQuery.fetchNextPage()}
          >
            {reports.map((report) => (
              <ReportListItem key={report._id} report={report} />
            ))}
          </AdminListState>
        }
        detail={
          <AdminDetailState
            isLoading={reportDetailQuery.isLoading}
            shouldShowLoading={Boolean(effectiveReportId)}
            error={reportDetailQuery.error}
            errorFallback="Could not load this report."
            onRetry={() => void reportDetailQuery.refetch()}
          >
            {selectedReport ? (
              <ReportDetail
                report={selectedReport}
                onSuspendUser={onSuspendUser}
              />
            ) : (
              <AdminEmptyState
                title="Select a report"
                description="Choose a reported listing from the left to inspect the details."
              />
            )}
          </AdminDetailState>
        }
      />

      <ReportReviewDialog />
      <ReportListingDeleteDialog />
    </ReportReviewContext.Provider>
  )
}
