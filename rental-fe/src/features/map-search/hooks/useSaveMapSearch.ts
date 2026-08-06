import { useState } from "react"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { canUsePersonalActions } from "@/features/auth/utils/canUsePersonalActions"
import { toast } from "@/hooks/use-toast"

import { useMapInteraction } from "../context/MapInteractionContext"
import { useMapSearchFilters } from "../context/MapSearchFilterContext"
import {
  useMapSearchCanvas,
  useMapSearchControls,
} from "../context/MapSearchSessionContext"
import {
  buildMapSavedSearchGeoSnapshot,
  type MapSavedSearchGeoSnapshot,
} from "../utils/saved-search-geo-from-map"
import type { SearchBounds } from "./useMapBounds"
import { useMapBounds } from "./useMapBounds"

/**
 * Shared save-search wizard state. Callers supply how area bounds are resolved
 * so components outside `<APIProvider>` never call `useMap()`.
 */
function useSaveMapSearchBase(
  resolveVisibleBounds: () => SearchBounds | null,
) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const {
    nearbyRadiusMeters,
    linePoints,
    lineDistanceMeters,
  } = useMapSearchControls()
  const { mode, selectedPin } = useMapInteraction()
  const { searchedPlace } = useMapSearchCanvas()
  const { submittedFilters } = useMapSearchFilters()

  const [savedSearchSnapshot, setSavedSearchSnapshot] =
    useState<MapSavedSearchGeoSnapshot | null>(null)

  const canSaveSearch = canUsePersonalActions({
    user,
    isAuthenticated,
    isLoading,
  })

  const openSaveSearch = () => {
    if (!canSaveSearch) return

    const snapshot = buildMapSavedSearchGeoSnapshot({
      mode,
      selectedPin,
      nearbyRadiusMeters,
      linePoints,
      lineDistanceMeters,
      visibleBounds: resolveVisibleBounds(),
      placeName: searchedPlace?.name ?? null,
    })

    if (!snapshot) {
      toast({
        title: "Map area not ready",
        description: "Wait for the map to load, then try again.",
      })
      return
    }

    setSavedSearchSnapshot(snapshot)
  }

  const closeSaveSearch = () => setSavedSearchSnapshot(null)

  return {
    canSaveSearch,
    openSaveSearch,
    closeSaveSearch,
    savedSearchSnapshot,
    submittedFilters,
    isSaveSearchOpen: savedSearchSnapshot !== null,
  }
}

/** Plus menu (inside `<Map>` / `APIProvider`): live viewport, then committed. */
export function useSaveMapSearch() {
  const { committedBounds } = useMapSearchCanvas()
  const { getCurrentBounds } = useMapBounds()

  return useSaveMapSearchBase(
    () => getCurrentBounds() ?? committedBounds,
  )
}

/**
 * Empty-results CTA (outside `<APIProvider>`): committed search bounds only.
 * Must not call `useMap()` / `useMapBounds()`.
 */
export function useCommittedSaveMapSearch() {
  const { committedBounds } = useMapSearchCanvas()

  return useSaveMapSearchBase(() => committedBounds)
}
