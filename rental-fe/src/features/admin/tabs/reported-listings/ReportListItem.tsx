import { Flag } from "lucide-react"

import {
  AdminReviewListItem,
} from "../../components"
import type { AdminReport } from "../../api"
import {
  formatCompactBaht,
  formatDate,
} from "../../shared/adminFormatters"
import {
  getReportCoverImage,
  getReportListingTitle,
  getReportReasonLabel,
  getReportReporterName,
} from "./reportedListingDisplayUtils"
import { useReportReview } from "./ReportReviewContext"

export function ReportListItem({ report }: { report: AdminReport }) {
  const { selectedReport, selectReport } = useReportReview()
  const coverImage = getReportCoverImage(report)

  return (
    <AdminReviewListItem
      title={getReportReasonLabel(report.reason)}
      meta={[
        `${getReportListingTitle(report)}${
          report.listing ? ` · ${formatCompactBaht(report.listing.rent)}` : ""
        }`,
        `By ${getReportReporterName(report)}`,
      ]}
      createdAt={formatDate(report.createdAt)}
      isSelected={selectedReport?._id === report._id}
      onSelect={() => selectReport(report._id)}
      image={coverImage}
      imageAlt={coverImage?.alt ?? getReportListingTitle(report)}
      imageFallback={<Flag className="h-6 w-6" />}
      status={report.status}
      imageSize="sm"
    />
  )
}
