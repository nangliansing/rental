import { FilterPills } from "@/shared/components/inputs/FilterPills"
import { CollectionRefreshStatus } from "@/shared/components/collections/ListingCollectionState"
import { cn } from "@/lib/utils"

import { useNeighbourhoodExplore } from "../NeighbourhoodExploreContext"

export function NeighbourhoodExploreCategoryBar() {
  const {
    categoryPillOptions,
    selectedCategory,
    isBackgroundFetching,
    setCategory,
  } = useNeighbourhoodExplore()

  if (categoryPillOptions.length === 0 && !isBackgroundFetching) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
      {categoryPillOptions.length > 0 && (
        <div className="pointer-events-auto bg-gradient-to-b from-white/95 via-white/70 to-transparent pb-4 pt-2.5">
          <FilterPills
            aria-label="Neighbourhood categories"
            options={categoryPillOptions}
            value={selectedCategory}
            onChange={setCategory}
            scrollable
            edgeToEdge
            variant="overlay"
            className="mt-0"
          />
        </div>
      )}

      {isBackgroundFetching && (
        <CollectionRefreshStatus
          label="Updating nearby places..."
          className={cn(
            "pointer-events-auto px-3",
            categoryPillOptions.length > 0 && "mt-1",
          )}
        />
      )}
    </div>
  )
}
