import { BuildingPanelSummarySection } from "@/features/buildings/components/BuildingPanelSummarySection"
import { useNeighbourhoodExploreDialogContext } from "@/features/buildings/neighbourhood-explore"
import { useSearchListingsInBuilding } from "@/features/map-search/api/useSearchListingsInBuilding"
import type { SearchListing } from "@/features/map-search/types"
import { ListingCardGrid } from "@/shared/components/collections/ListingCardGrid"
import { ListingCollectionSkeleton } from "@/shared/components/collections/ListingCollectionState"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"

import type { ListingDetailListing } from "../types"
import { buildListingDirectionsDestination } from "../utils/buildListingDirectionsDestination"
import { ListingGridCard } from "./ListingGridCard"
import { ListingPostCard } from "./ListingPostCard"

const EMPTY_LISTING_FILTERS = {}

type ListingDetailContentProps = {
  listing: ListingDetailListing
  currentUserId?: string
  canCreateListing?: boolean
  onDeleted?: () => void
  onListingSelect?: (listingId: string) => void
}

type ListingDetailSectionProps = {
  listing: ListingDetailListing
  currentUserId?: string
  canCreateListing: boolean
  onDeleted?: () => void
  onListingSelect?: (listingId: string) => void
}

export function ListingDetailContent({
  listing,
  currentUserId,
  canCreateListing = false,
  onDeleted,
  onListingSelect,
}: ListingDetailContentProps) {
  const sectionProps: ListingDetailSectionProps = {
    listing,
    currentUserId,
    canCreateListing,
    onDeleted,
    onListingSelect,
  }

  return (
    <>
      <ListingDetailPostSection {...sectionProps} />
      <ListingDetailBuildingSection listing={listing} />
      <ListingDetailMoreListingsSection
        listing={listing}
        onListingSelect={onListingSelect}
      />
    </>
  )
}

function ListingDetailPostSection({
  listing,
  currentUserId,
  canCreateListing,
  onDeleted,
}: ListingDetailSectionProps) {
  return (
    <div className="overflow-hidden border-t border-slate-100 bg-white">
      <ListingPostCard
        listing={listing}
        currentUserId={currentUserId}
        canCreateListing={canCreateListing}
        directionsDestination={buildListingDirectionsDestination(listing.building)}
        onDeleted={onDeleted}
      />
    </div>
  )
}

function ListingDetailBuildingSection({
  listing,
}: {
  listing: ListingDetailListing
}) {
  const exploreNeighbourhood = useNeighbourhoodExploreDialogContext()

  return (
    <BuildingPanelSummarySection
      building={listing.building}
      breakout="flush"
      titleLevel={2}
      isExploreOpen={exploreNeighbourhood?.isOpen ?? false}
      onExploreNeighbourhood={exploreNeighbourhood?.open}
    />
  )
}

function ListingDetailMoreListingsSection({
  listing,
  onListingSelect,
}: {
  listing: ListingDetailListing
  onListingSelect?: (listingId: string) => void
}) {
  return (
    <MoreListingsInBuilding
      building={listing.building}
      currentListingId={listing._id}
      onListingSelect={onListingSelect}
    />
  )
}

function MoreListingsInBuilding({
  building,
  currentListingId,
  onListingSelect,
}: {
  building: ListingDetailListing["building"]
  currentListingId: string
  onListingSelect?: (listingId: string) => void
}) {
  const listingsQuery = useSearchListingsInBuilding({
    buildingId: building?._id,
    filters: EMPTY_LISTING_FILTERS,
    limit: 12,
    enabled: Boolean(building?._id),
  })

  const listings = flattenUniqueInfiniteItems({
    data: listingsQuery.data,
    getItems: (page) => page.data.listings,
    getKey: (listing) => listing._id,
  }).filter((listing) => listing._id !== currentListingId)

  if (!building) return null

  if (listingsQuery.isLoading) {
    return (
      <section
        className="bg-white px-4 py-5 sm:px-6"
        aria-busy="true"
        aria-label="Loading more rooms in this building"
      >
        <div className="mb-4 space-y-1">
          <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-64 animate-pulse rounded bg-slate-100" />
        </div>
        <ListingCollectionSkeleton
          className="-mx-4 sm:-mx-6"
          count={4}
        />
      </section>
    )
  }

  if (listingsQuery.isError || listings.length === 0) return null

  return (
    <section className="bg-white px-4 py-5 sm:px-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            More rooms in this building
          </h2>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Available listings at {building.name}
          </p>
        </div>
      </div>

      <ListingCardGrid
        className="-mx-4 sm:-mx-6"
        hasNextPage={Boolean(listingsQuery.hasNextPage)}
        isFetchingNextPage={listingsQuery.isFetchingNextPage}
        isFetchNextPageError={listingsQuery.isFetchNextPageError}
        onFetchNextPage={() => void listingsQuery.fetchNextPage()}
        endMessage="No more rooms"
        testId="more-rooms-grid"
      >
        {listings.map((listing) => (
          <BuildingListingGridItem
            key={listing._id}
            listing={listing}
            onListingSelect={onListingSelect}
          />
        ))}
      </ListingCardGrid>
    </section>
  )
}

function BuildingListingGridItem({
  listing,
  onListingSelect,
}: {
  listing: SearchListing
  onListingSelect?: (listingId: string) => void
}) {
  return <ListingGridCard listing={listing} onOpen={onListingSelect} />
}
