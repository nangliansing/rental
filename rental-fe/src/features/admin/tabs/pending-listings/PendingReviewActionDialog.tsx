import { AlertCircle, CheckCircle2 } from "lucide-react"

import { ReasonNoteDialog } from "@/shared/components/dialogs/ReasonNoteDialog"

import { formatBaht } from "../../shared/adminFormatters"
import {
  getAgentName,
  getBuildingName,
  getBuildingType,
  getSubmissionType,
  toSelectableChipOptions,
} from "./pendingListingDisplayUtils"
import {
  pendingApproveReasonOptions,
  pendingRejectReasonOptions,
} from "./pendingListingReasonOptions"
import { usePendingReview } from "./PendingReviewContext"

export function PendingReviewActionDialog() {
  const {
    action,
    selectedRejectReason,
    reviewNote,
    error,
    isReviewSubmitting,
    setSelectedRejectReason,
    setReviewNote,
    closeDialog,
    confirmAction,
  } = usePendingReview()

  if (!action) return null

  const isReject = action.type === "reject"
  const title = isReject ? "Reject submission" : "Approve and publish"
  const description = isReject
    ? "Add a clear reason so the lister understands what needs to be fixed."
    : "Add a clear reason so the lister understands which listing was approved and why."
  const actionLabel = isReject ? "Reject submission" : "Approve and publish"
  const canSubmit =
    !isReviewSubmitting &&
    (selectedRejectReason.trim().length > 0 || reviewNote.trim().length > 0)

  return (
    <ReasonNoteDialog
      isOpen
      title={title}
      description={description}
      icon={
        isReject ? (
          <AlertCircle className="h-5 w-5" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )
      }
      tone={isReject ? "red" : "green"}
      itemSummary={
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {getBuildingName(action.post)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {getSubmissionType(action.post)} ·{" "}
                {getBuildingType(action.post)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-slate-950">
              {formatBaht(action.post.listing.rent)}
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Submitted by {getAgentName(action.post)}
          </p>
        </div>
      }
      reasonLabel="Common reason"
      reasonOptions={
        isReject
          ? toSelectableChipOptions([...pendingRejectReasonOptions])
          : toSelectableChipOptions([...pendingApproveReasonOptions])
      }
      selectedReason={selectedRejectReason}
      reasonActiveColor={isReject ? "red" : "green"}
      noteLabel="Extra note or custom reason"
      note={reviewNote}
      showNoteField
      error={error}
      confirmLabel={actionLabel}
      isSubmitting={isReviewSubmitting}
      canSubmit={canSubmit}
      onReasonChange={(reason) => setSelectedRejectReason(reason)}
      onNoteChange={setReviewNote}
      onCancel={closeDialog}
      onSubmit={confirmAction}
    />
  )
}
