import { useId, useState, type FormEvent } from "react"

import { normalizeDialogErrorMessage } from "../utils/normalizeDialogErrorMessage"
import {
  LISTING_CONTRACT_OPTIONS,
  normalizeListingContractMonths,
} from "../utils/listingContract"
import { OptionEditFormShell, OptionRadioCard } from "./OptionEditControls"

export type EditContractProps = {
  currentContractMonths?: number | string | null
  errorMessage?: string | null
  isSubmitting?: boolean
  className?: string
  onSubmit: (contractMonths: number) => void | Promise<void>
}

export function EditContract({
  currentContractMonths,
  errorMessage,
  isSubmitting = false,
  className,
  onSubmit,
}: EditContractProps) {
  const groupId = useId()
  const normalizedCurrent = normalizeListingContractMonths(currentContractMonths)
  const normalizedErrorMessage = normalizeDialogErrorMessage(errorMessage)
  const [contractMonths, setContractMonths] = useState(normalizedCurrent)
  const hasChanged = contractMonths !== normalizedCurrent

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (isSubmitting || !hasChanged) return
    void onSubmit(contractMonths)
  }

  return (
    <OptionEditFormShell
      className={className}
      legend="Choose minimum contract length"
      isSubmitting={isSubmitting}
      hasChanged={hasChanged}
      errorMessage={normalizedErrorMessage || undefined}
      onSubmit={handleSubmit}
    >
      {LISTING_CONTRACT_OPTIONS.map((option) => {
        const optionId = `${groupId}-${option.value}-months`

        return (
          <OptionRadioCard
            key={option.value}
            id={optionId}
            name={`${groupId}-listing-contract`}
            value={option.value}
            checked={contractMonths === option.value}
            disabled={isSubmitting}
            label={option.label}
            description={option.description}
            descriptionId={`${optionId}-description`}
            onSelect={() => setContractMonths(option.value)}
          />
        )
      })}
    </OptionEditFormShell>
  )
}
