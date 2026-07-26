import { useNeighbourhoodExplore } from "../NeighbourhoodExploreContext"
import { formatNeighbourhoodPlaceSubtitle } from "../utils/formatNeighbourhoodPlaceSubtitle"
import { NeighbourhoodCategoryIcon } from "./NeighbourhoodCategoryIcon"

export function NeighbourhoodExploreSelectedPlaceCard() {
  const { selectedPlace } = useNeighbourhoodExplore()

  if (!selectedPlace) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3">
      <div className="pointer-events-auto rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-lg backdrop-blur-md">
        <div className="flex items-start gap-3">
          <NeighbourhoodCategoryIcon
            category={selectedPlace.category}
            className="mt-0.5 h-8 w-8"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {selectedPlace.name}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatNeighbourhoodPlaceSubtitle(selectedPlace)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
