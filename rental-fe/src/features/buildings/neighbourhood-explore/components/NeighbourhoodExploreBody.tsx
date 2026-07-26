import { Loader2, SearchX } from "lucide-react"

import { ListingCollectionMessage } from "@/shared/components/collections/ListingCollectionState"

import { useNeighbourhoodExplore } from "../NeighbourhoodExploreContext"
import { getNeighbourhoodRadiusLabel } from "../utils/getNeighbourhoodRadiusLabel"
import { NeighbourhoodExploreAttribution } from "./NeighbourhoodExploreAttribution"
import { NeighbourhoodExploreCategoryBar } from "./NeighbourhoodExploreCategoryBar"
import { NeighbourhoodExploreSelectedPlaceCard } from "./NeighbourhoodExploreSelectedPlaceCard"
import { NeighbourhoodExploreMap } from "./map/NeighbourhoodExploreMap"

export function NeighbourhoodExploreBody() {
  const {
    neighbourhood,
    radiusMeters,
    visiblePlaces,
    isInitialLoading,
    isInitialError,
    showMap,
    refetch,
  } = useNeighbourhoodExplore()

  return (
    <div className="relative min-h-0 flex-1 bg-slate-50">
      <NeighbourhoodExploreCategoryBar />

      {isInitialLoading && (
        <div className="flex h-full items-center justify-center gap-2 text-sm font-medium text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading nearby places...
        </div>
      )}

      {isInitialError && (
        <ListingCollectionMessage
          className="min-h-full"
          title="Could not load nearby places"
          description="Please try again in a moment."
          onRetry={refetch}
        />
      )}

      {!isInitialLoading &&
        !isInitialError &&
        neighbourhood &&
        visiblePlaces.length === 0 && (
          <ListingCollectionMessage
            className="min-h-full"
            icon={SearchX}
            title="No nearby places found"
            description={`Try another category or expand beyond ${getNeighbourhoodRadiusLabel(radiusMeters)}.`}
          />
        )}

      {showMap && <NeighbourhoodExploreMap />}

      <NeighbourhoodExploreSelectedPlaceCard />

      {neighbourhood && showMap && (
        <NeighbourhoodExploreAttribution variant="overlay" />
      )}
    </div>
  )
}
