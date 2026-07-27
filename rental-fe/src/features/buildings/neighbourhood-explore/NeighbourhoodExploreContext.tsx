import { useContext } from "react"

import type { FilterPillOption } from "@/shared/components/inputs/FilterPills"

import type {
  BuildingNeighbourhood,
  NeighbourhoodPlace,
} from "../api/getBuildingNeighbourhood"
import type { NeighbourhoodRadiusMeters } from "../constants/neighbourhood"
import {
  NeighbourhoodExploreDataContext,
  type NeighbourhoodExploreDataContextValue,
  type NeighbourhoodExploreOrigin,
} from "./context/NeighbourhoodExploreDataContext"
import {
  NeighbourhoodExploreSelectionContext,
  type NeighbourhoodExploreSelectionContextValue,
} from "./context/NeighbourhoodExploreSelectionContext"
import type { NeighbourhoodCategoryFilter } from "./utils/filterNeighbourhoodPlaces"

export type NeighbourhoodExploreContextValue =
  NeighbourhoodExploreDataContextValue &
    NeighbourhoodExploreSelectionContextValue

export function useNeighbourhoodExploreData(): NeighbourhoodExploreDataContextValue {
  const context = useContext(NeighbourhoodExploreDataContext)

  if (!context) {
    throw new Error(
      "useNeighbourhoodExploreData must be used within NeighbourhoodExploreProvider",
    )
  }

  return context
}

/**
 * Shared active-place state for neighbourhood explore.
 *
 * Interaction contract:
 * - Map pins and list rows call `selectPlace(id)` — they never talk to each other directly.
 * - `NeighbourhoodExploreListPlaceSync` scrolls the active list item into view when needed.
 * - `NeighbourhoodExploreMapPlaceSync` pans the map to the active pin when needed.
 *
 * Both sync helpers no-op when the target is already visible.
 */
export function useNeighbourhoodExploreSelection(): NeighbourhoodExploreSelectionContextValue {
  const context = useContext(NeighbourhoodExploreSelectionContext)

  if (!context) {
    throw new Error(
      "useNeighbourhoodExploreSelection must be used within NeighbourhoodExploreProvider",
    )
  }

  return context
}

export function useNeighbourhoodExplore(): NeighbourhoodExploreContextValue {
  const data = useNeighbourhoodExploreData()
  const selection = useNeighbourhoodExploreSelection()

  return { ...data, ...selection }
}

export type {
  NeighbourhoodExploreDataContextValue,
  NeighbourhoodExploreSelectionContextValue,
  NeighbourhoodExploreOrigin,
  BuildingNeighbourhood,
  NeighbourhoodPlace,
  NeighbourhoodRadiusMeters,
  NeighbourhoodCategoryFilter,
  FilterPillOption,
}
