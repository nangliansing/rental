import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseAdminReport,
  type AdminReport,
  type AdminReportStatusFilter,
} from "./searchAdminReports"

export type UpdateAdminReportStatusInput = {
  reportId: string
  status: Exclude<AdminReportStatusFilter, "OPEN">
  reviewNote?: string
}

type UpdateAdminReportStatusResponse = {
  success: true
  data: AdminReport
}

export async function updateAdminReportStatus({
  reportId,
  status,
  reviewNote,
}: UpdateAdminReportStatusInput) {
  const normalizedReportId = reportId.trim()
  const validStatuses = new Set(["REVIEWED", "DISMISSED", "ACTION_TAKEN"])

  if (!normalizedReportId) {
    throw new ApiError("Report id is required.", 422, "VALIDATION_ERROR")
  }
  if (!validStatuses.has(status)) {
    throw new ApiError("Report status is invalid.", 422, "VALIDATION_ERROR")
  }

  const response = await apiClient.patch<UpdateAdminReportStatusResponse>(
    `/admin/reports/${encodeURIComponent(normalizedReportId)}/status`,
    {
      status,
      reviewNote: reviewNote?.trim() || undefined,
    },
  )

  return parseAdminReport(response.data.data)
}
