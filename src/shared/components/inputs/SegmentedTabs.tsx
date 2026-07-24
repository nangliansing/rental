import { cn } from "@/lib/utils"

export type SegmentedTabOption<TValue extends string> = {
  id: TValue
  label: string
  isDisabled?: boolean
}

type SegmentedTabsProps<TValue extends string> = {
  options: SegmentedTabOption<TValue>[]
  value: TValue
  onChange: (value: TValue) => void
  "aria-label": string
  className?: string
  tabClassName?: string
}

export function SegmentedTabs<TValue extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  className,
  tabClassName,
}: SegmentedTabsProps<TValue>) {
  return (
    <div
      className={cn(
        "flex max-w-full overflow-x-auto rounded-md bg-slate-100 p-1 text-sm font-semibold text-slate-500 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = option.id === value

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={option.isDisabled}
            disabled={option.isDisabled}
            className={cn(
              "h-9 shrink-0 rounded px-4 transition disabled:cursor-not-allowed disabled:opacity-50",
              isActive
                ? "bg-white text-slate-950 shadow-sm"
                : "hover:text-slate-950",
              tabClassName,
            )}
            onClick={() => onChange(option.id)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
