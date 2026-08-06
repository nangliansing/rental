import { useMemo, useRef } from "react"

import { useSearchAgentDemandOpportunities } from "@/features/agent-demand-opportunity/api"
import { CollectionRefreshStatus } from "@/shared/components/collections/ListingCollectionState"

import { EXPLORE_OPPORTUNITIES_PANEL_COPY } from "../../copy"
import { useExploreOpportunitiesSelection } from "../../context/ExploreOpportunitiesSelectionContext"
import { useExploreOpportunitiesSession } from "../../context/ExploreOpportunitiesSessionContext"
import {
  buildOpportunityListCues,
  formatOpportunityListTimestamp,
  formatOpportunityListTitle,
  formatOpportunityMoveInLabel,
} from "../../utils/formatOpportunityListMeta"
import { ExploreOpportunitiesListItem } from "./ExploreOpportunitiesListItem"
import { ExploreOpportunitiesListState } from "./ExploreOpportunitiesListState"
import { ExploreOpportunitiesRefreshErrorBanner } from "./ExploreOpportunitiesRefreshErrorBanner"

export function ExploreOpportunitiesList() {
  const { session } = useExploreOpportunitiesSession()
  const { matchTab, selectedOpportunityId, selectOpportunity } =
    useExploreOpportunitiesSelection()
  const scrollRootRef = useRef<HTMLDivElement | null>(null)

  const query = useSearchAgentDemandOpportunities({
    area: session.demandArea,
    matchStatus: matchTab,
    enabled: true,
  })

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data],
  )

  const isInitialLoading = query.isPending && items.length === 0
  const isInitialError = query.isError && items.length === 0
  const isRefreshing = query.isFetching && !query.isFetchingNextPage && items.length > 0
  const emptyCopy =
    matchTab === "unmatched"
      ? {
          title: EXPLORE_OPPORTUNITIES_PANEL_COPY.unmatchedEmptyTitle,
          description: EXPLORE_OPPORTUNITIES_PANEL_COPY.unmatchedEmptyDescription,
        }
      : {
          title: EXPLORE_OPPORTUNITIES_PANEL_COPY.matchedEmptyTitle,
          description: EXPLORE_OPPORTUNITIES_PANEL_COPY.matchedEmptyDescription,
        }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isRefreshing ? (
        <CollectionRefreshStatus
          label={EXPLORE_OPPORTUNITIES_PANEL_COPY.refreshing}
          className="px-3 pb-2"
        />
      ) : null}

      {query.isError && items.length > 0 ? (
        <ExploreOpportunitiesRefreshErrorBanner
          label={EXPLORE_OPPORTUNITIES_PANEL_COPY.refreshError}
          onRetry={() => {
            void query.refetch()
          }}
          className="mx-3 mb-2"
        />
      ) : null}

      <div
        ref={scrollRootRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white"
        data-testid="explore-opportunities-list-scroller"
      >
        <ExploreOpportunitiesListState
          isLoading={isInitialLoading}
          error={isInitialError ? query.error : null}
          isEmpty={items.length === 0}
          emptyTitle={emptyCopy.title}
          emptyDescription={emptyCopy.description}
          onRetry={() => {
            void query.refetch()
          }}
          hasNextPage={Boolean(query.hasNextPage)}
          isFetchingNextPage={query.isFetchingNextPage}
          isFetchNextPageError={query.isFetchNextPageError}
          onFetchNextPage={() => {
            void query.fetchNextPage()
          }}
          rootRef={scrollRootRef}
        >
          {items.map((item) => (
            <ExploreOpportunitiesListItem
              key={item._id}
              id={item._id}
              title={formatOpportunityListTitle(item)}
              cues={buildOpportunityListCues(item)}
              moveInLabel={formatOpportunityMoveInLabel(
                item.filters.availableBy,
              )}
              timestamp={formatOpportunityListTimestamp(item)}
              myMatchingBuildingCount={item.myMatchingBuildingCount}
              platformMatchingBuildingCount={item.platformMatchingBuildingCount}
              matchingBuildingCountCapped={item.matchingBuildingCountCapped}
              selected={item._id === selectedOpportunityId}
              onSelect={selectOpportunity}
            />
          ))}
        </ExploreOpportunitiesListState>
      </div>
    </div>
  )
}
