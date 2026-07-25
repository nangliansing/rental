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
  AdminReport,
  SearchAdminReportsResponse,
} from "./searchAdminReports"
import {
  updateAdminReportStatus,
  type UpdateAdminReportStatusInput,
} from "./updateAdminReportStatus"

type ReportSnapshot = StatusCacheSnapshot<
  AdminReport,
  SearchAdminReportsResponse
>

export function useUpdateAdminReportStatus() {
  const queryClient = useQueryClient()

  const capture = (reportId: string) =>
    captureStatusCache<AdminReport, SearchAdminReportsResponse>(
      queryClient,
      queryKeys.admin.reports.lists,
      queryKeys.admin.reports.detail(reportId),
    )

  return useMutation({
    scope: { id: "update-admin-report-status" },
    mutationFn: (input: UpdateAdminReportStatusInput) =>
      updateAdminReportStatus(input),
    onMutate: async (input) => {
      const reportId = input.reportId.trim()
      const snapshot = await capture(reportId)
      const currentReport = findStatusItem(
        snapshot.detailData,
        snapshot.listData,
        reportId,
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
      const snapshot: ReportSnapshot = context?.snapshot ?? (await capture(report._id))
      updateStatusCache(queryClient, snapshot, report)
    },
    onSettled: async (report, error, input) => {
      if (error) return

      const reportId = report?._id ?? input.reportId.trim()
      await invalidateStatusCache(
        queryClient,
        queryKeys.admin.reports.lists,
        queryKeys.admin.reports.detail(reportId),
      )
    },
  })
}
