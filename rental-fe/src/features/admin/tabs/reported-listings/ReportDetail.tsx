import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  AdminBuildingCard,
  AdminDetailPanel as DetailPanel,
  AdminInfoRow as InfoRow,
  AdminListingCard,
  AdminReviewCard,
  AdminStatusBadge as StatusBadge,
  ListingModerationMenu,
} from "../../components"
import type { AdminReport } from "../../api"
import { formatDate } from "../../shared/adminFormatters"
import {
  getReportListerName,
  getReportListingTitle,
  getReportReasonLabel,
  getReportReporterName,
} from "./reportedListingDisplayUtils"
import { ReportListerCard } from "./ReportListerCard"
import { useReportReview } from "./ReportReviewContext"

export function ReportDetail({
  report,
  onSuspendUser,
}: {
  report: AdminReport
  onSuspendUser: (target: { userId: string; name: string }) => void
}) {
  const {
    isReviewSubmitting,
    isDeletingListing,
    openReviewDialog,
    openDeleteListingDialog,
  } = useReportReview()
  const listing = report.listing
  const isListingDeleted = Boolean(listing?.isDeleted)
  const building = report.building
  const lister = report.listingAgentProfile
  const isOpen = report.status === "OPEN"

  return (
    <article className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {getReportReasonLabel(report.reason)}
            </h2>
            <StatusBadge status={report.status} />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Reported {formatDate(report.createdAt)} by{" "}
            {getReportReporterName(report)}
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
          <InfoRow label="Reason" value={getReportReasonLabel(report.reason)} />
          <InfoRow label="Status" value={report.status.replaceAll("_", " ")} />
          <InfoRow
            label="Details"
            value={report.note?.trim() || "No extra details provided"}
          />
          <InfoRow
            label="Reporter"
            value={`${report.reportedBy.name} · ${report.reportedBy.email}`}
          />
        </DetailPanel>

        <DetailPanel title="Review">
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
        title="Reported listing"
        action={
          listing && !isListingDeleted ? (
            <ListingModerationMenu
              isDisabled={isDeletingListing}
              onDelete={() => openDeleteListingDialog(report, listing)}
            />
          ) : undefined
        }
      >
        {listing && !isListingDeleted ? (
          <AdminListingCard
            listing={listing}
            imageAlt={getReportListingTitle(report)}
            showImage
            showAdminState
          />
        ) : isListingDeleted ? (
          <div className="rounded-lg bg-slate-50 px-4 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  This listing has been removed.
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  The report is still available for audit history, but the
                  deleted listing is no longer shown as active content.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            The referenced listing is no longer available in the admin lookup.
          </p>
        )}
      </DetailPanel>

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailPanel title="Lister">
          <ReportListerCard
            name={getReportListerName(report)}
            subtitle={
              report.listingOwner
                ? `${report.listingOwner.name} · ${report.listingOwner.email}`
                : "No owner details"
            }
            meta={`${lister?.isOnline ? "ONLINE" : "OFFLINE"}${
              report.listingOwner ? ` · ${report.listingOwner.status}` : ""
            }`}
            profile={lister}
            userId={report.listingOwner?._id}
            userStatus={report.listingOwner?.status}
            onSuspendUser={onSuspendUser}
          />
        </DetailPanel>

        <DetailPanel title="Building">
          {building ? (
            <AdminBuildingCard building={building} showActive />
          ) : (
            <p className="text-sm text-slate-500">
              No building details were found for this report.
            </p>
          )}
        </DetailPanel>
      </div>
    </article>
  )
}
