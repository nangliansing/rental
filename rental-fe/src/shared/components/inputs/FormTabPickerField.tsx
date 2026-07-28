import { useId, useState, type ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { FormTabTrigger } from "@/shared/components/inputs/FormTabTrigger"

export type FormTabPickerFieldProps = {
  id?: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
  isLoading?: boolean
  readOnly?: boolean
  required?: boolean
  error?: ReactNode
  className?: string
  "aria-label"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
  children: (controls: {
    isOpen: boolean
    isSubmitting: boolean
    onClose: () => void
  }) => ReactNode
}

/**
 * Chip trigger that opens a picker dialog. Dialog content is provided via render prop
 * so domain-specific dialogs stay outside this shared shell.
 */
export function FormTabPickerField({
  id,
  label,
  icon,
  disabled = false,
  isLoading = false,
  readOnly = false,
  required = false,
  error,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  children,
}: FormTabPickerFieldProps) {
  const generatedId = useId()
  const triggerId = id?.trim() || generatedId
  const [isOpen, setIsOpen] = useState(false)

  const closePicker = () => {
    setIsOpen(false)
  }

  return (
    <div className={cn("inline-flex shrink-0", className)}>
      <FormTabTrigger
        id={triggerId}
        label={label}
        icon={icon}
        disabled={disabled}
        isLoading={isLoading}
        readOnly={readOnly}
        required={required}
        error={error}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      />
      {children({
        isOpen,
        isSubmitting: isLoading,
        onClose: closePicker,
      })}
    </div>
  )
}
