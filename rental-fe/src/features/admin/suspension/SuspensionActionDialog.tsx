import { AlertCircle } from "lucide-react"

import { ReasonNoteDialog } from "@/shared/components/dialogs/ReasonNoteDialog"

import { toSelectableChipOptions } from "../shared/adminChipOptions"
import { SelectableChipGroup } from "./SelectableChipGroup"
import {
  suspensionDurationOptions,
  suspensionReasonOptions,
} from "./suspensionActionReasonOptions"
import type { SuspensionActionTarget } from "./SuspensionActionContext"

export function SuspensionActionDialog({
  action,
  reason,
  note,
  durationDays,
  error,
  isSubmitting,
  onReasonChange,
  onNoteChange,
  onDurationDaysChange,
  onClose,
  onConfirm,
}: {
  action: SuspensionActionTarget | null
  reason: string
  note: string
  durationDays: number
  error: string | null
  isSubmitting: boolean
  onReasonChange: (value: string) => void
  onNoteChange: (value: string) => void
  onDurationDaysChange: (value: number) => void
  onClose: () => void
  onConfirm: () => void
}) {
  if (!action) return null

  const canSubmit =
    !isSubmitting && (reason.trim().length > 0 || note.trim().length > 0)

  return (
    <ReasonNoteDialog
      isOpen
      title="Suspend lister"
      description="Temporarily restrict this lister from using listing actions."
      icon={<AlertCircle className="h-5 w-5" />}
      tone="red"
      itemSummary={
        <>
          <p className="truncate text-sm font-semibold text-slate-950">
            {action.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            This lister is not currently suspended.
          </p>
        </>
      }
      reasonLabel="Suspension reason"
      reasonOptions={toSelectableChipOptions(suspensionReasonOptions)}
      selectedReason={reason}
      reasonActiveColor="red"
      additionalFields={
        <div>
          <p className="text-sm font-semibold text-slate-800">Duration</p>
          <SelectableChipGroup
            options={suspensionDurationOptions}
            value={durationDays}
            disabled={isSubmitting}
            onChange={onDurationDaysChange}
          />
        </div>
      }
      noteLabel="Extra note or custom reason"
      note={note}
      notePlaceholder="Add details for future admins."
      error={error}
      confirmLabel="Suspend lister"
      isSubmitting={isSubmitting}
      canSubmit={canSubmit}
      onReasonChange={onReasonChange}
      onNoteChange={onNoteChange}
      onCancel={onClose}
      onSubmit={onConfirm}
    />
  )
}
