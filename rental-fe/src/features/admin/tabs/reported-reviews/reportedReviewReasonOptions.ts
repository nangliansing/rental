import type { AdminReviewReportStatusFilter } from "../../api"

export const reviewReportDismissReasonOptions = [
  "Not enough evidence",
  "Not a platform violation",
  "Duplicate report",
  "Review already corrected",
  "Reporter misunderstood the review",
  "Could not verify the issue",
]

export const reviewReportActionTakenReasonOptions = [
  "Review removed",
  "Review hidden from first view",
  "Reviewer warned",
  "Lister suspended",
  "Inappropriate text corrected",
  "Escalated for further review",
]

export const reviewDeleteReasonOptions = [
  "Inappropriate language",
  "Harassment or hate",
  "False information",
  "Private information",
  "Spam or duplicate review",
  "Conflict of interest",
  "Platform policy violation",
]

export const reviewReportStatusFilters: {
  label: string
  value?: AdminReviewReportStatusFilter
}[] = [
  { label: "All" },
  { label: "Open", value: "OPEN" },
  { label: "Reviewed", value: "REVIEWED" },
  { label: "Dismissed", value: "DISMISSED" },
  { label: "Action taken", value: "ACTION_TAKEN" },
]
