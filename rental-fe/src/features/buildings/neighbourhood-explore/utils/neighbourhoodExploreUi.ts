import type { BuildingNeighbourhood } from "../../api/getBuildingNeighbourhood"

export const NEIGHBOURHOOD_EXPLORE_MODAL_LABEL = "Explore neighbourhood"

export const NEIGHBOURHOOD_EXPLORE_MODAL_DESCRIPTION =
  "What's nearby this building"

export const NEIGHBOURHOOD_EXPLORE_CLOSE_LABEL =
  "Close explore neighbourhood"

/** Padding-only container for map-overlay category pills (no translucent scrim). */
export const NEIGHBOURHOOD_CATEGORY_BAR_CONTAINER_CLASS =
  "pointer-events-auto pb-4 pt-2.5"

export function getNeighbourhoodTruncationHint(
  summary: BuildingNeighbourhood["summary"],
): string | null {
  if (!summary.truncated) {
    return null
  }

  if (summary.totalWithinRadius != null && summary.totalWithinRadius > summary.all) {
    return `Showing ${summary.all} of ${summary.totalWithinRadius} nearby places`
  }

  return "Showing closest places only"
}

export function shouldShowNeighbourhoodCategoryBar(
  categoryCount: number,
  isBackgroundFetching: boolean,
): boolean {
  return categoryCount > 0 || isBackgroundFetching
}

export function shouldShowNeighbourhoodCategoryDivider(
  categoryCount: number,
  isBackgroundFetching: boolean,
): boolean {
  return categoryCount > 0 && isBackgroundFetching
}
