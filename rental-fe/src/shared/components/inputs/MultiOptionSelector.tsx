import { useId, type ReactNode } from "react"

import { cn } from "@/lib/utils"
import {
  optionSelectorActiveColorClasses,
  optionSelectorSizeClasses,
  type OptionSelectorActiveColor,
  type OptionSelectorSize,
} from "./optionSelectorStyles"

export type MultiOption = {
  label: string
  value: string
}

export type MultiOptionActiveColor = OptionSelectorActiveColor
export type MultiOptionSize = OptionSelectorSize

type MultiOptionSelectorProps = {
  label?: string
  description?: ReactNode
  options?: readonly MultiOption[]
  value?: readonly string[]
  required?: boolean
  disabled?: boolean
  size?: MultiOptionSize
  activeColor?: MultiOptionActiveColor
  className?: string
  onChange: (value?: string[]) => void
}

export function MultiOptionSelector({
  label,
  description,
  options,
  value,
  required = false,
  disabled = false,
  size = "medium",
  activeColor = "black",
  className,
  onChange,
}: MultiOptionSelectorProps) {
  const descriptionId = useId()
  const normalizedOptions = Array.isArray(options) ? options : []
  const normalizedValue = Array.isArray(value) ? value : []
  const normalizedLabel = label?.trim() ?? ""
  const hasDescription =
    description !== null &&
    description !== undefined &&
    description !== false &&
    description !== ""

  const toggleOption = (optionValue: string) => {
    if (disabled) return

    const isSelected = normalizedValue.includes(optionValue)

    const nextValue = isSelected
      ? normalizedValue.filter((item) => item !== optionValue)
      : [...normalizedValue, optionValue]

    onChange(nextValue.length > 0 ? nextValue : undefined)
  }

  return (
    <fieldset
      disabled={disabled}
      aria-required={required || undefined}
      aria-describedby={hasDescription ? descriptionId : undefined}
      className={cn("m-0 min-w-0 border-0 p-0", className)}
    >
      {normalizedLabel && (
        <legend className="mb-2 p-0 text-sm font-semibold text-slate-950">
          {normalizedLabel}
          {required && (
            <span className="text-red-600" aria-hidden="true">
              {" "}*
            </span>
          )}
        </legend>
      )}

      <div className="flex flex-wrap gap-2">
        {normalizedOptions.map((option) => {
          const isSelected = normalizedValue.includes(option.value)

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              className={cn(
                "rounded-full font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
                optionSelectorSizeClasses[size],
                isSelected
                  ? optionSelectorActiveColorClasses[activeColor]
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              )}
              onClick={() => toggleOption(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {hasDescription && (
        <p id={descriptionId} className="mt-2 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </fieldset>
  )
}
