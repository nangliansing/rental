import type React from "react"

import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"
import { CollectionRefreshStatus } from "@/shared/components/collections/ListingCollectionState"

import { useMapSearchFilters } from "../../context/MapSearchFilterContext"
import { useMapSearchResults } from "../../context/MapSearchSessionContext"
import type { SearchBuilding } from "../../types"
import { BUILDING_LIST_CONTAINER_CLASS } from "../../utils/building-list-layout"
import { CollectionRefreshErrorBanner } from "./CollectionRefreshErrorBanner"
import { BuildingListRow } from "./BuildingListRow"
import { SelectedListerRail } from "./SelectedListerRail"
import { formatBuildingResultsTitle } from "../../utils/map-search-presentation"
import { shouldVirtualizeBuildingList } from "../../utils/building-list-virtualization"
import { VirtualizedBuildingList } from "./VirtualizedBuildingList"

type BuildingListPageProps = {
  scrollRootRef?: React.RefObject<HTMLElement | null>
  showTitle?: boolean
  onBuildingSelect?: (building: SearchBuilding) => void
  onListExistingBuilding?: (building: SearchBuilding) => void
}

export function BuildingListPage({
  scrollRootRef,
  showTitle = true,
  onBuildingSelect,
  onListExistingBuilding,
}: BuildingListPageProps) {
  const { selectedListers, removeLister } = useMapSearchFilters()
  const {
    buildings,
    selectedBuilding,
    searchSource,
    hasNextPage,
    isFetchingNextPage,
    isRefreshingBuildings,
    isBuildingSearchError,
    isListingSearch,
    canCreateListing,
    onFetchNextPage,
    onSearchAgain,
    onBuildingHoverChange,
    onBuildingSelect: selectBuilding,
    onListExistingBuilding: listExistingBuilding,
  } = useMapSearchResults()
  const handleBuildingSelect = onBuildingSelect ?? selectBuilding
  const handleListExistingBuilding =
    onListExistingBuilding ?? listExistingBuilding
  const shouldVirtualize = shouldVirtualizeBuildingList(
    buildings.length,
    Boolean(scrollRootRef),
  )
  const sharedRowProps = {
    totalCount: buildings.length,
    selectedBuildingId: selectedBuilding?._id ?? null,
    isListingSearch,
    canCreateListing,
    onBuildingSelect: handleBuildingSelect,
    onBuildingHoverChange,
    onListExistingBuilding: handleListExistingBuilding,
  }

  return (
    <>
      {showTitle && (
        <div className="mb-3 flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-sm font-semibold">
            {formatBuildingResultsTitle(buildings.length, searchSource)}
          </p>

          {selectedListers.length > 0 && (
            <SelectedListerRail
              listers={selectedListers}
              onRemove={removeLister}
            />
          )}
        </div>
      )}

      <div>
        {isRefreshingBuildings && buildings.length > 0 && (
          <CollectionRefreshStatus
            label="Updating buildings..."
            className="px-1 pb-2"
          />
        )}
        {isBuildingSearchError && buildings.length > 0 && (
          <CollectionRefreshErrorBanner
            label="Could not update buildings. Showing previous results."
            onRetry={onSearchAgain}
          />
        )}
        {shouldVirtualize ? (
          <VirtualizedBuildingList
            buildings={buildings}
            scrollRootRef={scrollRootRef}
            {...sharedRowProps}
          />
        ) : buildings.length > 0 ? (
          <div
            role="list"
            aria-label="Buildings"
            className={BUILDING_LIST_CONTAINER_CLASS}
          >
            {buildings.map((building, index) => (
              <BuildingListRow
                key={building._id}
                building={building}
                index={index}
                {...sharedRowProps}
              />
            ))}
          </div>
        ) : null}
      </div>

      <InfiniteScrollSentinel
        rootRef={scrollRootRef}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={onFetchNextPage}
        endMessage="No more buildings"
      />
    </>
  )
}
