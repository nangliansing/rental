export const NEIGHBOURHOOD_EXPLORE_MODAL_LABEL = "Explore neighbourhood"

export const NEIGHBOURHOOD_EXPLORE_MODAL_DESCRIPTION =
  "What's nearby this building"

export const NEIGHBOURHOOD_EXPLORE_CLOSE_LABEL =
  "Close explore neighbourhood"

export const NEIGHBOURHOOD_CATEGORY_BAR_GRADIENT_CLASS =
  "pointer-events-auto bg-gradient-to-b from-white/95 via-white/70 to-transparent pb-4 pt-2.5"

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
