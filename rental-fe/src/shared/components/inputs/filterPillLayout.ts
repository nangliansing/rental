import { cn } from "@/lib/utils"

export type FilterPillOption<TValue extends string | undefined> = {
  label: string
  value?: TValue
}

export const FILTER_PILL_SCROLL_TRACK_CLASS = cn(
  "max-w-full overflow-x-auto overscroll-x-contain pb-1",
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
)

export const FILTER_PILL_SIZE_CLASS = {
  compact: "h-8 px-3 text-xs",
  normal: "h-9 px-3.5 text-sm",
} as const

export type FilterPillSize = keyof typeof FILTER_PILL_SIZE_CLASS

export function getFilterPillSizeClass(variant: "default" | "overlay"): string {
  return variant === "overlay"
    ? FILTER_PILL_SIZE_CLASS.normal
    : FILTER_PILL_SIZE_CLASS.compact
}

export function getFilterPillButtonClass({
  variant,
  isActive,
  scrollable,
}: {
  variant: "default" | "overlay"
  isActive: boolean
  scrollable: boolean
}): string {
  return cn(
    "rounded-full font-semibold transition",
    scrollable && "shrink-0 scroll-mx-2 whitespace-nowrap",
    getFilterPillSizeClass(variant),
    variant === "overlay" && "shadow-sm",
    isActive
      ? "bg-slate-900 text-white shadow-md"
      : variant === "overlay"
        ? "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-white"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
  )
}

export function getFilterPillOptionKey<TValue extends string | undefined>(
  option: { label: string; value?: TValue },
  index: number,
): string {
  const valueKey =
    option.value === undefined ? "all" : String(option.value).trim() || "unknown"

  return `${valueKey}-${option.label.trim() || index}`
}

export function shouldRenderFilterPills<TValue extends string | undefined>(
  options: readonly FilterPillOption<TValue>[] | null | undefined,
): options is readonly FilterPillOption<TValue>[] {
  return Array.isArray(options) && options.length > 0
}
