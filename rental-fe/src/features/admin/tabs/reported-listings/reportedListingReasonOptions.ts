import type { AdminReportStatusFilter } from "../../api"

export const reportDismissReasonOptions = [
  "Not enough evidence",
  "Not a platform violation",
  "Duplicate report",
  "Listing already corrected",
  "Reporter misunderstood the listing",
  "Could not verify the issue",
]

export const reportActionTakenReasonOptions = [
  "Listing removed",
  "Lister suspended",
  "Warning issued to lister",
  "Listing content corrected",
  "Photos removed or replaced",
  "Escalated for further review",
]

export const listingDeleteReasonOptions = [
  "Fake or misleading listing",
  "Inappropriate photos or content",
  "Photos used without permission",
  "Unsafe, hateful, or abusive content",
  "Duplicate or spam listing",
  "Report confirmed after review",
]

export const reportStatusFilters: {
  label: string
  value?: AdminReportStatusFilter
}[] = [
  { label: "All" },
  { label: "Open", value: "OPEN" },
  { label: "Reviewed", value: "REVIEWED" },
  { label: "Dismissed", value: "DISMISSED" },
  { label: "Action taken", value: "ACTION_TAKEN" },
]
