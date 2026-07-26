import { useCallback, type Dispatch, type SetStateAction } from "react"
import type { NavigateFunction } from "react-router-dom"

import type { MapSearchFilters } from "../filters/types"
import { MAX_LINE_SEARCH_POINTS } from "../constants"
import type { MapInteractionContextValue } from "../context/MapInteractionContext"
import type { SearchBounds } from "./useMapBounds"
import type {
  LineStringGeometry,
  MapPosition,
  SearchBuilding,
  SearchedPlace,
} from "../types"
import {
  buildActiveMapSearchUrlState,
  linePointsToGeometry,
  type CommittedMapSearchUrlState,
  type MapSearchUrlState,
} from "../utils/map-search-url"
import { isSupportedSearchRadius } from "../utils/search-radius"
import { useEventCallback } from "./useEventCallback"
import {
  isValidMapPosition,
  isValidSearchBounds,
} from "../utils/map-position"
import type { MapSearchSource } from "../context/MapSearchSessionContext"

type ScopedFilterActions = {
  enterBuildingDetail: (filters: MapSearchFilters) => void
  enterBuildingList: (filters: MapSearchFilters) => void
}

type UseMapSearchCommandsInput = {
  mapInteraction: MapInteractionContextValue
  selectedPin: MapPosition | null
  searchSource: MapSearchSource | null
  submittedBounds: SearchBounds | null
  submittedNearbyPosition: MapPosition | null
  submittedLineGeometry: LineStringGeometry | null
  submittedLinePoints: MapPosition[]
  nearbyRadiusMeters: number
  lineDistanceMeters: number
  linePoints: MapPosition[]
  submittedFilters: MapSearchFilters
  activeSelectedBuilding: SearchBuilding | null
  pendingBuildingId: string | null
  pendingListingId: string | null
  setSearchSource: (source: MapSearchSource | null) => void
  setSubmittedBounds: (bounds: SearchBounds | null) => void
  setSubmittedNearbyPosition: (position: MapPosition | null) => void
  setSubmittedLineGeometry: (geometry: LineStringGeometry | null) => void
  setNearbyRadiusMeters: (radiusMeters: number) => void
  setLineDistanceMeters: (distanceMeters: number) => void
  setLinePoints: Dispatch<SetStateAction<MapPosition[]>>
  setPendingBuildingId: (buildingId: string | null) => void
  setIsStale: (isStale: boolean) => void
  setSearchedPlace: (place: SearchedPlace | null) => void
  setSelectedBuilding: (building: SearchBuilding | null) => void
  setHoveredBuildingId: (buildingId: string | null) => void
  updateSearchUrl: (state: MapSearchUrlState, replace?: boolean) => void
  clearListingPurpose: () => void
  submitFilters: () => MapSearchFilters
  scopedFilters: ScopedFilterActions
  navigate: NavigateFunction
  refetchActiveSearch: () => Promise<unknown>
}

function buildCurrentSearchUrlState({
  searchSource,
  submittedBounds,
  submittedNearbyPosition,
  submittedLinePoints,
  lineDistanceMeters,
  nearbyRadiusMeters,
  submittedFilters,
  buildingId,
  listingId = null,
}: Pick<
  UseMapSearchCommandsInput,
  | "searchSource"
  | "submittedBounds"
  | "submittedNearbyPosition"
  | "submittedLinePoints"
  | "lineDistanceMeters"
  | "nearbyRadiusMeters"
  | "submittedFilters"
> & { buildingId: string | null; listingId?: string | null }) {
  return buildActiveMapSearchUrlState({
    searchSource,
    submittedBounds,
    submittedNearbyPosition,
    submittedLinePoints,
    lineDistanceMeters,
    nearbyRadiusMeters,
    filters: submittedFilters,
    buildingId,
    listingId,
  })
}

export function useMapSearchCommands(input: UseMapSearchCommandsInput) {
  const {
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
    refetchActiveSearch,
  } = input

  const clearBuildingSelection = useCallback(() => {
    setSelectedBuilding(null)
    setHoveredBuildingId(null)
  }, [setHoveredBuildingId, setSelectedBuilding])

  const clearActiveSearchForModeChange = useCallback(() => {
    clearBuildingSelection()
    setSearchedPlace(null)
    setSearchSource(null)
    setIsStale(false)
    setPendingBuildingId(null)
    updateSearchUrl({
      source: null,
      bounds: null,
      position: null,
      linePoints: [],
      radiusMeters: nearbyRadiusMeters,
      filters: submittedFilters,
      buildingId: null,
      listingId: null,
    })
  }, [
    clearBuildingSelection,
    nearbyRadiusMeters,
    setIsStale,
    setPendingBuildingId,
    setSearchSource,
    setSearchedPlace,
    submittedFilters,
    updateSearchUrl,
  ])

  const commitBuildingSearch = useCallback(
    (state: CommittedMapSearchUrlState) => {
      clearBuildingSelection()
      const filters = submitFilters()
      setSearchSource(state.source)
      setIsStale(false)
      updateSearchUrl({ ...state, filters })
    },
    [clearBuildingSelection, setIsStale, setSearchSource, submitFilters, updateSearchUrl],
  )

  const markLineResultsStale = useCallback(() => {
    if (searchSource === "line") setIsStale(true)
  }, [searchSource, setIsStale])

  const handlePlaceFound = useCallback(
    (place: SearchedPlace) => {
      if (!isValidMapPosition(place.position)) return
      setSearchedPlace(place)

      if (selectedPin) {
        mapInteraction.enterManualPinMode(place.position)
        if (searchSource === "nearby") setIsStale(true)
      }
    },
    [mapInteraction, searchSource, selectedPin, setIsStale, setSearchedPlace],
  )

  const handleSearchArea = useCallback(
    (bounds: SearchBounds) => {
      if (!isValidSearchBounds(bounds)) return
      setSubmittedBounds(bounds)
      commitBuildingSearch({
        source: "area",
        bounds,
        position: null,
        linePoints: [],
        radiusMeters: nearbyRadiusMeters,
        buildingId: null,
        listingId: null,
      })
    },
    [commitBuildingSearch, nearbyRadiusMeters, setSubmittedBounds],
  )

  const handleSearchNearby = useCallback(
    (position = selectedPin) => {
      if (!isValidMapPosition(position)) return

      setSubmittedNearbyPosition(position)
      commitBuildingSearch({
        source: "nearby",
        bounds: null,
        position,
        linePoints: [],
        radiusMeters: nearbyRadiusMeters,
        buildingId: null,
        listingId: null,
      })
    },
    [commitBuildingSearch, nearbyRadiusMeters, selectedPin, setSubmittedNearbyPosition],
  )

  const handleDropPin = useCallback(
    (position: MapPosition) => {
      if (!isValidMapPosition(position)) return
      if (mapInteraction.mode !== "pin") clearActiveSearchForModeChange()
      mapInteraction.enterManualPinMode(position)
    },
    [clearActiveSearchForModeChange, mapInteraction],
  )

  const handleToggleLineMode = useCallback(() => {
    clearActiveSearchForModeChange()
    if (mapInteraction.mode === "line") {
      mapInteraction.exitLineMode()
    } else {
      mapInteraction.enterLineMode()
    }
  }, [clearActiveSearchForModeChange, mapInteraction])

  const handleAddLinePoint = useCallback(
    (position: MapPosition) => {
      if (!isValidMapPosition(position)) return
      setLinePoints((points) => {
        if (points.length >= MAX_LINE_SEARCH_POINTS) return points
        return [...points, position]
      })
      clearBuildingSelection()
      markLineResultsStale()
    },
    [clearBuildingSelection, markLineResultsStale, setLinePoints],
  )

  const handleUndoLinePoint = useCallback(() => {
    setLinePoints((points) => points.slice(0, -1))
    clearBuildingSelection()
    markLineResultsStale()
  }, [clearBuildingSelection, markLineResultsStale, setLinePoints])

  const handleSearchLine = useCallback(() => {
    if (
      linePoints.length < 2 ||
      !linePoints.every(isValidMapPosition) ||
      !isSupportedSearchRadius(lineDistanceMeters)
    ) {
      return
    }

    const geometry = linePointsToGeometry(linePoints)
    if (!geometry) return

    setSubmittedLineGeometry(geometry)
    commitBuildingSearch({
      source: "line",
      bounds: null,
      position: null,
      linePoints,
      radiusMeters: lineDistanceMeters,
      buildingId: null,
      listingId: null,
    })
  }, [
    commitBuildingSearch,
    lineDistanceMeters,
    linePoints,
    setSubmittedLineGeometry,
  ])

  const handleCurrentLocationFound = useCallback(
    (position: MapPosition) => {
      if (!isValidMapPosition(position)) return
      if (mapInteraction.mode !== "pin") {
        clearActiveSearchForModeChange()
      } else {
        clearBuildingSelection()
      }
      mapInteraction.enterCurrentLocationMode(position)

      if (searchSource === "nearby") setIsStale(true)
    },
    [
      clearActiveSearchForModeChange,
      clearBuildingSelection,
      mapInteraction,
      searchSource,
      setIsStale,
    ],
  )

  const handlePinChange = useCallback(
    (position: MapPosition) => {
      if (!isValidMapPosition(position)) return
      mapInteraction.movePin(position)
      clearBuildingSelection()

      if (searchSource === "nearby") {
        setIsStale(true)
      }
    },
    [clearBuildingSelection, mapInteraction, searchSource, setIsStale],
  )

  const handleMapMove = useCallback(() => {
    if (searchSource === "area" && selectedPin === null) {
      setIsStale(true)
    }
  }, [searchSource, selectedPin, setIsStale])

  const handleNearbyRadiusChange = useCallback(
    (radiusMeters: number) => {
      if (!isSupportedSearchRadius(radiusMeters)) return
      setNearbyRadiusMeters(radiusMeters)
      if (searchSource === "nearby") setIsStale(true)
    },
    [searchSource, setIsStale, setNearbyRadiusMeters],
  )

  const handleLineDistanceChange = useCallback(
    (distanceMeters: number) => {
      if (!isSupportedSearchRadius(distanceMeters)) return
      setLineDistanceMeters(distanceMeters)
      if (searchSource === "line") setIsStale(true)
    },
    [searchSource, setIsStale, setLineDistanceMeters],
  )

  const handleClearPin = useCallback(() => {
    mapInteraction.exitPinMode()
    setSearchedPlace(null)
    setSubmittedNearbyPosition(null)
    clearBuildingSelection()

    if (searchSource === "nearby") {
      const nextSource = submittedBounds ? "area" : null
      setSearchSource(nextSource)
      setIsStale(false)
      updateSearchUrl({
        source: nextSource,
        bounds: submittedBounds,
        position: null,
        linePoints: [],
        radiusMeters: nearbyRadiusMeters,
        filters: submittedFilters,
        buildingId: null,
        listingId: null,
      })
    }
  }, [
    clearBuildingSelection,
    mapInteraction,
    nearbyRadiusMeters,
    searchSource,
    setIsStale,
    setSearchSource,
    setSearchedPlace,
    setSubmittedNearbyPosition,
    submittedBounds,
    submittedFilters,
    updateSearchUrl,
  ])

  const handleListExistingBuilding = useCallback(
    (building: SearchBuilding) => {
      if (!building._id?.trim()) return
      navigate(`/listings/new?buildingId=${building._id}`)
    },
    [navigate],
  )

  const handleListNewBuilding = useCallback(() => {
    if (!isValidMapPosition(selectedPin)) return

    navigate(`/listings/new?lat=${selectedPin.lat}&lng=${selectedPin.lng}`)
  }, [navigate, selectedPin])

  const handleBuildingSelect = useCallback(
    (building: SearchBuilding | null) => {
      setHoveredBuildingId(null)

      if (building) {
        scopedFilters.enterBuildingDetail(submittedFilters)
      } else {
        scopedFilters.enterBuildingList(submittedFilters)
      }

      setSelectedBuilding(building)
      setPendingBuildingId(null)
      updateSearchUrl(
        buildCurrentSearchUrlState({
          searchSource,
          submittedBounds,
          submittedNearbyPosition,
          submittedLinePoints,
          lineDistanceMeters,
          nearbyRadiusMeters,
          submittedFilters,
          buildingId: building?._id ?? null,
          listingId: null,
        }),
      )
    },
    [
      lineDistanceMeters,
      nearbyRadiusMeters,
      scopedFilters,
      searchSource,
      setHoveredBuildingId,
      setPendingBuildingId,
      setSelectedBuilding,
      submittedBounds,
      submittedFilters,
      submittedLinePoints,
      submittedNearbyPosition,
      updateSearchUrl,
    ],
  )

  const handleListingSelect = useCallback(
    (listingId: string) => {
      const buildingId = activeSelectedBuilding?._id ?? pendingBuildingId
      if (!buildingId) return

      updateSearchUrl(
        buildCurrentSearchUrlState({
          searchSource,
          submittedBounds,
          submittedNearbyPosition,
          submittedLinePoints,
          lineDistanceMeters,
          nearbyRadiusMeters,
          submittedFilters,
          buildingId,
          listingId,
        }),
        false,
      )
    },
    [
      activeSelectedBuilding,
      lineDistanceMeters,
      nearbyRadiusMeters,
      pendingBuildingId,
      searchSource,
      submittedBounds,
      submittedFilters,
      submittedLinePoints,
      submittedNearbyPosition,
      updateSearchUrl,
    ],
  )

  const handleListingClose = useCallback(() => {
    if (!pendingListingId) return
    navigate(-1)
  }, [navigate, pendingListingId])

  const handleSearchAgain = useCallback(() => {
    if (searchSource === "nearby" && submittedNearbyPosition) {
      handleSearchNearby(submittedNearbyPosition)
      void refetchActiveSearch()
      return
    }

    if (
      searchSource === "line" &&
      submittedLineGeometry &&
      submittedLinePoints.length >= 2 &&
      isSupportedSearchRadius(lineDistanceMeters)
    ) {
      setSubmittedLineGeometry(submittedLineGeometry)
      commitBuildingSearch({
        source: "line",
        bounds: null,
        position: null,
        linePoints: submittedLinePoints,
        radiusMeters: lineDistanceMeters,
        buildingId: null,
        listingId: null,
      })
      void refetchActiveSearch()
      return
    }

    if (submittedBounds) {
      handleSearchArea(submittedBounds)
    }

    void refetchActiveSearch()
  }, [
    commitBuildingSearch,
    handleSearchArea,
    handleSearchNearby,
    lineDistanceMeters,
    refetchActiveSearch,
    searchSource,
    setSubmittedLineGeometry,
    submittedBounds,
    submittedLineGeometry,
    submittedLinePoints,
    submittedNearbyPosition,
  ])

  const handleExitListingSearch = useCallback(() => {
    clearListingPurpose()

    if (searchSource !== null && !activeSelectedBuilding) {
      setIsStale(true)
    }
  }, [activeSelectedBuilding, clearListingPurpose, searchSource, setIsStale])

  return {
    onPlaceFound: useEventCallback(handlePlaceFound),
    onSearchArea: useEventCallback(handleSearchArea),
    onSearchNearby: useEventCallback(() => handleSearchNearby()),
    onDropPin: useEventCallback(handleDropPin),
    onToggleLineMode: useEventCallback(handleToggleLineMode),
    onAddLinePoint: useEventCallback(handleAddLinePoint),
    onUndoLinePoint: useEventCallback(handleUndoLinePoint),
    onSearchLine: useEventCallback(handleSearchLine),
    onCurrentLocationFound: useEventCallback(handleCurrentLocationFound),
    onPinChange: useEventCallback(handlePinChange),
    onMapMove: useEventCallback(handleMapMove),
    onNearbyRadiusChange: useEventCallback(handleNearbyRadiusChange),
    onLineDistanceChange: useEventCallback(handleLineDistanceChange),
    onClearPin: useEventCallback(handleClearPin),
    onBuildingSelect: useEventCallback(handleBuildingSelect),
    onListingSelect: useEventCallback(handleListingSelect),
    onListingClose: useEventCallback(handleListingClose),
    onSearchAgain: useEventCallback(handleSearchAgain),
    onExitListingSearch: useEventCallback(handleExitListingSearch),
    onListExistingBuilding: useEventCallback(handleListExistingBuilding),
    onListNewBuilding: useEventCallback(handleListNewBuilding),
  }
}
