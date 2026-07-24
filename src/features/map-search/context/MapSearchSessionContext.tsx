import { createContext, useContext } from "react"

import type { SearchBounds } from "../hooks/useMapBounds"
import type { MapSearchFilters } from "../filters/types"
import type { MapPosition, SearchBuilding, SearchedPlace } from "../types"

export type MapSearchStatus =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "error"
  | "stale"

export type MapSearchSource = "area" | "nearby" | "line"
export type MapSearchPurpose = "find" | "list"

export type MapSearchSessionContextValue = {
  searchedPlace: SearchedPlace | null
  buildings: SearchBuilding[]
  selectedBuilding: SearchBuilding | null
  buildingDetailFilters: MapSearchFilters
  selectedPin: MapPosition | null
  nearbyRadiusMeters: number
  linePoints: MapPosition[]
  lineDistanceMeters: number
  committedBounds: SearchBounds | null
  cameraRestoreVersion: number
  isPlaceSearchOpen: boolean
  isSearchingArea: boolean
  isSearchingNearby: boolean
  isSearchingLine: boolean
  isSearchActionVisible: boolean
  searchStatus: MapSearchStatus
  searchSource: MapSearchSource
  isListingSearch: boolean
  canCreateListing: boolean
  currentAgentProfileId?: string
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isRefreshingBuildings: boolean
  isBuildingSearchError: boolean
  pendingBuildingId: string | null
  isPendingBuildingUnresolved: boolean
  onPlaceFound: (place: SearchedPlace) => void
  onSearchArea: (bounds: SearchBounds) => void
  onDropPin: (position: MapPosition) => void
  onCurrentLocationFound: (position: MapPosition) => void
  onPinChange: (position: MapPosition) => void
  onMapMove: () => void
  onNearbyRadiusChange: (radiusMeters: number) => void
  onSearchNearby: () => void
  onClearPin: () => void
  onToggleLineMode: () => void
  onAddLinePoint: (position: MapPosition) => void
  onUndoLinePoint: () => void
  onLineDistanceChange: (distanceMeters: number) => void
  onSearchLine: () => void
  onBuildingSelect: (building: SearchBuilding | null) => void
  onBuildingHoverChange: (buildingId: string | null) => void
  onPlaceSearchOpenChange: (isOpen: boolean) => void
  onFetchNextPage: () => void
  onSearchAgain: () => void
  onExitListingSearch: () => void
  onListExistingBuilding: (building: SearchBuilding) => void
  onListNewBuilding: () => void
}

export type MapSearchCanvasContextValue = Pick<
  MapSearchSessionContextValue,
  | "searchedPlace"
  | "buildings"
  | "selectedBuilding"
  | "nearbyRadiusMeters"
  | "linePoints"
  | "lineDistanceMeters"
  | "committedBounds"
  | "cameraRestoreVersion"
  | "isPlaceSearchOpen"
  | "isListingSearch"
  | "onBuildingSelect"
  | "onPinChange"
  | "onAddLinePoint"
  | "onMapMove"
>

export type MapSearchControlsContextValue = Pick<
  MapSearchSessionContextValue,
  | "isSearchingArea"
  | "isSearchingNearby"
  | "isSearchingLine"
  | "isSearchActionVisible"
  | "searchStatus"
  | "nearbyRadiusMeters"
  | "linePoints"
  | "lineDistanceMeters"
  | "onSearchArea"
  | "onDropPin"
  | "onCurrentLocationFound"
  | "onSearchNearby"
  | "onClearPin"
  | "onNearbyRadiusChange"
  | "onToggleLineMode"
  | "onUndoLinePoint"
  | "onLineDistanceChange"
  | "onSearchLine"
>

export type MapSearchPlaceContextValue = Pick<
  MapSearchSessionContextValue,
  | "searchedPlace"
  | "currentAgentProfileId"
  | "onPlaceFound"
  | "onPlaceSearchOpenChange"
>

export type MapSearchResultsContextValue = Pick<
  MapSearchSessionContextValue,
  | "buildings"
  | "selectedBuilding"
  | "buildingDetailFilters"
  | "searchStatus"
  | "searchSource"
  | "isListingSearch"
  | "canCreateListing"
  | "selectedPin"
  | "hasNextPage"
  | "isFetchingNextPage"
  | "isRefreshingBuildings"
  | "isBuildingSearchError"
  | "pendingBuildingId"
  | "isPendingBuildingUnresolved"
  | "onBuildingSelect"
  | "onBuildingHoverChange"
  | "onFetchNextPage"
  | "onSearchAgain"
  | "onExitListingSearch"
  | "onListExistingBuilding"
  | "onListNewBuilding"
>

export const MapSearchCanvasContext =
  createContext<MapSearchCanvasContextValue | null>(null)
export const MapSearchControlsContext =
  createContext<MapSearchControlsContextValue | null>(null)
export const MapSearchPlaceContext =
  createContext<MapSearchPlaceContextValue | null>(null)
export const MapSearchResultsContext =
  createContext<MapSearchResultsContextValue | null>(null)

function useRequiredContext<T>(context: T | null, hookName: string): T {
  if (!context) {
    throw new Error(`${hookName} must be used within MapSearchPage`)
  }
  return context
}

export function useMapSearchCanvas() {
  return useRequiredContext(
    useContext(MapSearchCanvasContext),
    "useMapSearchCanvas",
  )
}

export function useMapSearchControls() {
  return useRequiredContext(
    useContext(MapSearchControlsContext),
    "useMapSearchControls",
  )
}

export function useMapSearchPlace() {
  return useRequiredContext(
    useContext(MapSearchPlaceContext),
    "useMapSearchPlace",
  )
}

export function useMapSearchResults() {
  return useRequiredContext(
    useContext(MapSearchResultsContext),
    "useMapSearchResults",
  )
}
