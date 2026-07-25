import { Flag } from "lucide-react"

import type { ReportReason } from "@/features/reports/api"
import { ReasonNoteDialog } from "@/shared/components/dialogs/ReasonNoteDialog"

type ReportListingDialogProps = {
  isOpen: boolean
  isSubmitting: boolean
  error?: string
  successMessage?: string
  selectedReason: ReportReason | null
  note: string
  onReasonChange: (reason: ReportReason) => void
  onNoteChange: (note: string) => void
  onCancel: () => void
  onSubmit: () => void
}

const MAX_REPORT_NOTE_LENGTH = 1000

const REPORT_REASON_OPTIONS: ReadonlyArray<{
  value: ReportReason
  label: string
}> = [
  { value: "WRONG_PRICE", label: "Wrong price" },
  { value: "UNAVAILABLE", label: "Room unavailable" },
  { value: "MISLEADING_PHOTOS", label: "Misleading photos" },
  { value: "WRONG_BUILDING_OR_LOCATION", label: "Wrong building or location" },
  { value: "SUSPICIOUS_CONTACT", label: "Suspicious contact" },
  { value: "UNRESPONSIVE_LISTER", label: "Lister is unresponsive" },
  { value: "FAKE_OR_SUSPICIOUS_LISTER", label: "Fake or suspicious lister" },
  { value: "DUPLICATE_LISTING", label: "Duplicate listing" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "UNAUTHORIZED_PHOTOS", label: "Photos used without permission" },
  { value: "HATE_OR_HARASSMENT", label: "Hate or harassment" },
  { value: "OTHER", label: "Other" },
]

export function ReportListingDialog({
  isOpen,
  isSubmitting,
  error = "",
  successMessage = "",
  selectedReason,
  note,
  onReasonChange,
  onNoteChange,
  onCancel,
  onSubmit,
}: ReportListingDialogProps) {
  return (
    <ReasonNoteDialog
      isOpen={isOpen}
      title="Report this listing"
      description="Tell us what looks wrong. Our team will review it."
      icon={<Flag className="h-5 w-5" />}
      reasonOptions={[...REPORT_REASON_OPTIONS]}
      selectedReason={selectedReason ?? ""}
      note={typeof note === "string" ? note : ""}
      noteMaxLength={MAX_REPORT_NOTE_LENGTH}
      notePlaceholder="Optional, but helpful. Add what you noticed."
      error={error}
      successMessage={successMessage}
      confirmLabel="Submit report"
      isSubmitting={isSubmitting}
      canSubmit={Boolean(selectedReason)}
      showCloseButton
      closeAriaLabel="Close report dialog"
      onReasonChange={(reason) => {
        if (reason) onReasonChange(reason)
      }}
      onNoteChange={onNoteChange}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  )
}
