import { FilterPills } from "@/shared/components/inputs/FilterPills"
import { CollectionRefreshStatus } from "@/shared/components/collections/ListingCollectionState"
import { cn } from "@/lib/utils"

import { useNeighbourhoodExplore } from "../NeighbourhoodExploreContext"
import {
  NEIGHBOURHOOD_CATEGORY_BAR_GRADIENT_CLASS,
  shouldShowNeighbourhoodCategoryBar,
  shouldShowNeighbourhoodCategoryDivider,
} from "../utils/neighbourhoodExploreUi"

export function NeighbourhoodExploreCategoryBar() {
  const {
    categoryPillOptions,
    selectedCategory,
    isBackgroundFetching,
    setCategory,
  } = useNeighbourhoodExplore()

  const categoryCount = categoryPillOptions.length

  if (!shouldShowNeighbourhoodCategoryBar(categoryCount, isBackgroundFetching)) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
      {categoryCount > 0 && (
        <div className={NEIGHBOURHOOD_CATEGORY_BAR_GRADIENT_CLASS}>
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
            shouldShowNeighbourhoodCategoryDivider(
              categoryCount,
              isBackgroundFetching,
            ) && "mt-1",
          )}
        />
      )}
    </div>
  )
}
