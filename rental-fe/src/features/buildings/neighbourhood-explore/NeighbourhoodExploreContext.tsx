import type { UseQueryResult } from "@tanstack/react-query"
import { createContext, useContext } from "react"

import type { FilterPillOption } from "@/shared/components/inputs/FilterPills"

import type {
  BuildingNeighbourhood,
  NeighbourhoodPlace,
} from "../../api/getBuildingNeighbourhood"
import type { NeighbourhoodRadiusMeters } from "../../constants/neighbourhood"
import type { NeighbourhoodCategoryFilter } from "../utils/filterNeighbourhoodPlaces"

export type NeighbourhoodExploreOrigin = {
  lat: number
  lng: number
}

export type NeighbourhoodExploreContextValue = {
  neighbourhood: BuildingNeighbourhood | undefined
  neighbourhoodQuery: UseQueryResult<BuildingNeighbourhood, Error>
  origin: NeighbourhoodExploreOrigin | null
  visiblePlaces: NeighbourhoodPlace[]
  categoryPillOptions: FilterPillOption<string>[]
  radiusMeters: NeighbourhoodRadiusMeters
  selectedCategory: NeighbourhoodCategoryFilter
  selectedPlaceId: string | null
  selectedPlace: NeighbourhoodPlace | null
  isInitialLoading: boolean
  isInitialError: boolean
  isBackgroundFetching: boolean
  showMap: boolean
  setRadius: (value: string | undefined) => void
  setCategory: (value: string | undefined) => void
  selectPlace: (placeId: string | null) => void
  refetch: () => void
}

export const NeighbourhoodExploreContext =
  createContext<NeighbourhoodExploreContextValue | null>(null)

export function useNeighbourhoodExplore() {
  const context = useContext(NeighbourhoodExploreContext)

  if (!context) {
    throw new Error(
      "useNeighbourhoodExplore must be used within NeighbourhoodExploreProvider",
    )
  }

  return context
}
