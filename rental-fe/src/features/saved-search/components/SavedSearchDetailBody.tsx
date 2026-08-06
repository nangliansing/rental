import type { RefObject } from "react"

import type {
  SavedSearchFilters,
  SavedSearchGeoSearch,
} from "@/features/saved-search/api"
import { cn } from "@/lib/utils"

import { SavedSearchDetailFiltersSection } from "./SavedSearchDetailFiltersSection"
import { SavedSearchDetailListersSection } from "./SavedSearchDetailListersSection"
import { SavedSearchDetailLocationSection } from "./SavedSearchDetailLocationSection"
import { SavedSearchMatchingBuildingsSection } from "./SavedSearchMatchingBuildingsSection"

export type SavedSearchDetailBodyProps = {
  id: string
  geoSearch: SavedSearchGeoSearch
  filters: SavedSearchFilters
  /** Prefix for the read-only map instance id (owner vs opportunity). */
  mapInstanceIdPrefix?: string
  className?: string
  scrollRootRef?: RefObject<HTMLElement | null>
}

/**
 * Shared read-only sections for a SavedSearch-shaped demand: location,
 * preferences, preferred listers, and matching buildings.
 */
export function SavedSearchDetailBody({
  id,
  geoSearch,
  filters,
  mapInstanceIdPrefix = "saved-search-detail",
  className,
  scrollRootRef,
}: SavedSearchDetailBodyProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <SavedSearchDetailLocationSection
        geoSearch={geoSearch}
        mapInstanceId={`${mapInstanceIdPrefix}-${id}`}
      />

      <SavedSearchDetailFiltersSection filters={filters} />

      <SavedSearchDetailListersSection filters={filters} />

      <SavedSearchMatchingBuildingsSection
        geoSearch={geoSearch}
        filters={filters}
        scrollRootRef={scrollRootRef}
      />
    </div>
  )
}
