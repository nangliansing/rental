import { SearchX } from "lucide-react"

import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import { useMediaQuery } from "@/hooks/useMediaQuery"
import { ListingCollectionMessage } from "@/shared/components/collections/ListingCollectionState"

import { useNeighbourhoodExploreData } from "../NeighbourhoodExploreContext"
import { getNeighbourhoodRadiusLabel } from "../utils/getNeighbourhoodRadiusLabel"
import { NeighbourhoodExploreCategoryBar } from "./NeighbourhoodExploreCategoryBar"
import { NeighbourhoodExploreDesktopBody } from "./layout/NeighbourhoodExploreDesktopBody"
import { NeighbourhoodExploreMobileBody } from "./layout/NeighbourhoodExploreMobileBody"

export function NeighbourhoodExploreBody() {
  const {
    neighbourhood,
    radiusMeters,
    visiblePlaces,
    isInitialLoading,
    isInitialError,
    showMap,
    refetch,
  } = useNeighbourhoodExploreData()
  const isDesktop = useMediaQuery("(min-width: 768px)")

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-slate-50">
      {isInitialLoading && (
        <div className="flex h-full items-center justify-center gap-2 text-sm font-medium text-slate-500">
          <LoaderIcon className="h-4 w-4" aria-hidden="true" />
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
          <>
            <NeighbourhoodExploreCategoryBar />
            <ListingCollectionMessage
              className="min-h-full"
              icon={SearchX}
              title="No nearby places found"
              description={`Try another category or expand beyond ${getNeighbourhoodRadiusLabel(radiusMeters)}.`}
            />
          </>
        )}

      {showMap &&
        (isDesktop ? (
          <NeighbourhoodExploreDesktopBody />
        ) : (
          <NeighbourhoodExploreMobileBody />
        ))}
    </div>
  )
}
