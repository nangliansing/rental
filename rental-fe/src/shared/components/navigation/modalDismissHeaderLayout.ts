import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export const MODAL_DISMISS_BACK_BUTTON_CLASS =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"

export const MODAL_DISMISS_CLOSE_BUTTON_CLASS =
  "hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950 md:inline-flex"

export const MODAL_DISMISS_BAR_HEADER_CLASS =
  "flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-3"

export const MODAL_DISMISS_INLINE_HEADER_CLASS = cn(
  "flex shrink-0 items-start gap-1 border-b border-slate-100 bg-white px-3 py-3",
  "md:gap-2 md:px-4",
)

export const MODAL_DISMISS_INLINE_TITLE_CLASS =
  "truncate text-[15px] font-semibold tracking-tight text-slate-950"

export const MODAL_DISMISS_INLINE_DESCRIPTION_CLASS =
  "mt-0.5 text-xs text-slate-500"

export function normalizeModalCloseLabel(label?: string): string {
  const trimmed = label?.trim()
  return trimmed || "Close"
}

export function shouldRenderModalDismissDescription(
  description?: ReactNode,
): boolean {
  if (description == null) return false
  if (typeof description === "string") return Boolean(description.trim())
  return true
}
