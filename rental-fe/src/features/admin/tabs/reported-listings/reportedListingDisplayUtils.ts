import type { AdminReport } from "../../api"

export function getReportReasonLabel(reason: AdminReport["reason"]) {
  const labels: Record<AdminReport["reason"], string> = {
    WRONG_PRICE: "Wrong price",
    UNAVAILABLE: "Room unavailable",
    MISLEADING_PHOTOS: "Misleading photos",
    WRONG_BUILDING_OR_LOCATION: "Wrong building or location",
    SUSPICIOUS_CONTACT: "Suspicious contact",
    UNRESPONSIVE_LISTER: "Lister is unresponsive",
    FAKE_OR_SUSPICIOUS_LISTER: "Fake or suspicious lister",
    DUPLICATE_LISTING: "Duplicate listing",
    INAPPROPRIATE_CONTENT: "Inappropriate content",
    UNAUTHORIZED_PHOTOS: "Photos used without permission",
    HATE_OR_HARASSMENT: "Hate or harassment",
    OTHER: "Other",
  }

  return labels[reason] ?? reason
}

export function getReportCoverImage(report: AdminReport) {
  return (
    report.listing?.media.find((media) => media.isCover) ??
    report.listing?.media[0]
  )
}

export function getReportListingTitle(report: AdminReport) {
  return report.building?.name ?? "Reported listing"
}

export function getReportReporterName(report: AdminReport) {
  return report.reportedBy?.name ?? "Reporter"
}

export function getReportListerName(report: AdminReport) {
  return (
    report.listingAgentProfile?.displayName ??
    report.listingOwner?.name ??
    "Lister"
  )
}
