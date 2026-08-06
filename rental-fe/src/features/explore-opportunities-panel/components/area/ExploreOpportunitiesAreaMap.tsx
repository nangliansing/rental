import { SavedSearchDetailCollapsibleSection } from "@/features/saved-search/components/SavedSearchDetailCollapsibleSection"
import { ReadOnlyMap } from "@/shared/google-maps/readonly-map"

import { EXPLORE_OPPORTUNITIES_PANEL_COPY } from "../../copy"
import { useExploreOpportunitiesSession } from "../../context/ExploreOpportunitiesSessionContext"
import { formatExploreAreaHeading } from "../../utils/formatExploreAreaHeading"

export function ExploreOpportunitiesAreaMap() {
  const { session } = useExploreOpportunitiesSession()
  const areaHeading = formatExploreAreaHeading(session)

  return (
    <div className="shrink-0 border-b border-slate-100 px-3 py-3">
      <SavedSearchDetailCollapsibleSection
        title={EXPLORE_OPPORTUNITIES_PANEL_COPY.areaSectionTitle}
        ariaLabel={EXPLORE_OPPORTUNITIES_PANEL_COPY.areaSectionTitle}
        defaultOpen={false}
        collapsedSummary={areaHeading}
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="h-40 w-full bg-slate-100 sm:h-48">
            <ReadOnlyMap
              geo={session.previewGeo}
              className="h-full w-full"
              mapInstanceId="explore-opportunities-area"
              emptyMessage={EXPLORE_OPPORTUNITIES_PANEL_COPY.areaMapEmpty}
            />
          </div>
          <div className="border-t border-slate-200 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-slate-950">
              {areaHeading}
            </p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              {session.areaDetail}
            </p>
          </div>
        </div>
      </SavedSearchDetailCollapsibleSection>
    </div>
  )
}
