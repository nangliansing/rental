import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  useNavigationType,
  useSearchParams,
} from "react-router-dom"

import { DEFAULT_MAP_SEARCH_FILTERS } from "../context/MapSearchFilterContext"
import type { MapSearchPurpose } from "../context/MapSearchSessionContext"
import {
  MAP_SEARCH_LIST_PURPOSE,
  MAP_SEARCH_PURPOSE_PARAM,
} from "../constants"
import type { SearchBounds } from "./useMapBounds"
import type { LineStringGeometry, MapPosition } from "../types"
import { useEventCallback } from "./useEventCallback"
import {
  createSubmittedSearchStateFromUrl,
  linePointsToGeometry,
  parseMapSearchUrl,
  writeMapSearchUrl,
  type CommittedMapSearchUrlState,
  type MapSearchUrlState,
} from "../utils/map-search-url"
import type { MapSearchSource } from "../context/MapSearchSessionContext"

export type { CommittedMapSearchUrlState, MapSearchUrlState }

type UseMapSearchUrlOptions = {
  initialUrlState: MapSearchUrlState
  onPopRestore: (restored: MapSearchUrlState) => void
}

export function useMapSearchUrl({
  initialUrlState,
  onPopRestore,
}: UseMapSearchUrlOptions) {
  const navigationType = useNavigationType()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSubmittedState = useMemo(
    () => createSubmittedSearchStateFromUrl(initialUrlState),
    [initialUrlState],
  )
  const searchPurpose: MapSearchPurpose =
    searchParams.get(MAP_SEARCH_PURPOSE_PARAM) === MAP_SEARCH_LIST_PURPOSE
      ? "list"
      : "find"
  const isListingSearch = searchPurpose === "list"
  const [searchSource, setSearchSource] = useState<MapSearchSource | null>(
    initialSubmittedState.searchSource,
  )
  const [submittedBounds, setSubmittedBounds] = useState<SearchBounds | null>(
    initialSubmittedState.submittedBounds,
  )
  const [submittedNearbyPosition, setSubmittedNearbyPosition] =
    useState<MapPosition | null>(initialSubmittedState.submittedNearbyPosition)
  const [nearbyRadiusMeters, setNearbyRadiusMeters] = useState(
    initialSubmittedState.nearbyRadiusMeters,
  )
  const [lineDistanceMeters, setLineDistanceMeters] = useState(
    initialSubmittedState.lineDistanceMeters,
  )
  const [linePoints, setLinePoints] = useState<MapPosition[]>(
    initialSubmittedState.linePoints,
  )
  const [submittedLineGeometry, setSubmittedLineGeometry] =
    useState<LineStringGeometry | null>(
      initialSubmittedState.submittedLineGeometry,
    )
  const submittedLinePoints = useMemo(
    () =>
      submittedLineGeometry?.coordinates.map(([lng, lat]) => ({ lat, lng })) ??
      [],
    [submittedLineGeometry],
  )
  const [pendingBuildingId, setPendingBuildingId] = useState(
    initialSubmittedState.pendingBuildingId,
  )
  const [cameraRestoreVersion, setCameraRestoreVersion] = useState(
    initialSubmittedState.cameraRestoreVersion,
  )
  const isHydratingUrlRef = useRef(false)
  const lastRestoredUrlRef = useRef(searchParams.toString())
  const onPopRestoreRef = useEventCallback(onPopRestore)

  const applySubmittedSearchState = useCallback((state: MapSearchUrlState) => {
    const submitted = createSubmittedSearchStateFromUrl(state)
    setSearchSource(submitted.searchSource)
    setSubmittedBounds(submitted.submittedBounds)
    setSubmittedNearbyPosition(submitted.submittedNearbyPosition)
    setNearbyRadiusMeters(submitted.nearbyRadiusMeters)
    setLineDistanceMeters(submitted.lineDistanceMeters)
    setLinePoints(submitted.linePoints)
    setSubmittedLineGeometry(submitted.submittedLineGeometry)
    setPendingBuildingId(submitted.pendingBuildingId)
    setCameraRestoreVersion((version) => version + 1)
  }, [])

  const updateSearchUrl = useCallback(
    (state: MapSearchUrlState, replace = false) => {
      const next = writeMapSearchUrl(searchParams, state)
      if (next.toString() !== searchParams.toString()) {
        lastRestoredUrlRef.current = next.toString()
        setSearchParams(next, { replace })
      }
    },
    [searchParams, setSearchParams],
  )

  const clearListingPurpose = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete(MAP_SEARCH_PURPOSE_PARAM)
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (navigationType !== "POP") return
    const urlKey = searchParams.toString()
    if (lastRestoredUrlRef.current === urlKey) return
    lastRestoredUrlRef.current = urlKey

    const restored = parseMapSearchUrl(
      searchParams,
      DEFAULT_MAP_SEARCH_FILTERS,
    )

    isHydratingUrlRef.current = true
    applySubmittedSearchState(restored)
    onPopRestoreRef(restored)
    isHydratingUrlRef.current = false
  }, [
    applySubmittedSearchState,
    navigationType,
    onPopRestoreRef,
    searchParams,
  ])

  const commitSubmittedLineGeometry = useCallback((points: MapPosition[]) => {
    setSubmittedLineGeometry(linePointsToGeometry(points))
  }, [])

  return {
    searchPurpose,
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
    commitSubmittedLineGeometry,
    submittedLinePoints,
    pendingBuildingId,
    setPendingBuildingId,
    cameraRestoreVersion,
    updateSearchUrl,
    clearListingPurpose,
    isHydratingUrlRef,
  }
}
