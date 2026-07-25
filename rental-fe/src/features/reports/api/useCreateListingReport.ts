import { queryKeys } from "@/lib/query-keys"
import { useCreateModerationRecord } from "@/lib/use-create-moderation-record"

import {
  createReport,
  type CreateReportInput,
  type Report,
} from "./createReport"

export function useCreateListingReport() {
  return useCreateModerationRecord<Report, CreateReportInput>({
    scopeId: "create-listing-report",
    queryKey: queryKeys.admin.reports.lists,
    mutationFn: createReport,
  })
}
