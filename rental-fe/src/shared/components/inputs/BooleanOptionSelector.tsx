import { cn } from "@/lib/utils"
import {
  optionSelectorActiveColorClasses,
  optionSelectorSizeClasses,
  type OptionSelectorActiveColor,
  type OptionSelectorSize,
} from "./optionSelectorStyles"

export type BooleanOptionActiveColor = OptionSelectorActiveColor
export type BooleanOptionSize = OptionSelectorSize

type BooleanOptionSelectorProps = {
  label: string
  value?: boolean
  disabled?: boolean
  size?: BooleanOptionSize
  activeColor?: BooleanOptionActiveColor
  className?: string
  onChange: (value?: boolean) => void
}

export function BooleanOptionSelector({
  label,
  value,
  disabled = false,
  size = "medium",
  activeColor = "black",
  className,
  onChange,
}: BooleanOptionSelectorProps) {
  const isSelected = value === true

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={isSelected}
      className={cn(
        "rounded-full font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        optionSelectorSizeClasses[size],
        isSelected
          ? optionSelectorActiveColorClasses[activeColor]
          : "bg-slate-100 text-slate-700 hover:bg-slate-200",
        className,
      )}
      onClick={() => {
        if (!disabled) onChange(isSelected ? undefined : true)
      }}
    >
      {label}
    </button>
  )
}
