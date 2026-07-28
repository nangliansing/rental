import { useCallback, useMemo, useState, type ReactNode } from "react"

import { useNeighbourhoodExploreState } from "./hooks/useNeighbourhoodExploreState"
import {
  NeighbourhoodExploreDataContext,
  type NeighbourhoodExploreDataContextValue,
} from "./context/NeighbourhoodExploreDataContext"
import {
  NeighbourhoodExploreSelectionContext,
  type NeighbourhoodExploreSelectionContextValue,
  type SelectPlaceOptions,
} from "./context/NeighbourhoodExploreSelectionContext"

type NeighbourhoodExploreProviderProps = {
  buildingId: string | undefined
  enabled?: boolean
  children: ReactNode
}

type PlaceSelectionState = {
  placeId: string | null
  revision: number
  scrollIntoView: boolean
}

const INITIAL_PLACE_SELECTION: PlaceSelectionState = {
  placeId: null,
  revision: 0,
  scrollIntoView: true,
}

export function NeighbourhoodExploreProvider({
  buildingId,
  enabled = true,
  children,
}: NeighbourhoodExploreProviderProps) {
  const [placeSelection, setPlaceSelection] = useState(INITIAL_PLACE_SELECTION)

  const selectPlace = useCallback(
    (placeId: string | null, options?: SelectPlaceOptions) => {
      setPlaceSelection((current) => ({
        placeId,
        revision: current.revision + 1,
        scrollIntoView: options?.scrollIntoView ?? true,
      }))
    },
    [],
  )

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

  const selectedPlace = useMemo(() => {
    if (!placeSelection.placeId) {
      return null
    }

    return (
      visiblePlaces.find((place) => place.id === placeSelection.placeId) ?? null
    )
  }, [placeSelection.placeId, visiblePlaces])

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
      selectedPlaceId: selectedPlace?.id ?? null,
      selectedPlace,
      selectedPlaceRevision: placeSelection.revision,
      shouldScrollSelectedPlaceIntoView: placeSelection.scrollIntoView,
      selectPlace,
    }),
    [placeSelection, selectedPlace, selectPlace],
  )

  return (
    <NeighbourhoodExploreDataContext.Provider value={dataValue}>
      <NeighbourhoodExploreSelectionContext.Provider value={selectionValue}>
        {children}
      </NeighbourhoodExploreSelectionContext.Provider>
    </NeighbourhoodExploreDataContext.Provider>
  )
}
