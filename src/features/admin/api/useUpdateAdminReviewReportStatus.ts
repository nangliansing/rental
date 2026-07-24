import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import {
  captureStatusCache,
  findStatusItem,
  invalidateStatusCache,
  restoreStatusCache,
  updateStatusCache,
  type StatusCacheSnapshot,
} from "@/lib/status-transition-cache"

import type {
  AdminReviewReport,
  SearchAdminReviewReportsResponse,
} from "./searchAdminReviewReports"
import {
  updateAdminReviewReportStatus,
  type UpdateAdminReviewReportStatusInput,
} from "./updateAdminReviewReportStatus"

type ReviewReportSnapshot = StatusCacheSnapshot<
  AdminReviewReport,
  SearchAdminReviewReportsResponse
>

export function useUpdateAdminReviewReportStatus() {
  const queryClient = useQueryClient()

  const capture = (reviewReportId: string) =>
    captureStatusCache<AdminReviewReport, SearchAdminReviewReportsResponse>(
      queryClient,
      queryKeys.admin.reviewReports.lists,
      queryKeys.admin.reviewReports.detail(reviewReportId),
    )

  return useMutation({
    scope: { id: "update-admin-review-report-status" },
    mutationFn: (input: UpdateAdminReviewReportStatusInput) =>
      updateAdminReviewReportStatus(input),
    onMutate: async (input) => {
      const reviewReportId = input.reviewReportId.trim()
      const snapshot = await capture(reviewReportId)
      const currentReport = findStatusItem(
        snapshot.detailData,
        snapshot.listData,
        reviewReportId,
      )

      if (currentReport) {
        updateStatusCache(queryClient, snapshot, {
          ...currentReport,
          status: input.status,
          reviewNote: input.reviewNote?.trim() || null,
        })
      }

      return { snapshot }
    },
    onError: (_error, _input, context) => {
      if (context) restoreStatusCache(queryClient, context.snapshot)
    },
    onSuccess: async (report, _input, context) => {
      const snapshot: ReviewReportSnapshot =
        context?.snapshot ?? (await capture(report._id))
      updateStatusCache(queryClient, snapshot, report)
    },
    onSettled: async (report, error, input) => {
      if (error) return

      const reviewReportId = report?._id ?? input.reviewReportId.trim()
      await invalidateStatusCache(
        queryClient,
        queryKeys.admin.reviewReports.lists,
        queryKeys.admin.reviewReports.detail(reviewReportId),
      )
    },
  })
}
