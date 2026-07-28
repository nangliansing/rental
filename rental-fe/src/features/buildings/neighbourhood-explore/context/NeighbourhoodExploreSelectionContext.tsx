import { createContext } from "react"

import type { NeighbourhoodPlace } from "../../api/getBuildingNeighbourhood"

export type SelectPlaceOptions = {
  scrollIntoView?: boolean
}

/** List rows are already on screen when clicked. */
export const SELECT_PLACE_WITHOUT_LIST_SCROLL = {
  scrollIntoView: false,
} as const satisfies SelectPlaceOptions

export type NeighbourhoodExploreSelectionContextValue = {
  selectedPlaceId: string | null
  selectedPlace: NeighbourhoodPlace | null
  selectedPlaceRevision: number
  shouldScrollSelectedPlaceIntoView: boolean
  selectPlace: (placeId: string | null, options?: SelectPlaceOptions) => void
}

export const NeighbourhoodExploreSelectionContext =
  createContext<NeighbourhoodExploreSelectionContextValue | null>(null)
