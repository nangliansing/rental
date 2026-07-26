import { useCallback, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { useMyAgentProfile } from "@/features/profile/api"

import {
  DEFAULT_MAP_SEARCH_FILTERS,
  useMapSearchFilterState,
} from "../context/MapSearchFilterContext"
import type { MapSearchSource } from "../context/MapSearchSessionContext"
import { useMapInteraction } from "../context/MapInteractionContext"
import type { SearchBuilding, SearchedPlace } from "../types"
import { useScopedMapSearchFilters } from "./useScopedMapSearchFilters"
import {
  buildActiveMapSearchUrlState,
  type MapSearchUrlState,
} from "../utils/map-search-url"
import { useEventCallback } from "./useEventCallback"
import { areMapPositionsEqual } from "../utils/map-position"
import {
  useMapBuildingSearch,
  type SubmittedMapBuildingSearch,
} from "./useMapBuildingSearch"
import { useMapSearchUrl } from "./useMapSearchUrl"
import { useMapSearchCommands } from "./useMapSearchCommands"
import { useMapSearchSessionAssembly } from "./useMapSearchSessionAssembly"

export function useMapSearchPageState(initialUrlState: MapSearchUrlState) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const mapInteraction = useMapInteraction()
  const { selectedPin } = mapInteraction
  const [searchedPlace, setSearchedPlace] = useState<SearchedPlace | null>(null)
  const [selectedBuilding, setSelectedBuilding] =
    useState<SearchBuilding | null>(null)
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(
    null,
  )
  const [isPlaceSearchOpen, setIsPlaceSearchOpen] = useState(false)
  const [isStale, setIsStale] = useState(false)
  const onFiltersChangedRef =
    useRef<(filters: typeof DEFAULT_MAP_SEARCH_FILTERS) => void>(() => {})

  const scopedFilters = useScopedMapSearchFilters({
    initialFilters: initialUrlState.filters,
  })
  const { commitFilters } = scopedFilters

  const filterState = useMapSearchFilterState({
    onFiltersChanged: (filters) => onFiltersChangedRef.current(filters),
    initialFilters: initialUrlState.filters,
  })
  const { submittedFilters, submitFilters } = filterState

  const onPopRestore = useEventCallback((restored: MapSearchUrlState) => {
    filterState.applyFilters(restored.filters)
    commitFilters("building-list", restored.filters)
    commitFilters("building-detail", restored.filters)
    setSelectedBuilding(null)
    if (restored.position) {
      mapInteraction.enterManualPinMode(restored.position)
    } else {
      mapInteraction.exitPinMode()
    }
  })

  const urlState = useMapSearchUrl({ initialUrlState, onPopRestore })
  const {
    isListingSearch,
    searchSource,
    setSearchSource,
    submittedBounds,
    setSubmittedBounds,
    submittedNearbyPosition,
    setSubmittedNearbyPosition,
    nearbyRadiusMeters,
    setNearbyRadiusMeters,
    lineDistanceMeters,
    setLineDistanceMeters,
    linePoints,
    setLinePoints,
    submittedLineGeometry,
    setSubmittedLineGeometry,
    submittedLinePoints,
    pendingBuildingId,
    setPendingBuildingId,
    pendingListingId,
    cameraRestoreVersion,
    updateSearchUrl,
    clearListingPurpose,
    isHydratingUrlRef,
  } = urlState

  const handleCommittedFiltersChanged = useCallback(
    (filters: typeof DEFAULT_MAP_SEARCH_FILTERS) => {
      setHoveredBuildingId(null)
      const hasUnsubmittedLineEdit =
        searchSource === "line" &&
        !areMapPositionsEqual(linePoints, submittedLinePoints)
      setIsStale(hasUnsubmittedLineEdit)
      commitFilters(
        selectedBuilding || pendingBuildingId
          ? "building-detail"
          : "building-list",
        filters,
      )
      if (!isHydratingUrlRef.current && searchSource) {
        updateSearchUrl(
          buildActiveMapSearchUrlState({
            searchSource,
            submittedBounds,
            submittedNearbyPosition,
            submittedLinePoints,
            lineDistanceMeters,
            nearbyRadiusMeters,
            filters,
            buildingId: selectedBuilding?._id ?? pendingBuildingId,
            listingId: pendingListingId,
          }),
          true,
        )
      }
    },
    [
      commitFilters,
      lineDistanceMeters,
      linePoints,
      nearbyRadiusMeters,
      submittedLinePoints,
      searchSource,
      selectedBuilding,
      pendingBuildingId,
      pendingListingId,
      submittedBounds,
      submittedNearbyPosition,
      updateSearchUrl,
      isHydratingUrlRef,
    ],
  )

  onFiltersChangedRef.current = handleCommittedFiltersChanged

  const agentProfileQuery = useMyAgentProfile({
    enabled: isAuthenticated,
  })

  const activeSearchSource: MapSearchSource =
    mapInteraction.mode === "line"
      ? "line"
      : selectedPin
        ? "nearby"
        : "area"

  const submittedBuildingSearch = useMemo<SubmittedMapBuildingSearch>(() => {
    if (searchSource === "area") {
      return { source: "area", bounds: submittedBounds }
    }
    if (searchSource === "nearby") {
      return {
        source: "nearby",
        position: submittedNearbyPosition,
        radiusMeters: nearbyRadiusMeters,
      }
    }
    if (searchSource === "line") {
      return {
        source: "line",
        geometry: submittedLineGeometry,
        distanceMeters: lineDistanceMeters,
      }
    }
    return { source: null }
  }, [
    lineDistanceMeters,
    nearbyRadiusMeters,
    searchSource,
    submittedBounds,
    submittedLineGeometry,
    submittedNearbyPosition,
  ])

  const buildingSearch = useMapBuildingSearch({
    search: submittedBuildingSearch,
    activeSource: activeSearchSource,
    filters: scopedFilters.buildingListFilters,
    isStale,
    hasSelectedBuilding: selectedBuilding !== null,
    includeBuildingsWithoutMatchingListings: isListingSearch,
  })

  const { buildings } = buildingSearch
  const urlSelectedBuilding = useMemo(
    () =>
      pendingBuildingId
        ? buildings.find((building) => building._id === pendingBuildingId) ??
          null
        : null,
    [buildings, pendingBuildingId],
  )
  const activeSelectedBuilding = selectedBuilding ?? urlSelectedBuilding

  const searchStatus = buildingSearch.status
  const isPendingBuildingUnresolved = useMemo(() => {
    if (!pendingBuildingId || selectedBuilding) return false
    if (searchStatus === "loading" || searchStatus === "idle") return false
    return !buildings.some((building) => building._id === pendingBuildingId)
  }, [buildings, pendingBuildingId, searchStatus, selectedBuilding])

  const isSearchActionVisible =
    searchSource !== activeSearchSource ||
    buildingSearch.isActiveSourceFetching ||
    searchStatus === "idle" ||
    searchStatus === "loading" ||
    searchStatus === "error" ||
    searchStatus === "stale"

  const commands = useMapSearchCommands({
    mapInteraction,
    selectedPin,
    searchSource,
    submittedBounds,
    submittedNearbyPosition,
    submittedLineGeometry,
    submittedLinePoints,
    nearbyRadiusMeters,
    lineDistanceMeters,
    linePoints,
    submittedFilters,
    activeSelectedBuilding,
    pendingBuildingId,
    pendingListingId,
    setSearchSource,
    setSubmittedBounds,
    setSubmittedNearbyPosition,
    setSubmittedLineGeometry,
    setNearbyRadiusMeters,
    setLineDistanceMeters,
    setLinePoints,
    setPendingBuildingId,
    setIsStale,
    setSearchedPlace,
    setSelectedBuilding,
    setHoveredBuildingId,
    updateSearchUrl,
    clearListingPurpose,
    submitFilters,
    scopedFilters,
    navigate,
    refetchActiveSearch: buildingSearch.refetchActiveSearch,
  })

  const onPlaceSearchOpenChange = useEventCallback(setIsPlaceSearchOpen)
  const onBuildingHoverChange = useEventCallback(setHoveredBuildingId)
  const onFetchNextPage = useEventCallback(buildingSearch.fetchNextPage)

  const session = useMapSearchSessionAssembly({
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
    currentAgentProfileId: agentProfileQuery.data?._id,
    canCreateListing: agentProfileQuery.canCreateListing,
    buildingDetailFilters: scopedFilters.buildingDetailFilters,
    buildingSearch,
    commands: {
      onPlaceFound: commands.onPlaceFound,
      onSearchArea: commands.onSearchArea,
      onDropPin: commands.onDropPin,
      onCurrentLocationFound: commands.onCurrentLocationFound,
      onPinChange: commands.onPinChange,
      onMapMove: commands.onMapMove,
      onNearbyRadiusChange: commands.onNearbyRadiusChange,
      onSearchNearby: commands.onSearchNearby,
      onClearPin: commands.onClearPin,
      onToggleLineMode: commands.onToggleLineMode,
      onAddLinePoint: commands.onAddLinePoint,
      onUndoLinePoint: commands.onUndoLinePoint,
      onLineDistanceChange: commands.onLineDistanceChange,
      onSearchLine: commands.onSearchLine,
      onBuildingSelect: commands.onBuildingSelect,
      onListingSelect: commands.onListingSelect,
      onListingClose: commands.onListingClose,
      onSearchAgain: commands.onSearchAgain,
      onExitListingSearch: commands.onExitListingSearch,
      onListExistingBuilding: commands.onListExistingBuilding,
      onListNewBuilding: commands.onListNewBuilding,
    },
    onPlaceSearchOpenChange,
    onBuildingHoverChange,
    onFetchNextPage,
  })

  return {
    filterState,
    searchStatus,
    isPlaceSearchOpen,
    session,
  }
}
