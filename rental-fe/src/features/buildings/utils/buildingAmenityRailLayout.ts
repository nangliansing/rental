import { cn } from "@/lib/utils"

import { normalizeStringArray } from "./buildingSummaryDisplay"

export const BUILDING_AMENITY_RAIL_SCROLL_CLASS = cn(
  "-mx-4 overflow-x-auto px-4 pb-0.5",
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
)

export const BUILDING_AMENITY_RAIL_TRACK_CLASS =
  "flex w-max min-w-full items-start gap-3"

export const BUILDING_AMENITY_RAIL_ITEM_CLASS =
  "flex w-[4.25rem] shrink-0 flex-col items-center gap-1.5"

export const BUILDING_AMENITY_RAIL_ICON_SURFACE_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-full"

export const BUILDING_AMENITY_RAIL_ICON_CLASS = "h-[18px] w-[18px]"

export const BUILDING_AMENITY_RAIL_AMENITY_ICON_SURFACE_CLASS = cn(
  BUILDING_AMENITY_RAIL_ICON_SURFACE_CLASS,
  "bg-slate-100 text-slate-600",
)

export const BUILDING_AMENITY_RAIL_ACTION_ICON_SURFACE_CLASS = cn(
  BUILDING_AMENITY_RAIL_ICON_SURFACE_CLASS,
  "bg-slate-950 text-white shadow-sm transition duration-200",
  "group-hover:bg-slate-800 group-active:scale-[0.97]",
)

export const BUILDING_AMENITY_RAIL_LABEL_CLASS =
  "max-w-[4.25rem] text-center text-[11px] font-medium leading-tight tracking-tight text-slate-600"

export const BUILDING_AMENITY_RAIL_ACTION_LABEL_CLASS =
  "max-w-[4.25rem] text-center text-[11px] font-semibold leading-tight tracking-tight text-slate-900"

export const BUILDING_AMENITY_RAIL_ACTION_BUTTON_CLASS = cn(
  BUILDING_AMENITY_RAIL_ITEM_CLASS,
  "group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20 focus-visible:ring-offset-2",
)

export const BUILDING_AMENITY_RAIL_DIVIDER_CLASS =
  "mt-2 h-10 w-px shrink-0 bg-slate-200/90"

export function collectBuildingAmenityItems(
  facilities?: readonly string[] | null,
  security?: readonly string[] | null,
): string[] {
  return [
    ...normalizeStringArray(facilities),
    ...normalizeStringArray(security),
  ]
}

export function shouldRenderBuildingAmenityRail(
  items: readonly string[],
  hasExploreAction: boolean,
): boolean {
  return items.length > 0 || hasExploreAction
}

export function shouldShowBuildingAmenityRailDivider(
  itemCount: number,
  hasExploreAction: boolean,
): boolean {
  return hasExploreAction && itemCount > 0
}
