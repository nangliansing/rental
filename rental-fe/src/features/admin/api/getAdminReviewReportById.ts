import { apiClient } from "@/lib/api-client"

import type { AdminReviewReport } from "./searchAdminReviewReports"

export type GetAdminReviewReportByIdResponse = {
  success: true
  data: AdminReviewReport
}

export async function getAdminReviewReportById(
  reviewReportId: string,
  signal?: AbortSignal,
) {
  const response = await apiClient.get<GetAdminReviewReportByIdResponse>(
    `/admin/review-reports/${encodeURIComponent(reviewReportId)}`,
    { signal },
  )

  return response.data.data
}
