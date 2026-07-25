import { ApiError, apiClient } from "@/lib/api-client"

import type {
  AdminReviewReport,
  AdminReviewReportStatusFilter,
} from "./searchAdminReviewReports"

export type UpdateAdminReviewReportStatusInput = {
  reviewReportId: string
  status: Exclude<AdminReviewReportStatusFilter, "OPEN">
  reviewNote?: string
}

type UpdateAdminReviewReportStatusResponse = {
  success: true
  data: AdminReviewReport
}

const validStatuses = new Set(["REVIEWED", "DISMISSED", "ACTION_TAKEN"])

function parseUpdateAdminReviewReportStatusResponse(
  value: unknown,
): AdminReviewReport {
  const response =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null
  const data =
    typeof response?.data === "object" &&
    response.data !== null &&
    !Array.isArray(response.data)
      ? (response.data as Record<string, unknown>)
      : null

  if (
    response?.success !== true ||
    !data ||
    typeof data._id !== "string" ||
    typeof data.status !== "string" ||
    !validStatuses.has(data.status)
  ) {
    throw new ApiError(
      "Review report status response is missing required data.",
      500,
      "INVALID_ADMIN_REVIEW_REPORT_RESPONSE",
    )
  }

  return data as AdminReviewReport
}

export async function updateAdminReviewReportStatus({
  reviewReportId,
  status,
  reviewNote,
}: UpdateAdminReviewReportStatusInput) {
  const normalizedReviewReportId = reviewReportId.trim()

  if (!normalizedReviewReportId) {
    throw new ApiError(
      "Review report id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }
  if (!validStatuses.has(status)) {
    throw new ApiError(
      "Review report status is invalid.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.patch<UpdateAdminReviewReportStatusResponse>(
    `/admin/review-reports/${encodeURIComponent(normalizedReviewReportId)}/status`,
    {
      status,
      reviewNote: reviewNote?.trim() || undefined,
    },
  )

  return parseUpdateAdminReviewReportStatusResponse(response.data)
}
