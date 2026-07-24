import type { MapSearchFilters } from "../filters/types"

type BuildSearchBuildingsRequestBodyInput = {
  filters?: MapSearchFilters
  includeBuildingsWithoutMatchingListings?: boolean
}

export function buildSearchBuildingsRequestBody({
  filters = {},
  includeBuildingsWithoutMatchingListings,
}: BuildSearchBuildingsRequestBodyInput) {
  return {
    ...filters,
    ...(includeBuildingsWithoutMatchingListings === undefined
      ? {}
      : { includeBuildingsWithoutMatchingListings }),
  }
}
