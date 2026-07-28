import type { ReactNode } from "react"

import { FormTabPickerField } from "@/shared/components/inputs/FormTabPickerField"

import type { ListingVisibility } from "../types"
import { getListingPrivacyOption } from "../utils/listingPrivacy"
import { EditPrivacyDialog } from "./EditPrivacyDialog"

export type ListingVisibilityFieldProps = {
  id?: string
  value: ListingVisibility
  onChange: (value: ListingVisibility) => void
  disabled?: boolean
  isLoading?: boolean
  readOnly?: boolean
  required?: boolean
  error?: ReactNode
  className?: string
  "aria-label"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
}

export function ListingVisibilityField({
  id,
  value,
  onChange,
  disabled = false,
  isLoading = false,
  readOnly = false,
  required = false,
  error,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: ListingVisibilityFieldProps) {
  const option = getListingPrivacyOption(value)

  return (
    <FormTabPickerField
      id={id}
      label={option.label}
      icon={option.icon}
      disabled={disabled}
      isLoading={isLoading}
      readOnly={readOnly}
      required={required}
      error={error}
      className={className}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
    >
      {({ isOpen, isSubmitting, onClose }) => (
        <EditPrivacyDialog
          currentVisibility={value}
          isOpen={isOpen}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onSubmit={(nextVisibility) => {
            onChange(nextVisibility)
            onClose()
          }}
        />
      )}
    </FormTabPickerField>
  )
}
