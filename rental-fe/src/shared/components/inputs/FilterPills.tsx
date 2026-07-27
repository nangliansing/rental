import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import {
  FILTER_PILL_SCROLL_TRACK_CLASS,
  getFilterPillButtonClass,
  getFilterPillOptionKey,
  shouldRenderFilterPills,
  type FilterPillOption,
} from "./filterPillLayout"

export type { FilterPillOption } from "./filterPillLayout"

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
  if (!shouldRenderFilterPills(options)) {
    return null
  }

  return (
    <div
      className={cn(
        "flex gap-2",
        variant === "default" && "mt-4",
        scrollable
          ? cn(
              FILTER_PILL_SCROLL_TRACK_CLASS,
              edgeToEdge ? "px-3" : "-mx-1 px-1 pr-6",
            )
          : "flex-wrap",
        className,
      )}
      role={ariaLabel ? "tablist" : undefined}
      aria-label={ariaLabel}
    >
      {options.map((option, index) => {
        const isActive = value === option.value

        return (
          <FilterPillButton
            key={getFilterPillOptionKey(option, index)}
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
      className={getFilterPillButtonClass({ variant, isActive, scrollable })}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
