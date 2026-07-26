import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  useNavigate,
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
  getMapSearchRestoreKey,
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
  const navigate = useNavigate()
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
  const pendingListingId = useMemo(
    () =>
      parseMapSearchUrl(searchParams, DEFAULT_MAP_SEARCH_FILTERS).listingId,
    [searchParams],
  )
  const [cameraRestoreVersion, setCameraRestoreVersion] = useState(
    initialSubmittedState.cameraRestoreVersion,
  )
  const isHydratingUrlRef = useRef(false)
  const lastRestoredUrlRef = useRef(searchParams.toString())
  const onPopRestoreRef = useEventCallback(onPopRestore)

  const applySubmittedSearchState = useCallback(
    (state: MapSearchUrlState, restoreCamera = true) => {
      const submitted = createSubmittedSearchStateFromUrl(state)
      setSearchSource(submitted.searchSource)
      setSubmittedBounds(submitted.submittedBounds)
      setSubmittedNearbyPosition(submitted.submittedNearbyPosition)
      setNearbyRadiusMeters(submitted.nearbyRadiusMeters)
      setLineDistanceMeters(submitted.lineDistanceMeters)
      setLinePoints(submitted.linePoints)
      setSubmittedLineGeometry(submitted.submittedLineGeometry)
      setPendingBuildingId(submitted.pendingBuildingId)
      if (restoreCamera) {
        setCameraRestoreVersion((version) => version + 1)
      }
    },
    [],
  )

  const updateSearchUrl = useCallback(
    (state: MapSearchUrlState, replace = false) => {
      const next = writeMapSearchUrl(searchParams, state)
      const nextString = next.toString()
      if (nextString === searchParams.toString()) return

      lastRestoredUrlRef.current = nextString
      navigate(
        { search: nextString ? `?${nextString}` : "" },
        { replace },
      )
    },
    [navigate, searchParams],
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

    const previousState = parseMapSearchUrl(
      new URLSearchParams(lastRestoredUrlRef.current),
      DEFAULT_MAP_SEARCH_FILTERS,
    )
    const restored = parseMapSearchUrl(
      searchParams,
      DEFAULT_MAP_SEARCH_FILTERS,
    )
    const restoreCamera =
      getMapSearchRestoreKey(previousState) !==
      getMapSearchRestoreKey(restored)

    lastRestoredUrlRef.current = urlKey

    isHydratingUrlRef.current = true
    applySubmittedSearchState(restored, restoreCamera)
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
    pendingListingId,
    cameraRestoreVersion,
    updateSearchUrl,
    clearListingPurpose,
    isHydratingUrlRef,
  }
}
