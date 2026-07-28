import { EditPrivacy } from "../forms"
import type { ListingVisibility } from "../types"
import { ListingOptionEditDialog } from "./ListingOptionEditDialog"

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
    <ListingOptionEditDialog
      isOpen={isOpen}
      isSubmitting={isSubmitting}
      title="Listing privacy"
      description="Choose who can find and view this listing."
      onClose={onClose}
    >
      <EditPrivacy
        currentVisibility={currentVisibility}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
      />
    </ListingOptionEditDialog>
  )
}
