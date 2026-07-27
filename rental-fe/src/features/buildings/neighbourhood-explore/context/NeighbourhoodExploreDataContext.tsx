import { createContext } from "react"

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

export type NeighbourhoodExploreDataContextValue = {
  neighbourhood: BuildingNeighbourhood | undefined
  origin: NeighbourhoodExploreOrigin | null
  visiblePlaces: NeighbourhoodPlace[]
  categoryPillOptions: FilterPillOption<string>[]
  radiusMeters: NeighbourhoodRadiusMeters
  selectedCategory: NeighbourhoodCategoryFilter
  isInitialLoading: boolean
  isInitialError: boolean
  isBackgroundFetching: boolean
  showMap: boolean
  setRadius: (value: string | undefined) => void
  setCategory: (value: string | undefined) => void
  refetch: () => void
}

export const NeighbourhoodExploreDataContext =
  createContext<NeighbourhoodExploreDataContextValue | null>(null)
