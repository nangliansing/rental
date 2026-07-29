import { EditAvailability } from "../forms/EditAvailability"
import { ListingOptionEditDialog } from "./ListingOptionEditDialog"

type EditAvailabilityDialogProps = {
  currentAvailableAt: string | null
  errorMessage?: string | null
  isOpen: boolean
  isSubmitting?: boolean
  referenceDate?: Date
  onClose: () => void
  onSubmit: (availableAt: string | null) => void | Promise<void>
}

export function EditAvailabilityDialog({
  currentAvailableAt,
  errorMessage,
  isOpen,
  isSubmitting = false,
  referenceDate,
  onClose,
  onSubmit,
}: EditAvailabilityDialogProps) {
  return (
    <ListingOptionEditDialog
      isOpen={isOpen}
      isSubmitting={isSubmitting}
      title="Availability"
      description="Choose when this room can be moved into."
      onClose={onClose}
    >
      <EditAvailability
        currentAvailableAt={currentAvailableAt}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        referenceDate={referenceDate}
        onSubmit={onSubmit}
      />
    </ListingOptionEditDialog>
  )
}
