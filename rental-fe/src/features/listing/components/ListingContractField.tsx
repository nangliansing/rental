import { FileText } from "lucide-react"
import type { ReactNode } from "react"

import { FormTabPickerField } from "@/shared/components/inputs/FormTabPickerField"

import { getListingContractOption } from "../utils/listingContract"
import { EditContractDialog } from "./EditContractDialog"

export type ListingContractFieldProps = {
  id?: string
  value: number | string
  onChange: (contractMonths: number) => void
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

export function ListingContractField({
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
}: ListingContractFieldProps) {
  const option = getListingContractOption(value)

  return (
    <FormTabPickerField
      id={id}
      label={option.label}
      icon={FileText}
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
        <EditContractDialog
          currentContractMonths={value}
          isOpen={isOpen}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onSubmit={(nextContractMonths) => {
            onChange(nextContractMonths)
            onClose()
          }}
        />
      )}
    </FormTabPickerField>
  )
}
