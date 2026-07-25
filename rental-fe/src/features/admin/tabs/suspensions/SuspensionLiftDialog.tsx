import { CheckCircle2 } from "lucide-react"

import { ReasonNoteDialog } from "@/shared/components/dialogs/ReasonNoteDialog"

import { AdminStatusBadge as StatusBadge } from "../../components"
import { toSelectableChipOptions } from "../../shared/adminChipOptions"
import { formatDate } from "../../shared/adminFormatters"
import {
  getEffectiveSuspensionStatus,
  getSuspensionUserName,
} from "./suspensionDisplayUtils"
import { liftSuspensionReasonOptions } from "./suspensionReasonOptions"
import { useSuspensionReview } from "./SuspensionReviewContext"

export function SuspensionLiftDialog() {
  const {
    liftAction,
    liftReason,
    liftNote,
    liftError,
    isLifting,
    setLiftReason,
    setLiftNote,
    closeLiftDialog,
    confirmLiftSuspension,
  } = useSuspensionReview()

  if (!liftAction) return null

  const canSubmit =
    !isLifting && (liftReason.trim().length > 0 || liftNote.trim().length > 0)

  return (
    <ReasonNoteDialog
      isOpen
      title="Lift suspension"
      description="Restore this user account to active status and keep an audit reason for future admins."
      icon={<CheckCircle2 className="h-5 w-5" />}
      tone="green"
      itemSummary={
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {getSuspensionUserName(liftAction)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Suspended until {formatDate(liftAction.expiresAt)}
            </p>
          </div>
          <StatusBadge status={getEffectiveSuspensionStatus(liftAction)} />
        </div>
      }
      reasonLabel="Common reason"
      reasonOptions={toSelectableChipOptions(liftSuspensionReasonOptions)}
      selectedReason={liftReason}
      reasonActiveColor="green"
      noteLabel="Extra note or custom reason"
      note={liftNote}
      notePlaceholder="Explain why this suspension can be lifted."
      error={liftError}
      confirmLabel="Lift suspension"
      isSubmitting={isLifting}
      canSubmit={canSubmit}
      onReasonChange={setLiftReason}
      onNoteChange={setLiftNote}
      onCancel={closeLiftDialog}
      onSubmit={confirmLiftSuspension}
    />
  )
}
