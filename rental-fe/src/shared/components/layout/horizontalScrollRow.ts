import { cn } from "@/lib/utils"

export const HORIZONTAL_SCROLL_ROW_CLASS = cn(
  "flex flex-nowrap overflow-x-auto overscroll-x-contain",
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
)

export function getHorizontalScrollRowClass(className?: string) {
  return cn(HORIZONTAL_SCROLL_ROW_CLASS, className)
}

export function getEdgeToEdgeHorizontalScrollRowClass(
  breakoutClass: string,
  insetClass: string,
  className?: string,
) {
  return getHorizontalScrollRowClass(
    cn(breakoutClass, insetClass, className),
  )
}
