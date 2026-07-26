import type { NeighbourhoodCategoryKey, NeighbourhoodPlace } from "../../api/getBuildingNeighbourhood"
import { NEIGHBOURHOOD_ALL_CATEGORY_KEY } from "../../constants/neighbourhood"

export type NeighbourhoodCategoryFilter =
  | typeof NEIGHBOURHOOD_ALL_CATEGORY_KEY
  | NeighbourhoodCategoryKey

export function filterNeighbourhoodPlaces(
  places: NeighbourhoodPlace[],
  categoryKey: NeighbourhoodCategoryFilter,
) {
  if (categoryKey === NEIGHBOURHOOD_ALL_CATEGORY_KEY) {
    return places
  }

  return places.filter((place) => place.category === categoryKey)
}
