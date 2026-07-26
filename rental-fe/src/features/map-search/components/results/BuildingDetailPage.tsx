// src/features/map-search/components/results/BuildingDetailPage.tsx
import { useEffect, useMemo, useRef } from "react"
import type React from "react"
import { ChevronLeft, SearchX } from "lucide-react"

import { BuildingSummaryCard } from "@/features/buildings/components/BuildingSummaryCard"
import { BuildingNeighbourhoodSection } from "@/features/buildings/components/BuildingNeighbourhoodSection"
import { ListingDetailModal } from "@/features/listing/components/ListingDetailModal"
import { ListingGridCard } from "@/features/listing/components/ListingGridCard"
import { ListingCardGrid } from "@/shared/components/collections/ListingCardGrid"
import {
  CollectionRefreshStatus,
  ListingCollectionMessage,
  ListingCollectionSkeleton,
} from "@/shared/components/collections/ListingCollectionState"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import { useSearchListingsInBuilding } from "../../api/useSearchListingsInBuilding"
import { CollectionRefreshErrorBanner } from "./CollectionRefreshErrorBanner"
import { useMapSearchResults } from "../../context/MapSearchSessionContext"

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
  const shouldRestoreFocusRef = useRef(false)
  const {
    selectedBuilding: building,
    buildingDetailFilters,
    isListingSearch,
    pendingListingId,
    onListingSelect,
    onListingClose,
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
    if (pendingListingId || !shouldRestoreFocusRef.current) return

    shouldRestoreFocusRef.current = false
    listingTriggerRef.current?.focus()
  }, [pendingListingId])

  const openListing = (listingId: string, trigger?: HTMLButtonElement) => {
    if (trigger) listingTriggerRef.current = trigger
    onListingSelect(listingId)
  }

  const closeListing = () => {
    shouldRestoreFocusRef.current = true
    onListingClose()
  }

  if (!building) return null

  return (
    <>
      <div className="mb-4">
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

        <BuildingSummaryCard
          building={building}
          hideEmptyRent={isListingSearch}
        />
      </div>

      <BuildingNeighbourhoodSection buildingId={building._id} className="mb-4" />

      <div>
        <p className="mb-3 px-4 text-sm font-semibold">
          {totalListings} available listings
        </p>

        {isBackgroundFetching && (
          <CollectionRefreshStatus
            label="Updating listings..."
            className="mb-2 px-4"
          />
        )}

        {listingsQuery.isError && hasListings && (
          <CollectionRefreshErrorBanner
            className="mx-4 mb-3"
            label="Could not update listings. Showing the previous results."
            onRetry={() => void listingsQuery.refetch()}
          />
        )}

        {isInitialLoading && (
          <ListingCollectionSkeleton columns="two" count={4} />
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
                  onOpen={openListing}
                />
              ))}
            </ListingCardGrid>
          </>
        )}
      </div>

      <ListingDetailModal
        listingId={pendingListingId}
        onClose={closeListing}
        onListingSelect={openListing}
        mobileBackLabel={building.name}
        desktopBackLabel="Back to building"
        trackBrowserHistory={false}
      />
    </>
  )
}
