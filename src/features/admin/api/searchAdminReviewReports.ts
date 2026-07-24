import { apiClient } from "@/lib/api-client"

import type { AuthUser } from "@/features/auth/types"
import type { ListerReview } from "@/features/lister-review/api"
import type {
  ReviewReport,
  ReviewReportStatus,
} from "@/features/review-report"
import type { ListerReviewSummary } from "@/features/lister-review/api"
import type { UploadedMedia } from "@/features/uploads"

export type AdminReviewReportStatusFilter = ReviewReportStatus

export type AdminReviewReportUser = Pick<
  AuthUser,
  "_id" | "name" | "email" | "role" | "status"
>

export type AdminReviewReportListerProfile = {
  _id: string
  userId: string
  displayName: string | null
  profilePhoto: UploadedMedia | null
  supportLanguages: string[]
  isOnline: boolean
  isDeleted: boolean
  isVerified: boolean
  reviewSummary: ListerReviewSummary
}

export type AdminReviewReport = Omit<
  ReviewReport,
  "reportedBy" | "reviewedBy" | "actionTakenBy"
> & {
  reportedBy?: AdminReviewReportUser | null
  reviewOwner?: AdminReviewReportUser | null
  reviewedBy?: AdminReviewReportUser | null
  actionTakenBy?: AdminReviewReportUser | null
  listerProfile?: AdminReviewReportListerProfile | null
  review?: ListerReview | null
}

export type AdminReviewReportsPagination = {
  page: number
  limit: number
  total: number
}

export type SearchAdminReviewReportsInput = {
  status?: AdminReviewReportStatusFilter
  page?: number
  limit?: number
}

export type SearchAdminReviewReportsResponse = {
  success: true
  data: AdminReviewReport[]
  pagination: AdminReviewReportsPagination
}

export async function searchAdminReviewReports({
  status,
  page = 1,
  limit = 20,
}: SearchAdminReviewReportsInput = {}) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })

  if (status) {
    searchParams.set("status", status)
  }

  const response = await apiClient.get<SearchAdminReviewReportsResponse>(
    `/admin/review-reports?${searchParams.toString()}`,
  )

  return response.data
}
