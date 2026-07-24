import { ShieldCheck, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DialogDescription,
  DialogShell,
  DialogTitle,
} from "@/shared/components/dialogs/DialogShell"

import { EditPrivacy } from "../forms"
import type { ListingVisibility } from "../types"

type EditPrivacyDialogProps = {
  currentVisibility: ListingVisibility
  errorMessage?: string | null
  isOpen: boolean
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (visibility: ListingVisibility) => void | Promise<void>
}

export function EditPrivacyDialog({
  currentVisibility,
  errorMessage,
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}: EditPrivacyDialogProps) {
  return (
    <DialogShell
      isOpen={isOpen}
      isDismissDisabled={isSubmitting}
      contentClassName="max-w-md rounded-xl"
      onDismiss={onClose}
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg font-semibold text-slate-950">
              Listing privacy
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-slate-500">
              Choose who can find and view this listing.
            </DialogDescription>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full"
          aria-label="Close listing privacy"
          disabled={isSubmitting}
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      <div className="p-5">
        {isOpen && (
          <EditPrivacy
            currentVisibility={currentVisibility}
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </DialogShell>
  )
}
