import { useMemo } from "react"

import type { MapSearchFilters } from "../filters/types"
import type { SearchBounds } from "./useMapBounds"
import {
  type MapSearchCanvasContextValue,
  type MapSearchControlsContextValue,
  type MapSearchPlaceContextValue,
  type MapSearchResultsContextValue,
  type MapSearchSessionContextValue,
  type MapSearchSource,
  type MapSearchStatus,
} from "../context/MapSearchSessionContext"
import type { MapSearchMarkerHighlightContextValue } from "../context/MapSearchMarkerHighlightContext"
import type { MapPosition, SearchBuilding, SearchedPlace } from "../types"

export type MapSearchSessionAssemblyCommands = Pick<
  MapSearchSessionContextValue,
  | "onPlaceFound"
  | "onSearchArea"
  | "onDropPin"
  | "onCurrentLocationFound"
  | "onPinChange"
  | "onMapMove"
  | "onNearbyRadiusChange"
  | "onSearchNearby"
  | "onClearPin"
  | "onToggleLineMode"
  | "onAddLinePoint"
  | "onUndoLinePoint"
  | "onLineDistanceChange"
  | "onSearchLine"
  | "onBuildingSelect"
  | "onListingSelect"
  | "onListingClose"
  | "onSearchAgain"
  | "onExitListingSearch"
  | "onListExistingBuilding"
  | "onListNewBuilding"
>

export type MapSearchSessionAssemblyBuildingSearch = {
  isSearchingArea: boolean
  isSearchingNearby: boolean
  isSearchingLine: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isRefreshing: boolean
  isError: boolean
}

export type UseMapSearchSessionAssemblyInput = {
  searchedPlace: SearchedPlace | null
  buildings: SearchBuilding[]
  activeSelectedBuilding: SearchBuilding | null
  hoveredBuildingId: string | null
  pendingBuildingId: string | null
  pendingListingId: string | null
  isPendingBuildingUnresolved: boolean
  selectedPin: MapPosition | null
  nearbyRadiusMeters: number
  linePoints: MapPosition[]
  lineDistanceMeters: number
  submittedBounds: SearchBounds | null
  cameraRestoreVersion: number
  isPlaceSearchOpen: boolean
  isListingSearch: boolean
  searchSource: MapSearchSource | null
  searchStatus: MapSearchStatus
  isSearchActionVisible: boolean
  currentAgentProfileId?: string
  canCreateListing: boolean
  buildingDetailFilters: MapSearchFilters
  buildingSearch: MapSearchSessionAssemblyBuildingSearch
  commands: MapSearchSessionAssemblyCommands
  onPlaceSearchOpenChange: (isOpen: boolean) => void
  onBuildingHoverChange: (buildingId: string | null) => void
  onFetchNextPage: () => void
}

export type MapSearchSessionAssembly = {
  canvas: MapSearchCanvasContextValue
  controls: MapSearchControlsContextValue
  place: MapSearchPlaceContextValue
  results: MapSearchResultsContextValue
  markerHighlight: MapSearchMarkerHighlightContextValue
}

export function useMapSearchSessionAssembly(
  input: UseMapSearchSessionAssemblyInput,
): MapSearchSessionAssembly {
  const {
    searchedPlace,
    buildings,
    activeSelectedBuilding,
    hoveredBuildingId,
    pendingBuildingId,
    pendingListingId,
    isPendingBuildingUnresolved,
    selectedPin,
    nearbyRadiusMeters,
    linePoints,
    lineDistanceMeters,
    submittedBounds,
    cameraRestoreVersion,
    isPlaceSearchOpen,
    isListingSearch,
    searchSource,
    searchStatus,
    isSearchActionVisible,
    currentAgentProfileId,
    canCreateListing,
    buildingDetailFilters,
    buildingSearch,
    commands,
    onPlaceSearchOpenChange,
    onBuildingHoverChange,
    onFetchNextPage,
  } = input

  const {
    onPlaceFound,
    onSearchArea,
    onDropPin,
    onCurrentLocationFound,
    onPinChange,
    onMapMove,
    onNearbyRadiusChange,
    onSearchNearby,
    onClearPin,
    onToggleLineMode,
    onAddLinePoint,
    onUndoLinePoint,
    onLineDistanceChange,
    onSearchLine,
    onBuildingSelect,
    onListingSelect,
    onListingClose,
    onSearchAgain,
    onExitListingSearch,
    onListExistingBuilding,
    onListNewBuilding,
  } = commands

  const selectedBuildingId = activeSelectedBuilding?._id ?? null

  const markerHighlight = useMemo<MapSearchMarkerHighlightContextValue>(
    () => ({
      hoveredBuildingId,
      selectedBuildingId,
    }),
    [hoveredBuildingId, selectedBuildingId],
  )

  const canvas = useMemo<MapSearchCanvasContextValue>(
    () => ({
      searchedPlace,
      buildings,
      selectedBuilding: activeSelectedBuilding,
      nearbyRadiusMeters,
      linePoints,
      lineDistanceMeters,
      committedBounds: submittedBounds,
      cameraRestoreVersion,
      isPlaceSearchOpen,
      isListingSearch,
      onBuildingSelect,
      onPinChange,
      onAddLinePoint,
      onMapMove,
    }),
    [
      searchedPlace,
      buildings,
      activeSelectedBuilding,
      nearbyRadiusMeters,
      linePoints,
      lineDistanceMeters,
      submittedBounds,
      cameraRestoreVersion,
      isPlaceSearchOpen,
      isListingSearch,
      onBuildingSelect,
      onPinChange,
      onAddLinePoint,
      onMapMove,
    ],
  )

  const controls = useMemo<MapSearchControlsContextValue>(
    () => ({
      isSearchingArea: buildingSearch.isSearchingArea,
      isSearchingNearby: buildingSearch.isSearchingNearby,
      isSearchingLine: buildingSearch.isSearchingLine,
      isSearchActionVisible,
      searchStatus,
      nearbyRadiusMeters,
      linePoints,
      lineDistanceMeters,
      onSearchArea,
      onDropPin,
      onCurrentLocationFound,
      onSearchNearby,
      onClearPin,
      onNearbyRadiusChange,
      onToggleLineMode,
      onUndoLinePoint,
      onLineDistanceChange,
      onSearchLine,
    }),
    [
      buildingSearch.isSearchingArea,
      buildingSearch.isSearchingNearby,
      buildingSearch.isSearchingLine,
      isSearchActionVisible,
      searchStatus,
      nearbyRadiusMeters,
      linePoints,
      lineDistanceMeters,
      onSearchArea,
      onDropPin,
      onCurrentLocationFound,
      onSearchNearby,
      onClearPin,
      onNearbyRadiusChange,
      onToggleLineMode,
      onUndoLinePoint,
      onLineDistanceChange,
      onSearchLine,
    ],
  )

  const place = useMemo<MapSearchPlaceContextValue>(
    () => ({
      searchedPlace,
      currentAgentProfileId,
      onPlaceFound,
      onPlaceSearchOpenChange,
    }),
    [
      searchedPlace,
      currentAgentProfileId,
      onPlaceFound,
      onPlaceSearchOpenChange,
    ],
  )

  const resolvedSearchSource: MapSearchSource = searchSource ?? "area"

  const results = useMemo<MapSearchResultsContextValue>(
    () => ({
      buildings,
      selectedBuilding: activeSelectedBuilding,
      buildingDetailFilters,
      searchStatus,
      searchSource: resolvedSearchSource,
      isListingSearch,
      canCreateListing,
      selectedPin,
      hasNextPage: buildingSearch.hasNextPage,
      isFetchingNextPage: buildingSearch.isFetchingNextPage,
      isRefreshingBuildings:
        activeSelectedBuilding === null && buildingSearch.isRefreshing,
      isBuildingSearchError: buildingSearch.isError,
      pendingBuildingId,
      pendingListingId,
      isPendingBuildingUnresolved,
      onBuildingSelect,
      onBuildingHoverChange,
      onFetchNextPage,
      onSearchAgain,
      onExitListingSearch,
      onListExistingBuilding,
      onListNewBuilding,
      onListingSelect,
      onListingClose,
    }),
    [
      activeSelectedBuilding,
      canCreateListing,
      buildingDetailFilters,
      buildingSearch.hasNextPage,
      buildingSearch.isError,
      buildingSearch.isFetchingNextPage,
      buildingSearch.isRefreshing,
      buildings,
      isListingSearch,
      isPendingBuildingUnresolved,
      onBuildingHoverChange,
      onBuildingSelect,
      onListingClose,
      onListingSelect,
      onExitListingSearch,
      onFetchNextPage,
      onListExistingBuilding,
      onListNewBuilding,
      onSearchAgain,
      pendingBuildingId,
      pendingListingId,
      resolvedSearchSource,
      searchStatus,
      selectedPin,
    ],
  )

  return { canvas, controls, place, results, markerHighlight }
}
