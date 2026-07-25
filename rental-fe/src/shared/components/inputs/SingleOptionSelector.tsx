import { cn } from "@/lib/utils"
import {
  optionSelectorActiveColorClasses,
  optionSelectorSizeClasses,
  type OptionSelectorActiveColor,
  type OptionSelectorSize,
} from "./optionSelectorStyles"

export type SingleOptionValue = string | number

export type SingleOption = {
  label: string
  value: SingleOptionValue
}

export type SingleOptionActiveColor = OptionSelectorActiveColor
export type SingleOptionSize = OptionSelectorSize

type SingleOptionSelectorProps = {
  label?: string
  options?: readonly SingleOption[]
  value?: SingleOptionValue
  required?: boolean
  disabled?: boolean
  size?: SingleOptionSize
  activeColor?: SingleOptionActiveColor
  className?: string
  onChange: (value?: SingleOptionValue) => void
}

export function SingleOptionSelector({
  label,
  options,
  value,
  required = false,
  disabled = false,
  size = "medium",
  activeColor = "black",
  className,
  onChange,
}: SingleOptionSelectorProps) {
  const normalizedOptions = Array.isArray(options) ? options : []
  const normalizedLabel = label?.trim() ?? ""

  const handleSelect = (optionValue: SingleOptionValue) => {
    if (disabled) return

    const isSelected = value === optionValue

    if (isSelected) {
      if (!required) onChange(undefined)
      return
    }

    onChange(optionValue)
  }

  return (
    <fieldset
      disabled={disabled}
      aria-required={required || undefined}
      className={cn("m-0 min-w-0 border-0 p-0", className)}
    >
      {normalizedLabel && (
        <legend className="mb-2 p-0 text-sm font-medium text-slate-950">
          {normalizedLabel}
        </legend>
      )}

      <div className="flex flex-wrap gap-2">
        {normalizedOptions.map((option) => {
          const isSelected = value === option.value

          return (
            <button
              key={String(option.value)}
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
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
