import { apiClient } from "@/lib/api-client"

import { parseAdminReport, type AdminReport } from "./searchAdminReports"

export type GetAdminReportByIdResponse = {
  success: true
  data: AdminReport
}

export async function getAdminReportById(reportId: string) {
  const response = await apiClient.get<GetAdminReportByIdResponse>(
    `/admin/reports/${encodeURIComponent(reportId)}`,
  )

  return parseAdminReport(response.data.data)
}
