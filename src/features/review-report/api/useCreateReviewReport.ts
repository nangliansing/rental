import { queryKeys } from "@/lib/query-keys"
import { useCreateModerationRecord } from "@/lib/use-create-moderation-record"

import {
  createReviewReport,
  type CreateReviewReportInput,
  type ReviewReport,
} from "./createReviewReport"

export function useCreateReviewReport() {
  return useCreateModerationRecord<ReviewReport, CreateReviewReportInput>({
    scopeId: "create-review-report",
    queryKey: queryKeys.admin.reviewReports.lists,
    mutationFn: createReviewReport,
  })
}
