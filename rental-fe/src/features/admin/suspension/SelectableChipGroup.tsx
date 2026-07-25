import { cn } from "@/lib/utils"

import { toSelectableChipOptions } from "../shared/adminChipOptions"

type SelectableChipTone = "neutral" | "red" | "green"
type SelectableChipOption<TValue extends string | number> = {
  label: string
  value: TValue
}

export function SelectableChipGroup<TValue extends string | number>({
  options,
  value,
  disabled,
  tone = "neutral",
  onChange,
}: {
  options: TValue[] | SelectableChipOption<TValue>[]
  value: TValue
  disabled: boolean
  tone?: SelectableChipTone
  onChange: (value: TValue) => void
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {toSelectableChipOptions(options).map((option) => {
        const isSelected = value === option.value

        return (
          <button
            key={String(option.value)}
            type="button"
            disabled={disabled}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition",
              isSelected
                ? {
                    neutral: "border-slate-950 bg-slate-950 text-white",
                    red: "border-red-600 bg-red-50 text-red-700",
                    green: "border-emerald-600 bg-emerald-50 text-emerald-700",
                  }[tone]
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
