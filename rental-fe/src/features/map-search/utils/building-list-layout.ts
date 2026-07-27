import { cn } from "@/lib/utils"

import {
  BUILDING_PANEL_CONTENT_INSET_CLASS,
  BUILDING_PANEL_GUTTER_COLOR_CLASS,
  BUILDING_PANEL_INSET_BREAKOUT_CLASS,
  getBuildingPanelContainerClass,
  getBuildingPanelSurfaceClass,
} from "@/features/buildings/utils/buildingPanelLayout"

/** Keep in sync with BuildingResultsPanel padded content wrappers. */
export const RESULTS_PANEL_CONTENT_INSET_CLASS = BUILDING_PANEL_CONTENT_INSET_CLASS
export const RESULTS_PANEL_CONTENT_BREAKOUT_CLASS = BUILDING_PANEL_INSET_BREAKOUT_CLASS

export const BUILDING_LIST_GUTTER_COLOR_CLASS = BUILDING_PANEL_GUTTER_COLOR_CLASS
export const BUILDING_CARD_SURFACE_CLASS = "bg-white"
export const BUILDING_CARD_CONTENT_INSET_CLASS = BUILDING_PANEL_CONTENT_INSET_CLASS

/** Vertical gutter between cards; belongs on the list-item wrapper, not the card. */
export const BUILDING_LIST_ITEM_GAP_CLASS = "pb-2"
export const BUILDING_LIST_ITEM_GAP_PX = 8

export const BUILDING_LIST_CONTAINER_CLASS =
  getBuildingPanelContainerClass("inset")

export { getBuildingPanelSurfaceClass }

export const BUILDING_CARD_LISTING_RAIL_CLASS = cn(
  RESULTS_PANEL_CONTENT_BREAKOUT_CLASS,
  BUILDING_CARD_CONTENT_INSET_CLASS,
  "mt-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
)

/** Listing grids inside padded panel content should break out to full width. */
export const RESULTS_PANEL_LISTING_GRID_CLASS =
  RESULTS_PANEL_CONTENT_BREAKOUT_CLASS

export const BUILDING_DETAIL_LISTINGS_HEADING_CLASS =
  "mb-3 pt-4 text-sm font-semibold"

export const ESTIMATED_BUILDING_CARD_HEIGHT_PX = 290

export function getBuildingListItemGapClass(
  index: number,
  totalCount: number,
): string | undefined {
  if (!Number.isFinite(index) || !Number.isFinite(totalCount)) {
    return undefined
  }

  if (index < 0 || totalCount <= 0 || index >= totalCount - 1) {
    return undefined
  }

  return BUILDING_LIST_ITEM_GAP_CLASS
}

export function getEstimatedBuildingListItemHeightPx(): number {
  return ESTIMATED_BUILDING_CARD_HEIGHT_PX + BUILDING_LIST_ITEM_GAP_PX
}

export function getBuildingAtIndex<T extends { _id: string }>(
  items: readonly T[],
  index: number,
): T | undefined {
  if (!Number.isFinite(index) || index < 0 || index >= items.length) {
    return undefined
  }

  return items[index]
}
