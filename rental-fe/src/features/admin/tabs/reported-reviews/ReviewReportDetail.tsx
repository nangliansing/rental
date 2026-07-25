import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  AdminDetailPanel as DetailPanel,
  AdminInfoRow as InfoRow,
  AdminReviewCard,
  AdminStatusBadge as StatusBadge,
  AdminUserCard,
  ReviewModerationMenu,
} from "../../components"
import type { AdminReviewReport } from "../../api"
import { formatDate } from "../../shared/adminFormatters"
import { AdminRatingStars } from "./AdminRatingStars"
import {
  formatReviewTagLabel,
  getReviewRemovedByName,
  getReviewReportListerName,
  getReviewReportReasonLabel,
  getReviewReportReporterName,
  getReviewReportReviewOwnerName,
} from "./reportedReviewDisplayUtils"
import { ReviewReportListerCard } from "./ReviewReportListerCard"
import { useReviewReportReview } from "./ReviewReportReviewContext"

export function ReviewReportDetail({
  report,
  onSuspendUser,
}: {
  report: AdminReviewReport
  onSuspendUser: (target: { userId: string; name: string }) => void
}) {
  const {
    isReviewSubmitting,
    isDeletingReview,
    openReviewDialog,
    openDeleteReviewDialog,
  } = useReviewReportReview()
  const review = report.review
  const lister = report.listerProfile
  const isOpen = report.status === "OPEN"
  const isReviewDeleted = Boolean(review?.isDeleted)

  return (
    <article className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {getReviewReportReasonLabel(report.reason)}
            </h2>
            <StatusBadge status={report.status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Reported {formatDate(report.createdAt)} by{" "}
            {getReviewReportReporterName(report)}
          </p>
        </div>

        {isOpen && (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isReviewSubmitting}
              onClick={() => openReviewDialog(report, "DISMISSED")}
            >
              Dismiss
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isReviewSubmitting}
              onClick={() => openReviewDialog(report, "REVIEWED")}
            >
              Mark reviewed
            </Button>
            <Button
              type="button"
              disabled={isReviewSubmitting}
              onClick={() => openReviewDialog(report, "ACTION_TAKEN")}
            >
              Action taken
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <DetailPanel title="Report">
          <InfoRow
            label="Reason"
            value={getReviewReportReasonLabel(report.reason)}
          />
          <InfoRow label="Status" value={report.status.replaceAll("_", " ")} />
          <InfoRow
            label="Details"
            value={report.note?.trim() || "No extra details provided"}
          />
          <InfoRow
            label="Reporter"
            value={
              report.reportedBy
                ? `${report.reportedBy.name} · ${report.reportedBy.email}`
                : "Reporter not found"
            }
          />
        </DetailPanel>

        <DetailPanel title="Review status">
          <AdminReviewCard
            status={report.status}
            reviewedAt={
              report.reviewedAt ? formatDate(report.reviewedAt) : null
            }
            reviewedBy={report.reviewedBy?.name}
            note={report.reviewNote}
          />
        </DetailPanel>
      </div>

      <DetailPanel
        title="Reported review"
        action={
          review && !isReviewDeleted ? (
            <ReviewModerationMenu
              isDisabled={isDeletingReview}
              onDelete={() => openDeleteReviewDialog(report)}
            />
          ) : undefined
        }
      >
        {review && !isReviewDeleted ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <AdminRatingStars rating={review.rating} />
              <span className="text-sm font-medium text-slate-500">
                {formatDate(review.createdAt)}
              </span>
              {review.editedAt && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                  Edited
                </span>
              )}
            </div>

            {review.comment ? (
              <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                {review.comment}
              </p>
            ) : (
              <p className="text-sm text-slate-500">No written comment.</p>
            )}

            {review.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {review.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    {formatReviewTagLabel(tag)}
                  </span>
                ))}
              </div>
            )}

            <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
              <InfoRow label="Review availability" value="Active" />
              <InfoRow
                label="Collapsed"
                value={review.visibility?.isCollapsed ? "Yes" : "No"}
              />
            </div>
          </div>
        ) : isReviewDeleted ? (
          <div className="rounded-lg bg-slate-50 px-4 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  This review has been removed.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  The report remains visible for audit history, but the deleted
                  review is no longer shown on the lister profile.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 rounded-lg bg-white p-4 sm:grid-cols-3">
              <InfoRow
                label="Removed at"
                value={
                  review?.moderation?.removedAt
                    ? formatDate(review.moderation.removedAt)
                    : review?.deletedAt
                      ? formatDate(review.deletedAt)
                      : "Not recorded"
                }
              />
              <InfoRow label="Removed by" value={getReviewRemovedByName(report)} />
              <InfoRow
                label="Reason"
                value={review?.moderation?.removedReason ?? "Not recorded"}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            The referenced review is no longer available.
          </p>
        )}
      </DetailPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailPanel title="Reviewer">
          <AdminUserCard
            name={getReviewReportReviewOwnerName(report)}
            subtitle={report.reviewOwner?.email}
            meta={
              report.reviewOwner
                ? `${report.reviewOwner.status} · ${report.reviewOwner.role}`
                : "No reviewer details"
            }
          />
        </DetailPanel>

        <DetailPanel title="Lister">
          <ReviewReportListerCard
            name={getReviewReportListerName(report)}
            subtitle={lister ? `Profile ${lister._id}` : "No profile details"}
            meta={lister?.isOnline ? "ONLINE" : "OFFLINE"}
            profile={lister ?? undefined}
            userId={lister?.userId}
            onSuspendUser={onSuspendUser}
          />
        </DetailPanel>
      </div>

      {report.status === "ACTION_TAKEN" && (
        <DetailPanel title="Action taken">
          <InfoRow
            label="Reason"
            value={report.actionReason?.trim() || "No action reason provided"}
          />
          <InfoRow
            label="Taken at"
            value={
              report.actionTakenAt
                ? formatDate(report.actionTakenAt)
                : "No action time recorded"
            }
          />
          <InfoRow
            label="Taken by"
            value={report.actionTakenBy?.name ?? "No reviewer details"}
          />
        </DetailPanel>
      )}
    </article>
  )
}
