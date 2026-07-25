import { AlertCircle } from "lucide-react"

import { ReasonNoteDialog } from "@/shared/components/dialogs/ReasonNoteDialog"

import { usePlatformAdminReview } from "./PlatformAdminReviewContext"

export function RemoveAdminRoleDialog() {
  const {
    action,
    error,
    isSubmitting,
    closeRemoveAdminDialog,
    confirmRemoveAdmin,
  } = usePlatformAdminReview()

  if (!action) return null

  return (
    <ReasonNoteDialog
      isOpen
      title="Remove admin access"
      description="This changes the account role from admin to normal user. They will no longer be able to access platform review tools."
      icon={<AlertCircle className="h-5 w-5" />}
      tone="red"
      itemSummary={
        <div>
          <p className="truncate text-sm font-semibold text-slate-950">
            {action.name}
          </p>
          <p className="mt-1 text-sm text-slate-500">{action.email}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Current role · {action.role}
          </p>
        </div>
      }
      note=""
      showNoteField={false}
      error={error}
      confirmLabel="Remove admin"
      isSubmitting={isSubmitting}
      canSubmit={!isSubmitting}
      onNoteChange={() => undefined}
      onCancel={closeRemoveAdminDialog}
      onSubmit={confirmRemoveAdmin}
    />
  )
}
