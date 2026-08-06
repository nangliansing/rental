import type { SavedSearchGeoSearch } from "@/features/saved-search/api"
import { ReadOnlyMap } from "@/shared/google-maps/readonly-map"

import {
  savedSearchGeoSearchToReadOnlyMapGeo,
  formatSavedSearchGeoSummary,
} from "./savedSearchDetailDisplay"
import { SavedSearchDetailCollapsibleSection } from "./SavedSearchDetailCollapsibleSection"
import { SavedSearchGeoSummaryCard } from "./SavedSearchGeoSummaryCard"

type SavedSearchDetailLocationSectionProps = {
  geoSearch: SavedSearchGeoSearch
  mapInstanceId: string
}

export function SavedSearchDetailLocationSection({
  geoSearch,
  mapInstanceId,
}: SavedSearchDetailLocationSectionProps) {
  const previewGeo = savedSearchGeoSearchToReadOnlyMapGeo(geoSearch)
  const summary = formatSavedSearchGeoSummary(geoSearch)

  return (
    <SavedSearchDetailCollapsibleSection
      title="Search area"
      ariaLabel="Search area"
      defaultOpen
      collapsedSummary={summary.title}
    >
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="h-48 w-full sm:h-56">
          <ReadOnlyMap
            geo={previewGeo}
            navigable
            className="h-full w-full"
            mapInstanceId={mapInstanceId}
            emptyMessage="Selected location is unavailable."
          />
        </div>
        <div className="border-t border-slate-200 p-3">
          <SavedSearchGeoSummaryCard
            title={summary.title}
            detail={summary.detail}
            className="rounded-lg border-0 bg-transparent p-0"
          />
        </div>
      </div>
    </SavedSearchDetailCollapsibleSection>
  )
}
