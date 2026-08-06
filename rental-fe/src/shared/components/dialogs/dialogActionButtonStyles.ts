import { cn } from "@/lib/utils"

/**
 * Shared Cancel / Confirm / Save / Delete action sizing for dialog footers.
 * Keep height, type size, and weight identical across confirmation + form modals.
 */
export const DIALOG_ACTION_BUTTON_BASE_CLASSNAME =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"

export const DIALOG_ACTION_BUTTON_SECONDARY_CLASSNAME = cn(
  DIALOG_ACTION_BUTTON_BASE_CLASSNAME,
  "border border-slate-200 bg-white bg-clip-padding text-slate-700 hover:bg-slate-50",
)

export const DIALOG_ACTION_BUTTON_PRIMARY_CLASSNAME = cn(
  DIALOG_ACTION_BUTTON_BASE_CLASSNAME,
  "border-transparent bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-400",
)

export const DIALOG_ACTION_BUTTON_DANGER_CLASSNAME = cn(
  DIALOG_ACTION_BUTTON_BASE_CLASSNAME,
  "border-transparent bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
)

export const DIALOG_ACTION_BUTTON_DANGER_ALT_CLASSNAME = cn(
  DIALOG_ACTION_BUTTON_BASE_CLASSNAME,
  "border-transparent bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
)

export const DIALOG_ACTION_BUTTON_SUCCESS_CLASSNAME = cn(
  DIALOG_ACTION_BUTTON_BASE_CLASSNAME,
  "border-transparent bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
)
