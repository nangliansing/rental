import { useCallback, useMemo } from "react"

import { BuildingPanelSummarySection } from "@/features/buildings/components/BuildingPanelSummarySection"
import { useNeighbourhoodExploreDialogContext } from "@/features/buildings/neighbourhood-explore"
import { useSearchListingsInBuilding } from "@/features/map-search/api/useSearchListingsInBuilding"
import type { SearchListing } from "@/features/map-search/types"
import { ListingCardGrid } from "@/shared/components/collections/ListingCardGrid"
import { ListingCollectionSkeleton } from "@/shared/components/collections/ListingCollectionState"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"

import type { ListingDetailListing } from "../types"
import { buildListingDirectionsDestination } from "../utils/buildListingDirectionsDestination"
import { getListingDetailPath } from "../utils/listingDisplay"
import { ListingGridCard } from "./ListingGridCard"
import {
  ListingGridPreviewPortal,
  type ListingGridPreviewPortalDetailConfig,
  useListingGridPreview,
} from "./grid-preview"
import { ListingPostCard } from "./ListingPostCard"
import { ListingDetailReviewsSection } from "./reviews/ListingDetailReviewsSection"

const EMPTY_LISTING_FILTERS = {}

type ListingDetailContentProps = {
  listing: ListingDetailListing
  currentUserId?: string
  canCreateListing?: boolean
  onDeleted?: () => void
  onListingSelect?: (listingId: string) => void
  /** How sibling listings open from the more-rooms preview. */
  siblingPreviewDetailMode?: ListingGridPreviewPortalDetailConfig["detailMode"]
}

type ListingDetailSectionProps = {
  listing: ListingDetailListing
  currentUserId?: string
  canCreateListing: boolean
  onDeleted?: () => void
  onListingSelect?: (listingId: string) => void
  siblingPreviewDetailMode: ListingGridPreviewPortalDetailConfig["detailMode"]
}

export function ListingDetailContent({
  listing,
  currentUserId,
  canCreateListing = false,
  onDeleted,
  onListingSelect,
  siblingPreviewDetailMode = "modal",
}: ListingDetailContentProps) {
  const sectionProps: ListingDetailSectionProps = {
    listing,
    currentUserId,
    canCreateListing,
    onDeleted,
    onListingSelect,
    siblingPreviewDetailMode,
  }

  return (
    <>
      <ListingDetailPostSection {...sectionProps} />
      <ListingDetailReviewsSection listing={listing} />
      <ListingDetailBuildingSection listing={listing} />
      <ListingDetailMoreListingsSection
        listing={listing}
        onListingSelect={onListingSelect}
        siblingPreviewDetailMode={siblingPreviewDetailMode}
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
  siblingPreviewDetailMode,
}: {
  listing: ListingDetailListing
  onListingSelect?: (listingId: string) => void
  siblingPreviewDetailMode: ListingGridPreviewPortalDetailConfig["detailMode"]
}) {
  return (
    <MoreListingsInBuilding
      building={listing.building}
      currentListingId={listing._id}
      onListingSelect={onListingSelect}
      siblingPreviewDetailMode={siblingPreviewDetailMode}
    />
  )
}

function MoreListingsInBuilding({
  building,
  currentListingId,
  onListingSelect,
  siblingPreviewDetailMode,
}: {
  building: ListingDetailListing["building"]
  currentListingId: string
  onListingSelect?: (listingId: string) => void
  siblingPreviewDetailMode: ListingGridPreviewPortalDetailConfig["detailMode"]
}) {
  const preview = useListingGridPreview()
  const resolveListingDetailLink = useCallback((listingId: string) => {
    const to = getListingDetailPath(listingId)
    if (!to) return null

    return { to }
  }, [])
  const handleSiblingListingSelect = useCallback(
    (listingId: string) => {
      onListingSelect?.(listingId)
    },
    [onListingSelect],
  )
  const previewPortalProps = useMemo(():
    | ListingGridPreviewPortalDetailConfig
    | null => {
    if (siblingPreviewDetailMode === "link") {
      return {
        detailMode: "link",
        resolveDetailLink: resolveListingDetailLink,
      }
    }

    if (!onListingSelect) return null

    return {
      detailMode: "modal",
      onOpenDetail: handleSiblingListingSelect,
    }
  }, [
    handleSiblingListingSelect,
    onListingSelect,
    resolveListingDetailLink,
    siblingPreviewDetailMode,
  ])
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
      >
        {listings.map((listing: SearchListing) => (
          <ListingGridCard
            key={listing._id}
            listing={listing}
            showBuildingName={false}
            onActivate={preview.openPreview}
          />
        ))}
      </ListingCardGrid>

      {previewPortalProps && (
        <ListingGridPreviewPortal
          preview={preview}
          showBuildingName={false}
          {...previewPortalProps}
        />
      )}
    </section>
  )
}
