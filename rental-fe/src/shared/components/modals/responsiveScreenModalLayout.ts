import { cn } from "@/lib/utils"

export const RESPONSIVE_SCREEN_MODAL_BACKDROP_CLASS =
  "fixed inset-0 z-[1000] bg-slate-950/45 md:flex md:items-center md:justify-center md:p-4"

const RESPONSIVE_SCREEN_MODAL_PANEL_BASE_CLASS =
  "flex h-dvh w-full flex-col overflow-hidden bg-white text-slate-950 md:rounded-2xl md:shadow-2xl"

export const RESPONSIVE_SCREEN_MODAL_PANEL_SIZE_CLASS = {
  default: cn(
    RESPONSIVE_SCREEN_MODAL_PANEL_BASE_CLASS,
    "md:h-[min(860px,calc(100dvh-2rem))] md:max-w-2xl",
  ),
  wide: cn(
    RESPONSIVE_SCREEN_MODAL_PANEL_BASE_CLASS,
    "md:h-[min(720px,calc(100dvh-2rem))] md:max-w-4xl md:border md:border-slate-200/80",
  ),
} as const

export type ResponsiveScreenModalSize = keyof typeof RESPONSIVE_SCREEN_MODAL_PANEL_SIZE_CLASS

export function getResponsiveScreenModalPanelClass(
  size: ResponsiveScreenModalSize = "default",
  className?: string,
) {
  return cn(RESPONSIVE_SCREEN_MODAL_PANEL_SIZE_CLASS[size], className)
}
