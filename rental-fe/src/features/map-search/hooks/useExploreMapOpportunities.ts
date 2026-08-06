import { useState } from "react"

import { savedSearchGeoToDemandArea } from "@/features/agent-demand-opportunity/api"
import type { ExploreOpportunitiesPanelSession } from "@/features/explore-opportunities-panel"
import { toast } from "@/hooks/use-toast"

import { useMapInteraction } from "../context/MapInteractionContext"
import {
  useMapSearchCanvas,
  useMapSearchControls,
} from "../context/MapSearchSessionContext"
import { buildMapSavedSearchGeoSnapshot } from "../utils/saved-search-geo-from-map"
import type { SearchBounds } from "./useMapBounds"
import { useMapBounds } from "./useMapBounds"

/**
 * Opens the explore-opportunities panel from the current map geometry.
 * Visible only when the viewer can create listings (authenticated + agent profile).
 * Call inside `<Map>` / `APIProvider` so `useMapBounds` works.
 */
export function useExploreMapOpportunities() {
  const { canCreateListing, nearbyRadiusMeters, linePoints, lineDistanceMeters } =
    useMapSearchControls()
  const { mode, selectedPin } = useMapInteraction()
  const { searchedPlace, committedBounds } = useMapSearchCanvas()
  const { getCurrentBounds } = useMapBounds()

  const [session, setSession] =
    useState<ExploreOpportunitiesPanelSession | null>(null)

  const openExploreOpportunities = () => {
    if (!canCreateListing) return

    const snapshot = buildMapSavedSearchGeoSnapshot({
      mode,
      selectedPin,
      nearbyRadiusMeters,
      linePoints,
      lineDistanceMeters,
      visibleBounds: resolveVisibleBounds(getCurrentBounds, committedBounds),
      placeName: searchedPlace?.name ?? null,
    })

    const demandArea = snapshot
      ? savedSearchGeoToDemandArea(snapshot.geoSearch)
      : null

    if (!snapshot || !demandArea) {
      toast({
        title: "Map area not ready",
        description: "Wait for the map to load, then try again.",
      })
      return
    }

    setSession({
      demandArea,
      previewGeo: snapshot.previewGeo,
      areaTitle: snapshot.summaryTitle,
      areaDetail: snapshot.summaryDetail,
    })
  }

  const closeExploreOpportunities = () => setSession(null)

  return {
    canExploreOpportunities: canCreateListing,
    openExploreOpportunities,
    closeExploreOpportunities,
    exploreSession: session,
    isExploreOpportunitiesOpen: session !== null,
  }
}

function resolveVisibleBounds(
  getCurrentBounds: () => SearchBounds | null,
  committedBounds: SearchBounds | null,
): SearchBounds | null {
  return getCurrentBounds() ?? committedBounds
}
