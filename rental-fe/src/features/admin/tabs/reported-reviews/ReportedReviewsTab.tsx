import { useState } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import {
  getAdminReviewReportById,
  searchAdminReviewReports,
  useDeleteAdminListerReview,
  useUpdateAdminReviewReportStatus,
  type AdminReviewReport,
  type AdminReviewReportStatusFilter,
} from "../../api"
import { AdminFilterPills, AdminWorkspace } from "../../components"
import { AdminDetailState } from "../../components/AdminDetailState"
import {
  AdminEmptyState,
  AdminListState,
} from "../../components/AdminListState"
import { getNextAdminPageParam } from "../../shared/adminPagination"
import { ReviewReportDetail } from "./ReviewReportDetail"
import { ReviewReportListItem } from "./ReviewReportListItem"
import {
  ReviewReportReviewContext,
  type ReviewReportDeleteReviewAction,
  type ReviewReportReviewAction,
  type ReviewReportReviewContextValue,
  type ReviewReportReviewStatus,
} from "./ReviewReportReviewContext"
import {
  ReviewReportDeleteReviewDialog,
  ReviewReportReviewDialog,
} from "./ReviewReportReviewDialogs"
import { reviewReportStatusFilters } from "./reportedReviewReasonOptions"

export type ReportedReviewsTabProps = {
  enabled: boolean
  currentUserId?: string
  onSuspendUser: (target: { userId: string; name: string }) => void
}

export function ReportedReviewsTab({
  enabled,
  currentUserId,
  onSuspendUser,
}: ReportedReviewsTabProps) {
  const [status, setStatus] = useState<
    AdminReviewReportStatusFilter | undefined
  >("OPEN")
  const [selectedReviewReportId, setSelectedReviewReportId] = useState<
    string | null
  >(null)
  const [reviewAction, setReviewAction] =
    useState<ReviewReportReviewAction>(null)
  const [deleteAction, setDeleteAction] =
    useState<ReviewReportDeleteReviewAction>(null)
  const [selectedReviewReason, setSelectedReviewReason] = useState("")
  const [reviewNote, setReviewNote] = useState("")
  const [deleteReason, setDeleteReason] = useState("")
  const [deleteNote, setDeleteNote] = useState("")
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const reviewReportsQuery = useInfiniteQuery({
    queryKey: queryKeys.admin.reviewReports.list(status),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchAdminReviewReports({
        status,
        page: Number(pageParam),
        limit: 20,
      }),
    getNextPageParam: getNextAdminPageParam,
    enabled,
  })

  const updateReviewReportStatusMutation = useUpdateAdminReviewReportStatus()
  const deleteReviewReportReviewMutation =
    useDeleteAdminListerReview(currentUserId)
  const isReviewSubmitting = updateReviewReportStatusMutation.isPending
  const isDeletingReview = deleteReviewReportReviewMutation.isPending

  const reviewReports =
    reviewReportsQuery.data?.pages.flatMap((page) => page.data) ?? []
  const pagination = reviewReportsQuery.data?.pages[0]?.pagination
  const selectedReviewReportListItem =
    reviewReports.find((report) => report._id === selectedReviewReportId) ??
    reviewReports[0] ??
    null
  const effectiveReviewReportId =
    selectedReviewReportId ?? selectedReviewReportListItem?._id

  const reviewReportDetailQuery = useQuery({
    queryKey: queryKeys.admin.reviewReports.detail(effectiveReviewReportId),
    queryFn: () => getAdminReviewReportById(effectiveReviewReportId!),
    enabled: enabled && Boolean(effectiveReviewReportId),
    retry: (failureCount, error) =>
      error instanceof ApiError && error.status < 500
        ? false
        : failureCount < 2,
  })

  const selectedReviewReport =
    reviewReportDetailQuery.data ?? selectedReviewReportListItem ?? null

  const closeReviewDialog = () => {
    setReviewAction(null)
    setSelectedReviewReason("")
    setReviewNote("")
    setReviewError(null)
  }

  const closeDeleteReviewDialog = () => {
    setDeleteAction(null)
    setDeleteReason("")
    setDeleteNote("")
    setDeleteError(null)
  }

  const handleOpenReviewDialog = (
    report: AdminReviewReport,
    nextStatus: ReviewReportReviewStatus,
  ) => {
    setReviewAction({ report, status: nextStatus })
    setSelectedReviewReason("")
    setReviewNote("")
    setReviewError(null)
  }

  const handleOpenDeleteReviewDialog = (report: AdminReviewReport) => {
    setDeleteAction(report)
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

    updateReviewReportStatusMutation.mutate(
      {
        reviewReportId: reviewAction.report._id,
        status: reviewAction.status,
        reviewNote: reviewNoteForSubmission,
      },
      {
        onSuccess: closeReviewDialog,
        onError: (error) => {
          setReviewError(
            error instanceof Error
              ? error.message
              : "Could not update review report status.",
          )
        },
      },
    )
  }

  const handleConfirmDeleteReview = () => {
    if (!deleteAction || isDeletingReview) return

    const review = deleteAction.review

    if (!review || review.isDeleted) {
      setDeleteError("This review is no longer available.")
      return
    }

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

    const listerProfileId =
      deleteAction.listerProfile?._id ?? review.listerProfileId

    deleteReviewReportReviewMutation.mutate(
      {
        reviewId: review._id,
        reviewReportId: deleteAction._id,
        listerProfileId,
        listerUserId: deleteAction.listerProfile?.userId ?? undefined,
        reason: mergedDeleteReason,
      },
      {
        onSuccess: closeDeleteReviewDialog,
        onError: (error) => {
          setDeleteError(
            error instanceof Error ? error.message : "Could not delete review.",
          )
        },
      },
    )
  }

  const reviewReportReviewContextValue: ReviewReportReviewContextValue = {
    selectedReviewReport,
    isReviewSubmitting,
    isDeletingReview,
    selectReviewReport: setSelectedReviewReportId,
    openReviewDialog: handleOpenReviewDialog,
    openDeleteReviewDialog: handleOpenDeleteReviewDialog,
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
    closeDeleteReviewDialog,
    confirmReview: handleConfirmReview,
    confirmDeleteReview: handleConfirmDeleteReview,
  }

  return (
    <ReviewReportReviewContext.Provider value={reviewReportReviewContextValue}>
      <AdminWorkspace
        title="Reported reviews"
        description="Review feedback reports from profiles."
        total={pagination?.total}
        filters={
          <AdminFilterPills
            options={reviewReportStatusFilters}
            value={status}
            scrollable
            onChange={(nextStatus) => {
              setStatus(nextStatus)
              setSelectedReviewReportId(null)
            }}
          />
        }
        list={
          <AdminListState
            isLoading={reviewReportsQuery.isLoading}
            error={reviewReportsQuery.error}
            errorFallback="Could not load reported reviews."
            isEmpty={reviewReports.length === 0}
            emptyTitle="No review reports"
            emptyDescription="Reported reviews will appear here when users flag profile feedback."
            onRetry={() => void reviewReportsQuery.refetch()}
            hasNextPage={Boolean(reviewReportsQuery.hasNextPage)}
            isFetchingNextPage={reviewReportsQuery.isFetchingNextPage}
            onFetchNextPage={() => void reviewReportsQuery.fetchNextPage()}
          >
            {reviewReports.map((report) => (
              <ReviewReportListItem key={report._id} report={report} />
            ))}
          </AdminListState>
        }
        detail={
          <AdminDetailState
            isLoading={reviewReportDetailQuery.isLoading}
            shouldShowLoading={Boolean(effectiveReviewReportId)}
            error={reviewReportDetailQuery.error}
            errorFallback="Could not load this review report."
            onRetry={() => void reviewReportDetailQuery.refetch()}
          >
            {selectedReviewReport ? (
              <ReviewReportDetail
                report={selectedReviewReport}
                onSuspendUser={onSuspendUser}
              />
            ) : (
              <AdminEmptyState
                title="Select a review report"
                description="Choose a reported review from the left to inspect the details."
              />
            )}
          </AdminDetailState>
        }
      />

      <ReviewReportReviewDialog />
      <ReviewReportDeleteReviewDialog />
    </ReviewReportReviewContext.Provider>
  )
}
