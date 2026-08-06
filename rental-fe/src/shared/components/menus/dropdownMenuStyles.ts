import { cn } from "@/lib/utils"

/**
 * Shared action-menu panel + item sizing across the platform.
 * Match listing / saved-search detail menus: large tap targets, bold labels.
 */
export const DROPDOWN_MENU_CONTENT_CLASSNAME =
  "min-w-56 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-950 shadow-xl outline-none"

export const DROPDOWN_MENU_ITEM_BASE_CLASSNAME =
  "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-base font-semibold outline-none transition"

export const DROPDOWN_MENU_ITEM_NEUTRAL_CLASSNAME = cn(
  DROPDOWN_MENU_ITEM_BASE_CLASSNAME,
  "text-slate-950 hover:bg-slate-100 data-[highlighted]:bg-slate-100",
)

export const DROPDOWN_MENU_ITEM_DANGER_CLASSNAME = cn(
  DROPDOWN_MENU_ITEM_BASE_CLASSNAME,
  "text-rose-700 hover:bg-rose-50 data-[highlighted]:bg-rose-50",
)

/** Multi-line items (title + description), e.g. map Plus menu. */
export const DROPDOWN_MENU_ITEM_STACKED_CLASSNAME = cn(
  DROPDOWN_MENU_ITEM_BASE_CLASSNAME,
  "items-start text-slate-950 hover:bg-slate-100 data-[highlighted]:bg-slate-100",
)

export const DROPDOWN_MENU_ITEM_DISABLED_CLASSNAME = cn(
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[disabled]:hover:bg-transparent data-[disabled]:data-[highlighted]:bg-transparent",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
)

export const DROPDOWN_MENU_ITEM_ICON_CLASSNAME =
  "h-5 w-5 shrink-0 text-slate-500"

export const DROPDOWN_MENU_ITEM_TITLE_CLASSNAME =
  "block text-base font-semibold leading-5"

export const DROPDOWN_MENU_ITEM_DESCRIPTION_CLASSNAME =
  "mt-0.5 block text-xs font-medium leading-4 text-slate-500"
