import type { AgentDemandOpportunity } from "@/features/agent-demand-opportunity/api"
import { SavedSearchStatusBadge } from "@/features/saved-search/components/SavedSearchStatusBadge"

import { formatOpportunityListTitle } from "../../utils/formatOpportunityListMeta"

type ExploreOpportunitiesDetailHeaderProps = {
  opportunity: Pick<AgentDemandOpportunity, "geoSearch" | "status">
}

/** Read-only opportunity title from geo preview — no owner name or actions. */
export function ExploreOpportunitiesDetailHeader({
  opportunity,
}: ExploreOpportunitiesDetailHeaderProps) {
  return (
    <header className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 text-lg font-semibold text-slate-950">
            {formatOpportunityListTitle(opportunity)}
          </h2>
          <SavedSearchStatusBadge status={opportunity.status} />
        </div>
      </div>
    </header>
  )
}
