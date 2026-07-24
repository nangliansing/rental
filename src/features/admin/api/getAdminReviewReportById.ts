import { apiClient } from "@/lib/api-client"

import type { AdminReviewReport } from "./searchAdminReviewReports"

export type GetAdminReviewReportByIdResponse = {
  success: true
  data: AdminReviewReport
}

export async function getAdminReviewReportById(reviewReportId: string) {
  const response = await apiClient.get<GetAdminReviewReportByIdResponse>(
    `/admin/review-reports/${encodeURIComponent(reviewReportId)}`,
  )

  return response.data.data
}
