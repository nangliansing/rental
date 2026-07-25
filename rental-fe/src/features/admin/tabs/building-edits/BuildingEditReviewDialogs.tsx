import { AlertCircle, CheckCircle2 } from "lucide-react"

import { ReasonNoteDialog } from "@/shared/components/dialogs/ReasonNoteDialog"

import { AdminStatusBadge as StatusBadge } from "../../components"
import { toSelectableChipOptions } from "../../shared/adminChipOptions"
import {
  getBuildingEditRequestAgentName,
  getBuildingEditRequestName,
} from "./buildingEditDisplayUtils"
import { buildingEditRejectReasonOptions } from "./buildingEditReasonOptions"
import { useBuildingEditReview } from "./BuildingEditReviewContext"

export function BuildingEditApproveDialog() {
  const {
    approveAction: request,
    reviewReason,
    error,
    isReviewSubmitting,
    setReviewReason,
    closeApproveDialog,
    approveEdit,
  } = useBuildingEditReview()

  if (!request) return null

  return (
    <ReasonNoteDialog
      isOpen
      title="Approve building edit"
      description="This will update the live building details with the proposed changes from this request."
      icon={<CheckCircle2 className="h-5 w-5" />}
      tone="green"
      itemSummary={
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {getBuildingEditRequestName(request)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Requested by {getBuildingEditRequestAgentName(request)}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>
        </div>
      }
      noteLabel="Review note"
      note={reviewReason}
      notePlaceholder="Optional note, e.g. checked address and facilities."
      error={error}
      confirmLabel="Approve edit"
      isSubmitting={isReviewSubmitting}
      canSubmit={!isReviewSubmitting}
      onNoteChange={setReviewReason}
      onCancel={closeApproveDialog}
      onSubmit={approveEdit}
    />
  )
}

export function BuildingEditRejectDialog() {
  const {
    rejectAction: request,
    selectedRejectReason,
    reviewReason,
    error,
    isReviewSubmitting,
    setSelectedRejectReason,
    setReviewReason,
    closeRejectDialog,
    rejectEdit,
  } = useBuildingEditReview()

  if (!request) return null

  const canSubmit =
    !isReviewSubmitting &&
    (selectedRejectReason.trim().length > 0 ||
      reviewReason.trim().length > 0)

  return (
    <ReasonNoteDialog
      isOpen
      title="Reject building edit"
      description="Add a clear reason so the lister understands which building details need to be fixed."
      icon={<AlertCircle className="h-5 w-5" />}
      tone="red"
      itemSummary={
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">
                {getBuildingEditRequestName(request)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Requested by {getBuildingEditRequestAgentName(request)}
              </p>
            </div>
            <StatusBadge status={request.status} />
          </div>
        </div>
      }
      reasonLabel="Common reason"
      reasonOptions={toSelectableChipOptions([...buildingEditRejectReasonOptions])}
      selectedReason={selectedRejectReason}
      reasonActiveColor="red"
      noteLabel="Extra note or custom reason"
      note={reviewReason}
      error={error}
      confirmLabel="Reject edit"
      isSubmitting={isReviewSubmitting}
      canSubmit={canSubmit}
      onReasonChange={setSelectedRejectReason}
      onNoteChange={setReviewReason}
      onCancel={closeRejectDialog}
      onSubmit={rejectEdit}
    />
  )
}
