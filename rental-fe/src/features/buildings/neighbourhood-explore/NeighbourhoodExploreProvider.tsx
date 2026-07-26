import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { useNeighbourhoodExploreState } from "./hooks/useNeighbourhoodExploreState"
import {
  NeighbourhoodExploreContext,
  type NeighbourhoodExploreContextValue,
} from "./NeighbourhoodExploreContext"

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

  const {
    neighbourhood,
    neighbourhoodQuery,
    radiusMeters,
    selectedCategory,
    categoryPillOptions,
    visiblePlaces,
    handleRadiusChange,
    handleCategoryChange,
  } = useNeighbourhoodExploreState({
    buildingId,
    enabled,
  })

  const selectedPlace = useMemo(
    () => visiblePlaces.find((place) => place.id === selectedPlaceId) ?? null,
    [selectedPlaceId, visiblePlaces],
  )

  useEffect(() => {
    if (
      selectedPlaceId &&
      !visiblePlaces.some((place) => place.id === selectedPlaceId)
    ) {
      setSelectedPlaceId(null)
    }
  }, [selectedPlaceId, visiblePlaces])

  const isInitialLoading = neighbourhoodQuery.isPending && !neighbourhood
  const isInitialError = neighbourhoodQuery.isError && !neighbourhood
  const isBackgroundFetching =
    neighbourhoodQuery.isFetching && Boolean(neighbourhood)
  const showMap =
    Boolean(neighbourhood) &&
    visiblePlaces.length > 0 &&
    !isInitialLoading &&
    !isInitialError

  const refetch = useCallback(() => {
    void neighbourhoodQuery.refetch()
  }, [neighbourhoodQuery])

  const value = useMemo(
    (): NeighbourhoodExploreContextValue => ({
      neighbourhood,
      neighbourhoodQuery,
      origin: neighbourhood?.origin ?? null,
      visiblePlaces,
      categoryPillOptions,
      radiusMeters,
      selectedCategory,
      selectedPlaceId,
      selectedPlace,
      isInitialLoading,
      isInitialError,
      isBackgroundFetching,
      showMap,
      setRadius: handleRadiusChange,
      setCategory: handleCategoryChange,
      selectPlace: setSelectedPlaceId,
      refetch,
    }),
    [
      neighbourhood,
      neighbourhoodQuery,
      visiblePlaces,
      categoryPillOptions,
      radiusMeters,
      selectedCategory,
      selectedPlaceId,
      selectedPlace,
      isInitialLoading,
      isInitialError,
      isBackgroundFetching,
      showMap,
      handleRadiusChange,
      handleCategoryChange,
      refetch,
    ],
  )

  return (
    <NeighbourhoodExploreContext.Provider value={value}>
      {children}
    </NeighbourhoodExploreContext.Provider>
  )
}
