import type { ClientRequestGeoSearch } from "@/features/client-request/api"
import { ReadOnlyMap } from "@/shared/google-maps/readonly-map"

import {
  clientRequestGeoSearchToReadOnlyMapGeo,
  formatClientRequestGeoSummary,
} from "./clientRequestDetailDisplay"
import { ClientRequestDetailCollapsibleSection } from "./ClientRequestDetailCollapsibleSection"
import { ClientRequestGeoSummaryCard } from "./ClientRequestGeoSummaryCard"

type ClientRequestDetailLocationSectionProps = {
  geoSearch: ClientRequestGeoSearch
  mapInstanceId: string
}

export function ClientRequestDetailLocationSection({
  geoSearch,
  mapInstanceId,
}: ClientRequestDetailLocationSectionProps) {
  const previewGeo = clientRequestGeoSearchToReadOnlyMapGeo(geoSearch)
  const summary = formatClientRequestGeoSummary(geoSearch)

  return (
    <ClientRequestDetailCollapsibleSection
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
          <ClientRequestGeoSummaryCard
            title={summary.title}
            detail={summary.detail}
            className="rounded-lg border-0 bg-transparent p-0"
          />
        </div>
      </div>
    </ClientRequestDetailCollapsibleSection>
  )
}
