import { useCallback, useMemo, useState } from "react"

import type { FilterPillOption } from "@/shared/components/inputs/FilterPills"

import { useBuildingNeighbourhood } from "../../api/useBuildingNeighbourhood"
import {
  NEIGHBOURHOOD_ALL_CATEGORY_KEY,
  NEIGHBOURHOOD_DEFAULT_RADIUS_METERS,
  NEIGHBOURHOOD_FETCH_RADIUS_METERS,
  NEIGHBOURHOOD_RADIUS_OPTIONS,
  type NeighbourhoodRadiusMeters,
} from "../../constants/neighbourhood"
import {
  filterNeighbourhoodPlaces,
  type NeighbourhoodCategoryFilter,
} from "../utils/filterNeighbourhoodPlaces"
import { formatNeighbourhoodCategoryCount } from "../utils/formatNeighbourhoodCategoryCount"

type UseNeighbourhoodExploreStateInput = {
  buildingId: string | undefined
  enabled?: boolean
}

export function useNeighbourhoodExploreState({
  buildingId,
  enabled = true,
}: UseNeighbourhoodExploreStateInput) {
  const [radiusMeters, setRadiusMeters] = useState<NeighbourhoodRadiusMeters>(
    NEIGHBOURHOOD_DEFAULT_RADIUS_METERS,
  )
  const [selectedCategory, setSelectedCategory] =
    useState<NeighbourhoodCategoryFilter>(NEIGHBOURHOOD_ALL_CATEGORY_KEY)

  const neighbourhoodQuery = useBuildingNeighbourhood({
    buildingId,
    radiusM: radiusMeters,
    fetchRadiusM: NEIGHBOURHOOD_FETCH_RADIUS_METERS,
    enabled: enabled && Boolean(buildingId),
  })

  const neighbourhood = neighbourhoodQuery.data

  const categoryPillOptions = useMemo((): FilterPillOption<string>[] => {
    if (!neighbourhood) return []

    return [
      {
        value: NEIGHBOURHOOD_ALL_CATEGORY_KEY,
        label: `All (${formatNeighbourhoodCategoryCount(neighbourhood.summary.all, {
          truncated: neighbourhood.summary.truncated,
        })})`,
      },
      ...neighbourhood.categories.map((category) => ({
        value: category.key,
        label: `${category.label} (${category.count})`,
      })),
    ]
  }, [neighbourhood])

  const visiblePlaces = useMemo(() => {
    if (!neighbourhood) return []

    return filterNeighbourhoodPlaces(neighbourhood.places, selectedCategory)
  }, [neighbourhood, selectedCategory])

  const handleRadiusChange = useCallback((value: string | undefined) => {
    if (!value) return

    const nextRadius = Number(value)

    if (
      NEIGHBOURHOOD_RADIUS_OPTIONS.some((option) => option.value === nextRadius)
    ) {
      setRadiusMeters(nextRadius as NeighbourhoodRadiusMeters)
    }
  }, [])

  const handleCategoryChange = useCallback((value: string | undefined) => {
    if (!value) return

    setSelectedCategory(value as NeighbourhoodCategoryFilter)
  }, [])

  return {
    neighbourhood,
    neighbourhoodQuery,
    radiusMeters,
    selectedCategory,
    categoryPillOptions,
    visiblePlaces,
    handleRadiusChange,
    handleCategoryChange,
  }
}
