import { createContext } from "react"

import type { NeighbourhoodPlace } from "../../api/getBuildingNeighbourhood"

export type NeighbourhoodExploreSelectionContextValue = {
  selectedPlaceId: string | null
  selectedPlace: NeighbourhoodPlace | null
  selectedPlaceRevision: number
  selectPlace: (placeId: string | null) => void
}

export const NeighbourhoodExploreSelectionContext =
  createContext<NeighbourhoodExploreSelectionContextValue | null>(null)
