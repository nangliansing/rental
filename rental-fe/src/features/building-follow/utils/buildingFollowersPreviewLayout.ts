import { cn } from "@/lib/utils"

export const BUILDING_FOLLOWERS_PREVIEW_ROW_CLASS =
  "flex w-full min-w-0 items-center gap-2.5 py-2"

export const BUILDING_FOLLOWERS_PREVIEW_BUTTON_CLASS = cn(
  BUILDING_FOLLOWERS_PREVIEW_ROW_CLASS,
  "rounded-xl text-left transition-colors hover:bg-slate-50/90 active:bg-slate-100/80",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/70 focus-visible:ring-offset-2",
)

export const BUILDING_FOLLOWERS_PREVIEW_COMPACT_AVATAR_CLASS =
  "!h-6 !w-6 text-[10px]"

export const BUILDING_FOLLOWERS_PREVIEW_AVATAR_RING_CLASS =
  "relative inline-flex rounded-full ring-2 ring-white"

export const BUILDING_FOLLOWERS_PREVIEW_AVATAR_OVERLAP_CLASS = "-ml-1.5"

export const BUILDING_FOLLOWERS_PREVIEW_SOCIAL_PROOF_CLASS =
  "min-w-0 flex-1 text-sm leading-5 text-slate-600"

export const BUILDING_FOLLOWERS_PREVIEW_EMPTY_TEXT_CLASS =
  "min-w-0 flex-1 text-sm font-medium leading-5 text-slate-500"
