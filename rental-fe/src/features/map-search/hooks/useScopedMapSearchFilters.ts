import { useCallback, useState } from "react"

import type { MapSearchFilters } from "../filters/types"

export function useScopedMapSearchFilters({
  initialFilters,
}: {
  initialFilters: MapSearchFilters
}) {
  const [buildingListFilters, setBuildingListFilters] =
    useState(initialFilters)
  const [buildingDetailFilters, setBuildingDetailFilters] =
    useState(initialFilters)

  const commitFilters = useCallback(
    (scope: "building-list" | "building-detail", filters: MapSearchFilters) => {
      if (scope === "building-detail") {
        setBuildingDetailFilters(filters)
      } else {
        setBuildingListFilters(filters)
      }
    },
    [],
  )

  const enterBuildingDetail = useCallback(
    (filters: MapSearchFilters) => setBuildingDetailFilters(filters),
    [],
  )
  const enterBuildingList = useCallback(
    (filters: MapSearchFilters) => setBuildingListFilters(filters),
    [],
  )

  return {
    buildingListFilters,
    buildingDetailFilters,
    commitFilters,
    enterBuildingDetail,
    enterBuildingList,
  }
}
