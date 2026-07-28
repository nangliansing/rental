import { EditContract } from "../forms/EditContract"
import { ListingOptionEditDialog } from "./ListingOptionEditDialog"

type EditContractDialogProps = {
  currentContractMonths: number | string
  errorMessage?: string | null
  isOpen: boolean
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (contractMonths: number) => void | Promise<void>
}

export function EditContractDialog({
  currentContractMonths,
  errorMessage,
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}: EditContractDialogProps) {
  return (
    <ListingOptionEditDialog
      isOpen={isOpen}
      isSubmitting={isSubmitting}
      title="Minimum contract"
      description="Choose how long tenants must stay."
      onClose={onClose}
    >
      <EditContract
        currentContractMonths={currentContractMonths}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
      />
    </ListingOptionEditDialog>
  )
}
