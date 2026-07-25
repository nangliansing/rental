import { AlertCircle, CheckCircle2, Flag, Trash2 } from "lucide-react"

import { ReasonNoteDialog } from "@/shared/components/dialogs/ReasonNoteDialog"

import { AdminStatusBadge as StatusBadge } from "../../components"
import { toSelectableChipOptions } from "../../shared/adminChipOptions"
import {
  getReviewReportListerName,
  getReviewReportReasonLabel,
  getReviewReportReviewOwnerName,
} from "./reportedReviewDisplayUtils"
import {
  reviewDeleteReasonOptions,
  reviewReportActionTakenReasonOptions,
  reviewReportDismissReasonOptions,
} from "./reportedReviewReasonOptions"
import {
  type ReviewReportReviewStatus,
  useReviewReportReview,
} from "./ReviewReportReviewContext"

export function ReviewReportReviewDialog() {
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
  } = useReviewReportReview()

  if (!action) return null

  const actionCopy: Record<
    ReviewReportReviewStatus,
    {
      title: string
      description: string
      label: string
      tone: "neutral" | "red" | "green"
    }
  > = {
    REVIEWED: {
      title: "Mark review report reviewed",
      description:
        "Use this when the reported review was checked and no stronger moderation action is needed yet.",
      label: "Mark reviewed",
      tone: "neutral",
    },
    DISMISSED: {
      title: "Dismiss review report",
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
      ? reviewReportDismissReasonOptions
      : action.status === "ACTION_TAKEN"
        ? reviewReportActionTakenReasonOptions
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
              {getReviewReportReasonLabel(action.report.reason)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Review by {getReviewReportReviewOwnerName(action.report)} · For{" "}
              {getReviewReportListerName(action.report)}
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

export function ReviewReportDeleteReviewDialog() {
  const {
    deleteAction,
    deleteReason,
    deleteNote,
    deleteError,
    isDeletingReview,
    setDeleteReason,
    setDeleteNote,
    closeDeleteReviewDialog,
    confirmDeleteReview,
  } = useReviewReportReview()

  if (!deleteAction) return null

  const canSubmit =
    !isDeletingReview &&
    (deleteReason.trim().length > 0 || deleteNote.trim().length > 0)

  return (
    <ReasonNoteDialog
      isOpen
      title="Delete this review"
      description="This removes the review from the lister profile and notifies the lister with the reason."
      icon={<Trash2 className="h-5 w-5" />}
      tone="red"
      itemSummary={
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              Review by {getReviewReportReviewOwnerName(deleteAction)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              On {getReviewReportListerName(deleteAction)} profile
            </p>
          </div>
          <StatusBadge status={deleteAction.status} />
        </div>
      }
      reasonLabel="Common reason"
      reasonOptions={toSelectableChipOptions(reviewDeleteReasonOptions)}
      selectedReason={deleteReason}
      reasonActiveColor="red"
      noteLabel="Extra note or custom reason"
      note={deleteNote}
      notePlaceholder="Add details, or write a custom reason if none of the options fit."
      error={deleteError}
      confirmLabel="Delete review"
      isSubmitting={isDeletingReview}
      canSubmit={canSubmit}
      onReasonChange={(reason) => setDeleteReason(reason)}
      onNoteChange={setDeleteNote}
      onCancel={closeDeleteReviewDialog}
      onSubmit={confirmDeleteReview}
    />
  )
}
