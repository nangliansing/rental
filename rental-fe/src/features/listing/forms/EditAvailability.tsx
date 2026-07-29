import { useState, type FormEvent } from "react"

import { ListingAvailabilityField } from "../components/ListingAvailabilityField"
import {
  isListingAvailabilityFormValid,
  parseAvailableAtToFormFields,
  serializeListingAvailabilityForApi,
  type ListingAvailabilityFormFields,
} from "../utils/listingAvailability"
import { normalizeDialogErrorMessage } from "../utils/normalizeDialogErrorMessage"
import { OptionEditFormShell } from "./OptionEditControls"

export type EditAvailabilityProps = {
  currentAvailableAt?: string | null
  errorMessage?: string | null
  isSubmitting?: boolean
  className?: string
  referenceDate?: Date
  onSubmit: (availableAt: string | null) => void | Promise<void>
}

function areAvailabilityFieldsEqual(
  left: ListingAvailabilityFormFields,
  right: ListingAvailabilityFormFields,
  referenceDate: Date,
) {
  return (
    serializeListingAvailabilityForApi(left, referenceDate) ===
    serializeListingAvailabilityForApi(right, referenceDate)
  )
}

export function EditAvailability({
  currentAvailableAt = null,
  errorMessage,
  isSubmitting = false,
  className,
  referenceDate,
  onSubmit,
}: EditAvailabilityProps) {
  const resolvedReferenceDate = referenceDate ?? new Date()
  const normalizedCurrent = parseAvailableAtToFormFields(
    currentAvailableAt,
    resolvedReferenceDate,
  )
  const normalizedErrorMessage = normalizeDialogErrorMessage(errorMessage)
  const [fields, setFields] =
    useState<ListingAvailabilityFormFields>(normalizedCurrent)
  const hasChanged = !areAvailabilityFieldsEqual(
    fields,
    normalizedCurrent,
    resolvedReferenceDate,
  )
  const isValid = isListingAvailabilityFormValid(
    fields.availabilityMode,
    fields.availableFromDate,
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (isSubmitting || !hasChanged || !isValid) return

    void onSubmit(
      serializeListingAvailabilityForApi(fields, resolvedReferenceDate),
    )
  }

  return (
    <OptionEditFormShell
      className={className}
      legend="Choose listing availability"
      isSubmitting={isSubmitting}
      hasChanged={hasChanged && isValid}
      errorMessage={normalizedErrorMessage || undefined}
      onSubmit={handleSubmit}
    >
      <ListingAvailabilityField
        value={fields}
        onChange={setFields}
        disabled={isSubmitting}
        referenceDate={resolvedReferenceDate}
      />
    </OptionEditFormShell>
  )
}
