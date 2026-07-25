import { AlertCircle, CheckCircle2, Flag, Trash2 } from "lucide-react"

import { ReasonNoteDialog } from "@/shared/components/dialogs/ReasonNoteDialog"

import { AdminStatusBadge as StatusBadge } from "../../components"
import { formatBaht } from "../../shared/adminFormatters"
import { toSelectableChipOptions } from "../../shared/adminChipOptions"
import {
  getReportListingTitle,
  getReportReasonLabel,
  getReportReporterName,
} from "./reportedListingDisplayUtils"
import {
  listingDeleteReasonOptions,
  reportActionTakenReasonOptions,
  reportDismissReasonOptions,
} from "./reportedListingReasonOptions"
import {
  type ReportReviewStatus,
  useReportReview,
} from "./ReportReviewContext"

export function ReportReviewDialog() {
  const {
    action,
    selectedReviewReason,
    reviewNote,
    error,
    isReviewSubmitting,
    setSelectedReviewReason,
    setReviewNote,
    closeDialog,
    confirmReview,
  } = useReportReview()

  if (!action) return null

  const actionCopy: Record<
    ReportReviewStatus,
    {
      title: string
      description: string
      label: string
      tone: "neutral" | "red" | "green"
    }
  > = {
    REVIEWED: {
      title: "Mark report reviewed",
      description:
        "Use this when the report was checked and no stronger moderation action is needed yet.",
      label: "Mark reviewed",
      tone: "neutral",
    },
    DISMISSED: {
      title: "Dismiss report",
      description:
        "Use this when the report is invalid, duplicated, or does not have enough evidence.",
      label: "Dismiss report",
      tone: "red",
    },
    ACTION_TAKEN: {
      title: "Mark action taken",
      description:
        "Use this after a separate moderation action has already been completed.",
      label: "Action taken",
      tone: "green",
    },
  }
  const copy = actionCopy[action.status]
  const requiresNote =
    action.status === "DISMISSED" || action.status === "ACTION_TAKEN"
  const reasonOptions =
    action.status === "DISMISSED"
      ? reportDismissReasonOptions
      : action.status === "ACTION_TAKEN"
        ? reportActionTakenReasonOptions
        : []
  const hasPresetReasons = reasonOptions.length > 0
  const canSubmit =
    !isReviewSubmitting &&
    (!requiresNote ||
      selectedReviewReason.trim().length > 0 ||
      reviewNote.trim().length > 0)
  const reasonOptionItems = reasonOptions.map((reason) => ({
    label: reason,
    value: reason,
  }))
  const icon =
    copy.tone === "red" ? (
      <AlertCircle className="h-5 w-5" />
    ) : copy.tone === "green" ? (
      <CheckCircle2 className="h-5 w-5" />
    ) : (
      <Flag className="h-5 w-5" />
    )

  return (
    <ReasonNoteDialog
      isOpen
      title={copy.title}
      description={copy.description}
      icon={icon}
      tone={copy.tone}
      itemSummary={
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {getReportReasonLabel(action.report.reason)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {getReportListingTitle(action.report)} · Reported by{" "}
              {getReportReporterName(action.report)}
            </p>
          </div>
          <StatusBadge status={action.report.status} />
        </div>
      }
      reasonLabel="Common reason"
      reasonOptions={reasonOptionItems}
      selectedReason={selectedReviewReason}
      reasonActiveColor={
        action.status === "DISMISSED"
          ? "red"
          : action.status === "ACTION_TAKEN"
            ? "green"
            : "black"
      }
      noteLabel={
        hasPresetReasons ? "Extra note or custom reason" : "Review note (optional)"
      }
      note={reviewNote}
      notePlaceholder={
        hasPresetReasons
          ? "Add details, or write a custom reason if none of the options fit."
          : "Optional note for future admins."
      }
      error={error}
      confirmLabel={copy.label}
      isSubmitting={isReviewSubmitting}
      canSubmit={canSubmit}
      onReasonChange={setSelectedReviewReason}
      onNoteChange={setReviewNote}
      onCancel={closeDialog}
      onSubmit={confirmReview}
    />
  )
}

export function ReportListingDeleteDialog() {
  const {
    deleteAction,
    deleteReason,
    deleteNote,
    deleteError,
    isDeletingListing,
    setDeleteReason,
    setDeleteNote,
    closeDeleteListingDialog,
    confirmDeleteListing,
  } = useReportReview()

  if (!deleteAction) return null

  const canSubmit =
    !isDeletingListing &&
    (deleteReason.trim().length > 0 || deleteNote.trim().length > 0)
  const listing = deleteAction.listing

  return (
    <ReasonNoteDialog
      isOpen
      title="Delete listing"
      description="This will remove the listing from the platform and notify the lister with the reason."
      icon={<Trash2 className="h-5 w-5" />}
      tone="red"
      itemSummary={
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {getReportListingTitle(deleteAction.report)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Reported for {getReportReasonLabel(deleteAction.report.reason)}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-slate-950">
            {formatBaht(listing.rent)}
          </p>
        </div>
      }
      reasonLabel="Deletion reason"
      reasonOptions={toSelectableChipOptions(listingDeleteReasonOptions)}
      selectedReason={deleteReason}
      reasonActiveColor="red"
      noteLabel="Extra note or custom reason"
      note={deleteNote}
      notePlaceholder="Explain exactly why this listing is being removed."
      error={deleteError}
      confirmLabel="Delete listing"
      isSubmitting={isDeletingListing}
      canSubmit={canSubmit}
      onReasonChange={setDeleteReason}
      onNoteChange={setDeleteNote}
      onCancel={closeDeleteListingDialog}
      onSubmit={confirmDeleteListing}
    />
  )
}
