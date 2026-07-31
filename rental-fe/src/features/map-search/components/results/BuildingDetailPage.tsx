import { useEffect, useMemo, useRef } from "react"
import { ChevronLeft, SearchX } from "lucide-react"
import type React from "react"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { BuildingFollowersSection } from "@/features/building-follow/components/BuildingFollowersSection"
import { BuildingPanelSummarySection } from "@/features/buildings/components/BuildingPanelSummarySection"
import { ListingGridCard } from "@/features/listing/components/ListingGridCard"
import {
  ListingGridPreviewPortal,
  useListingGridPreview,
} from "@/features/listing/components/grid-preview"
import { ListingCardGrid } from "@/shared/components/collections/ListingCardGrid"
import {
  ListingCollectionMessage,
  ListingCollectionSkeleton,
} from "@/shared/components/collections/ListingCollectionState"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import { useSearchListingsInBuilding } from "../../api/useSearchListingsInBuilding"
import { useBuildingDetailSession } from "../../context/BuildingDetailSessionContext"
import { useMapSearchResults } from "../../context/MapSearchSessionContext"
import { CollectionRefreshErrorBanner } from "./CollectionRefreshErrorBanner"
import { BuildingListingsSectionHeader } from "./BuildingListingsSectionHeader"
import {
  RESULTS_PANEL_LISTING_GRID_CLASS,
} from "../../utils/building-list-layout"

type BuildingDetailPageProps = {
  scrollRootRef?: React.RefObject<HTMLElement | null>
  showInlineBack?: boolean
  onBack: () => void
}

export function BuildingDetailPage({
  scrollRootRef,
  showInlineBack = true,
  onBack,
}: BuildingDetailPageProps) {
  const listingTriggerRef = useRef<HTMLButtonElement | null>(null)
  const preview = useListingGridPreview()
  const { user } = useAuth()
  const exploreNeighbourhood = useBuildingDetailSession()
  const {
    selectedBuilding: building,
    buildingDetailFilters,
    isListingSearch,
    pendingListingId,
    onListingSelect,
  } = useMapSearchResults()

  const listingsQuery = useSearchListingsInBuilding({
    buildingId: building?._id,
    filters: buildingDetailFilters,
    limit: DEFAULT_LISTING_PAGE_SIZE,
    enabled: Boolean(building),
  })

  const listings = useMemo(() => {
    return flattenUniqueInfiniteItems({
      data: listingsQuery.data,
      getItems: (page) => page.data.listings,
      getKey: (listing) => listing._id,
    })
  }, [listingsQuery.data])

  const totalListings = listingsQuery.data?.pages[0]?.pagination.total ?? 0
  const hasListings = listings.length > 0
  const isInitialLoading = listingsQuery.isPending && !hasListings
  const isInitialError = listingsQuery.isError && !hasListings
  const isBackgroundFetching =
    listingsQuery.isFetching &&
    !listingsQuery.isFetchingNextPage &&
    hasListings

  useEffect(() => {
    if (pendingListingId || !listingTriggerRef.current) return

    listingTriggerRef.current.focus()
  }, [pendingListingId])

  const openListing = (listingId: string, trigger?: HTMLButtonElement) => {
    if (trigger) listingTriggerRef.current = trigger
    onListingSelect(listingId)
  }

  if (!building) return null

  return (
    <>
      {showInlineBack && (
        <button
          type="button"
          className="mb-3 flex items-center gap-2 px-4 text-sm font-medium text-slate-600 hover:text-slate-950 lg:my-3"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      )}

      <BuildingPanelSummarySection
        building={building}
        hideEmptyRent={isListingSearch}
        isExploreOpen={exploreNeighbourhood.isOpen}
        onExploreNeighbourhood={exploreNeighbourhood.open}
      />

      <BuildingFollowersSection
        building={building}
        viewerUserId={user?._id}
        className="mt-4"
      />

      <div>
        <BuildingListingsSectionHeader
          totalListings={totalListings}
          isRefreshing={isBackgroundFetching}
        />

        {listingsQuery.isError && hasListings && (
          <CollectionRefreshErrorBanner
            className="mb-3"
            label="Could not update listings. Showing the previous results."
            onRetry={() => void listingsQuery.refetch()}
          />
        )}

        {isInitialLoading && (
          <ListingCollectionSkeleton
            columns="two"
            count={4}
            className={RESULTS_PANEL_LISTING_GRID_CLASS}
          />
        )}

        {isInitialError && (
          <ListingCollectionMessage
            title="Could not load listings"
            description="Please try again in a moment."
            onRetry={() => void listingsQuery.refetch()}
          />
        )}

        {!isInitialLoading &&
          !isInitialError &&
          listings.length === 0 && (
            <ListingCollectionMessage
              icon={SearchX}
              title="No listings available"
              description="Try changing filters or searching another area."
            />
          )}

        {hasListings && (
          <>
            <ListingCardGrid
              columns="two"
              className={RESULTS_PANEL_LISTING_GRID_CLASS}
              rootRef={scrollRootRef}
              hasNextPage={Boolean(listingsQuery.hasNextPage)}
              isFetchingNextPage={listingsQuery.isFetchingNextPage}
              isFetchNextPageError={listingsQuery.isFetchNextPageError}
              onFetchNextPage={() => void listingsQuery.fetchNextPage()}
              endMessage="No more listings"
              testId="building-listing-grid"
            >
              {listings.map((listing) => (
                <ListingGridCard
                  key={listing._id}
                  listing={listing}
                  showBuildingName={false}
                  onActivate={(item, trigger) => {
                    listingTriggerRef.current = trigger
                    preview.openPreview(item)
                  }}
                />
              ))}
            </ListingCardGrid>
          </>
        )}
      </div>

      <ListingGridPreviewPortal
        preview={preview}
        showBuildingName={false}
        detailMode="modal"
        onOpenDetail={openListing}
      />
    </>
  )
}
