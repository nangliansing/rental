import type { AdminReviewReport } from "../../api"

export function getReviewReportReasonLabel(reason: AdminReviewReport["reason"]) {
  const labels: Record<AdminReviewReport["reason"], string> = {
    INAPPROPRIATE_LANGUAGE: "Inappropriate language",
    HARASSMENT_OR_HATE: "Harassment or hate",
    FALSE_INFORMATION: "False information",
    SPAM: "Spam",
    PRIVATE_INFORMATION: "Private information",
    CONFLICT_OF_INTEREST: "Conflict of interest",
    OTHER: "Other",
  }

  return labels[reason] ?? reason
}

export function getReviewReportReporterName(report: AdminReviewReport) {
  return report.reportedBy?.name ?? report.reportedBy?.email ?? "Reporter"
}

export function getReviewReportReviewOwnerName(report: AdminReviewReport) {
  return report.reviewOwner?.name ?? report.reviewOwner?.email ?? "Reviewer"
}

export function getReviewReportListerName(report: AdminReviewReport) {
  return report.listerProfile?.displayName ?? "Lister"
}

export function getReviewRemovedByName(report: AdminReviewReport) {
  const removedBy = report.review?.moderation?.removedBy

  if (!removedBy) return "Not recorded"

  const knownAdmin = [report.actionTakenBy, report.reviewedBy].find(
    (admin) => admin?._id === removedBy,
  )

  return knownAdmin?.name ?? knownAdmin?.email ?? "Admin user"
}

export function formatReviewTagLabel(tag: string) {
  return tag
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
