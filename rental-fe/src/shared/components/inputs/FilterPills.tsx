import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

export type FilterPillOption<TValue extends string | undefined> = {
  label: string
  value?: TValue
}

type FilterPillsProps<TValue extends string | undefined> = {
  options: FilterPillOption<TValue>[]
  value?: TValue
  onChange: (value: TValue | undefined) => void
  scrollable?: boolean
  edgeToEdge?: boolean
  variant?: "default" | "overlay"
  className?: string
  "aria-label"?: string
}

export function FilterPills<TValue extends string | undefined>({
  options,
  value,
  onChange,
  scrollable = false,
  edgeToEdge = false,
  variant = "default",
  className,
  "aria-label": ariaLabel,
}: FilterPillsProps<TValue>) {
  return (
    <div
      className={cn(
        "flex gap-2",
        variant === "default" && "mt-4",
        scrollable
          ? cn(
              "max-w-full overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              edgeToEdge ? "px-3" : "-mx-1 px-1 pr-6",
            )
          : "flex-wrap",
        className,
      )}
      role={ariaLabel ? "tablist" : undefined}
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = value === option.value

        return (
          <FilterPillButton
            key={`${option.label}-${String(option.value)}`}
            label={option.label}
            isActive={isActive}
            scrollable={scrollable}
            variant={variant}
            onClick={() => onChange(option.value)}
          />
        )
      })}
    </div>
  )
}

function FilterPillButton({
  label,
  isActive,
  scrollable,
  variant,
  onClick,
}: {
  label: string
  isActive: boolean
  scrollable: boolean
  variant: "default" | "overlay"
  onClick: () => void
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isActive || !scrollable) return

    buttonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    })
  }, [isActive, scrollable])

  return (
    <button
      ref={buttonRef}
      type="button"
      role={variant === "overlay" ? "tab" : undefined}
      aria-selected={variant === "overlay" ? isActive : undefined}
      className={cn(
        "rounded-full text-xs font-semibold transition",
        scrollable && "shrink-0 scroll-mx-2 whitespace-nowrap",
        variant === "overlay" ? "h-7 px-3 shadow-sm backdrop-blur-md" : "h-8 px-3",
        isActive
          ? "bg-slate-900 text-white shadow-md"
          : variant === "overlay"
            ? "bg-white/95 text-slate-700 ring-1 ring-slate-200/70 hover:bg-white"
            : "bg-slate-100 text-slate-600 hover:bg-slate-200",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
