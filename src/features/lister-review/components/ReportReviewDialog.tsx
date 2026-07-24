import { Flag } from "lucide-react"

import { type ReviewReportReason } from "@/features/review-report"
import { ReasonNoteDialog } from "@/shared/components/dialogs/ReasonNoteDialog"

const reportReviewReasonOptions: {
  value: ReviewReportReason
  label: string
}[] = [
  { value: "INAPPROPRIATE_LANGUAGE", label: "Inappropriate language" },
  { value: "HARASSMENT_OR_HATE", label: "Harassment or hate" },
  { value: "FALSE_INFORMATION", label: "False information" },
  { value: "PRIVATE_INFORMATION", label: "Private information" },
  { value: "CONFLICT_OF_INTEREST", label: "Conflict of interest" },
  { value: "SPAM", label: "Spam" },
  { value: "OTHER", label: "Other" },
]

type ReportReviewDialogProps = {
  isOpen: boolean
  isSubmitting: boolean
  error: string
  successMessage: string
  selectedReason: ReviewReportReason | null
  note: string
  onReasonChange: (reason: ReviewReportReason) => void
  onNoteChange: (note: string) => void
  onCancel: () => void
  onSubmit: () => void
}

export function ReportReviewDialog({
  isOpen,
  isSubmitting,
  error,
  successMessage,
  selectedReason,
  note,
  onReasonChange,
  onNoteChange,
  onCancel,
  onSubmit,
}: ReportReviewDialogProps) {
  return (
    <ReasonNoteDialog
      isOpen={isOpen}
      title="Report this review"
      description="Tell us what looks wrong. Our team will review it."
      icon={<Flag className="h-5 w-5" />}
      tone="neutral"
      reasonOptions={reportReviewReasonOptions}
      selectedReason={selectedReason ?? ""}
      reasonActiveColor="blue"
      noteLabel="Details"
      note={note}
      notePlaceholder="Optional, but helpful. Add what you noticed."
      error={error}
      successMessage={successMessage}
      confirmLabel="Submit report"
      isSubmitting={isSubmitting}
      canSubmit={!isSubmitting && Boolean(selectedReason)}
      showCloseButton
      closeAriaLabel="Close report review dialog"
      onReasonChange={(reason) => {
        if (reason) onReasonChange(reason)
      }}
      onNoteChange={onNoteChange}
      onCancel={onCancel}
      onSubmit={onSubmit}
    />
  )
}
