import type { RefObject } from "react"
import { Building2, Search, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import type {
  ClientRequestFilters,
  ClientRequestGeoSearch,
} from "@/features/client-request/api"
import { useClientRequestMatchingBuildings } from "@/features/client-request/api/useClientRequestMatchingBuildings"
import { BuildingListRow } from "@/features/map-search/components/results/BuildingListRow"
import { CollectionRefreshErrorBanner } from "@/features/map-search/components/results/CollectionRefreshErrorBanner"
import { VirtualizedBuildingList } from "@/features/map-search/components/results/VirtualizedBuildingList"
import type { SearchBuilding } from "@/features/map-search/types"
import { BUILDING_LIST_CONTAINER_CLASS } from "@/features/map-search/utils/building-list-layout"
import { shouldVirtualizeBuildingList } from "@/features/map-search/utils/building-list-virtualization"
import { formatBuildingCount } from "@/features/map-search/utils/map-search-presentation"
import { CollectionRefreshStatus } from "@/shared/components/collections/ListingCollectionState"
import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

type ClientRequestMatchingBuildingsSectionProps = {
  geoSearch: ClientRequestGeoSearch
  filters: ClientRequestFilters
  scrollRootRef?: RefObject<HTMLElement | null>
}

type MatchingBuildingsStatusMessageProps = {
  status: "loading" | "empty" | "error"
  onRetry?: () => void
}

const noopBuilding = (_building: SearchBuilding) => {}
const noopHover = (_buildingId: string | null) => {}

function MatchingBuildingsStatusMessage({
  status,
  onRetry,
}: MatchingBuildingsStatusMessageProps) {
  if (status === "loading") {
    return (
      <div
        className="flex flex-col items-center justify-center px-5 py-10 text-center"
        role="status"
      >
        <LoaderIcon className="mb-3 h-6 w-6 text-slate-400" />
        <p className="text-sm font-semibold text-slate-950">
          Finding matching buildings
        </p>
        <p className="mt-1 max-w-[260px] text-sm text-slate-500">
          Comparing listings to your saved location and preferences.
        </p>
      </div>
    )
  }

  if (status === "empty") {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
        <Building2 className="mb-3 h-6 w-6 text-slate-400" />
        <p className="text-sm font-semibold text-slate-950">
          Watching for matches
        </p>
        <p className="mt-1 max-w-[280px] text-sm text-slate-500">
          Nothing matches yet. When new buildings fit this saved search, they’ll
          show up here.
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center px-5 py-10 text-center"
      role="alert"
    >
      <TriangleAlert className="mb-3 h-6 w-6 text-red-400" />
      <p className="text-sm font-semibold text-slate-950">
        Could not load matching buildings
      </p>
      <p className="mt-1 max-w-[260px] text-sm text-slate-500">
        Please try again in a moment.
      </p>
      {onRetry ? (
        <Button className="mt-4 h-10 rounded-full px-4" onClick={onRetry}>
          <Search className="mr-2 h-4 w-4" />
          Retry
        </Button>
      ) : null}
    </div>
  )
}

export function ClientRequestMatchingBuildingsSection({
  geoSearch,
  filters,
  scrollRootRef,
}: ClientRequestMatchingBuildingsSectionProps) {
  const {
    buildings,
    status,
    canSearch,
    hasNextPage,
    isFetchingNextPage,
    isRefreshing,
    isError,
    fetchNextPage,
    refetchActiveSearch,
  } = useClientRequestMatchingBuildings({
    geoSearch,
    filters,
  })

  const shouldVirtualize = shouldVirtualizeBuildingList(
    buildings.length,
    Boolean(scrollRootRef),
  )
  const resultSummary =
    status === "success"
      ? `${formatBuildingCount(buildings.length)} match this saved search.`
      : "Buildings that match this search’s saved location and preferences."
  const sharedRowProps = {
    totalCount: buildings.length,
    selectedBuildingId: null as string | null,
    isListingSearch: false,
    canCreateListing: false,
    onBuildingSelect: noopBuilding,
    onBuildingHoverChange: noopHover,
    onListExistingBuilding: noopBuilding,
  }

  return (
    <section aria-label="Matching buildings" className="space-y-3">
      <div className="min-w-0 space-y-1">
        <h3 className="text-sm font-semibold text-slate-950">
          Matching buildings
        </h3>
        <p className="text-sm leading-5 text-slate-500">{resultSummary}</p>
      </div>

      {!canSearch ? (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <Building2 className="mb-3 h-6 w-6 text-slate-400" />
          <p className="text-sm font-semibold text-slate-950">
            Location unavailable
          </p>
          <p className="mt-1 max-w-[260px] text-sm text-slate-500">
            This search is missing a searchable location, so matching buildings
            cannot be loaded.
          </p>
        </div>
      ) : status === "success" ? (
        <>
          {isRefreshing && buildings.length > 0 ? (
            <CollectionRefreshStatus
              label="Updating buildings..."
              className="px-1 pb-2"
            />
          ) : null}
          {isError && buildings.length > 0 ? (
            <CollectionRefreshErrorBanner
              label="Could not update buildings. Showing previous results."
              onRetry={() => void refetchActiveSearch()}
            />
          ) : null}
          {shouldVirtualize ? (
            <VirtualizedBuildingList
              buildings={buildings}
              scrollRootRef={scrollRootRef}
              {...sharedRowProps}
            />
          ) : (
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
          )}
          <InfiniteScrollSentinel
            rootRef={scrollRootRef}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onFetchNextPage={fetchNextPage}
            endMessage="No more buildings"
          />
        </>
      ) : (
        <MatchingBuildingsStatusMessage
          status={status === "idle" || status === "stale" ? "loading" : status}
          onRetry={
            status === "error"
              ? () => void refetchActiveSearch()
              : undefined
          }
        />
      )}
    </section>
  )
}
