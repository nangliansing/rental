import { MessageSquareWarning } from "lucide-react"

import { AdminReviewListItem } from "../../components"
import type { AdminReviewReport } from "../../api"
import { formatDate } from "../../shared/adminFormatters"
import {
  getReviewReportListerName,
  getReviewReportReasonLabel,
  getReviewReportReporterName,
  getReviewReportReviewOwnerName,
} from "./reportedReviewDisplayUtils"
import { useReviewReportReview } from "./ReviewReportReviewContext"

export function ReviewReportListItem({
  report,
}: {
  report: AdminReviewReport
}) {
  const { selectedReviewReport, selectReviewReport } = useReviewReportReview()
  const meta = [
    `Review by ${getReviewReportReviewOwnerName(report)}`,
    `For ${getReviewReportListerName(report)}`,
    `Reported by ${getReviewReportReporterName(report)}`,
  ]

  if (report.review?.isDeleted) {
    meta.push("Review removed")
  }

  return (
    <AdminReviewListItem
      title={getReviewReportReasonLabel(report.reason)}
      meta={meta}
      createdAt={formatDate(report.createdAt)}
      isSelected={selectedReviewReport?._id === report._id}
      onSelect={() => selectReviewReport(report._id)}
      image={report.listerProfile?.profilePhoto}
      imageAlt={getReviewReportListerName(report)}
      imageFallback={<MessageSquareWarning className="h-6 w-6" />}
      status={report.status}
      note={report.note}
      imageSize="sm"
    />
  )
}
