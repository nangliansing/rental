import { useAgentDemandOpportunityById } from "@/features/agent-demand-opportunity/api"
import { SavedSearchDetailBody } from "@/features/saved-search/components/SavedSearchDetailBody"
import { getFormErrorMessage } from "@/features/listing/utils/formFieldUtils"
import { ListingCollectionMessage } from "@/shared/components/collections/ListingCollectionState"

import { EXPLORE_OPPORTUNITIES_PANEL_COPY } from "../../copy"
import { useExploreOpportunitiesSelection } from "../../context/ExploreOpportunitiesSelectionContext"
import { ExploreOpportunitiesDetailEmpty } from "./ExploreOpportunitiesDetailEmpty"
import { ExploreOpportunitiesDetailHeader } from "./ExploreOpportunitiesDetailHeader"

export function ExploreOpportunitiesDetailPane() {
  const { selectedOpportunityId } = useExploreOpportunitiesSelection()

  const { data, isPending, isError, error, refetch, isFetching } =
    useAgentDemandOpportunityById({
      opportunityId: selectedOpportunityId ?? undefined,
      enabled: Boolean(selectedOpportunityId),
    })

  if (!selectedOpportunityId) {
    return <ExploreOpportunitiesDetailEmpty />
  }

  if (isPending) {
    return (
      <ListingCollectionMessage
        className="min-h-full"
        isLoading
        title={EXPLORE_OPPORTUNITIES_PANEL_COPY.detailLoading}
      />
    )
  }

  if (isError || !data) {
    return (
      <ListingCollectionMessage
        className="min-h-full"
        title={EXPLORE_OPPORTUNITIES_PANEL_COPY.detailErrorTitle}
        description={getFormErrorMessage(
          error,
          EXPLORE_OPPORTUNITIES_PANEL_COPY.detailErrorFallback,
        )}
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
      <ExploreOpportunitiesDetailHeader opportunity={data} />
      {isFetching ? (
        <p className="text-xs font-medium text-slate-500" role="status">
          {EXPLORE_OPPORTUNITIES_PANEL_COPY.detailRefreshing}
        </p>
      ) : null}
      <SavedSearchDetailBody
        id={data._id}
        geoSearch={data.geoSearch}
        filters={data.filters}
        mapInstanceIdPrefix="opportunity-detail"
      />
    </div>
  )
}
