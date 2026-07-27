import { useCallback, useMemo, useState, type ReactNode } from "react"

import { useNeighbourhoodExploreState } from "./hooks/useNeighbourhoodExploreState"
import {
  NeighbourhoodExploreDataContext,
  type NeighbourhoodExploreDataContextValue,
} from "./context/NeighbourhoodExploreDataContext"
import {
  NeighbourhoodExploreSelectionContext,
  type NeighbourhoodExploreSelectionContextValue,
} from "./context/NeighbourhoodExploreSelectionContext"

type NeighbourhoodExploreProviderProps = {
  buildingId: string | undefined
  enabled?: boolean
  children: ReactNode
}

export function NeighbourhoodExploreProvider({
  buildingId,
  enabled = true,
  children,
}: NeighbourhoodExploreProviderProps) {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [selectedPlaceRevision, setSelectedPlaceRevision] = useState(0)

  const selectPlace = useCallback((placeId: string | null) => {
    setSelectedPlaceId(placeId)
    setSelectedPlaceRevision((revision) => revision + 1)
  }, [])

  const {
    neighbourhood,
    isPending,
    isError,
    isFetching,
    radiusMeters,
    selectedCategory,
    categoryPillOptions,
    visiblePlaces,
    handleRadiusChange,
    handleCategoryChange,
    refetch,
  } = useNeighbourhoodExploreState({
    buildingId,
    enabled,
  })

  const effectiveSelectedPlaceId = useMemo(() => {
    if (!selectedPlaceId) {
      return null
    }

    return visiblePlaces.some((place) => place.id === selectedPlaceId)
      ? selectedPlaceId
      : null
  }, [selectedPlaceId, visiblePlaces])

  const selectedPlace = useMemo(
    () =>
      visiblePlaces.find((place) => place.id === effectiveSelectedPlaceId) ??
      null,
    [effectiveSelectedPlaceId, visiblePlaces],
  )

  const isInitialLoading = isPending && !neighbourhood
  const isInitialError = isError && !neighbourhood
  const isBackgroundFetching = isFetching && Boolean(neighbourhood)
  const showMap =
    Boolean(neighbourhood) &&
    visiblePlaces.length > 0 &&
    !isInitialLoading &&
    !isInitialError

  const dataValue = useMemo(
    (): NeighbourhoodExploreDataContextValue => ({
      neighbourhood,
      origin: neighbourhood?.origin ?? null,
      visiblePlaces,
      categoryPillOptions,
      radiusMeters,
      selectedCategory,
      isInitialLoading,
      isInitialError,
      isBackgroundFetching,
      showMap,
      setRadius: handleRadiusChange,
      setCategory: handleCategoryChange,
      refetch,
    }),
    [
      neighbourhood,
      visiblePlaces,
      categoryPillOptions,
      radiusMeters,
      selectedCategory,
      isInitialLoading,
      isInitialError,
      isBackgroundFetching,
      showMap,
      handleRadiusChange,
      handleCategoryChange,
      refetch,
    ],
  )

  const selectionValue = useMemo(
    (): NeighbourhoodExploreSelectionContextValue => ({
      selectedPlaceId: effectiveSelectedPlaceId,
      selectedPlace,
      selectedPlaceRevision,
      selectPlace,
    }),
    [effectiveSelectedPlaceId, selectedPlace, selectedPlaceRevision, selectPlace],
  )

  return (
    <NeighbourhoodExploreDataContext.Provider value={dataValue}>
      <NeighbourhoodExploreSelectionContext.Provider value={selectionValue}>
        {children}
      </NeighbourhoodExploreSelectionContext.Provider>
    </NeighbourhoodExploreDataContext.Provider>
  )
}
