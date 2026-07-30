import { Building2 } from "lucide-react"
import { useState } from "react"

import { ListingGridCard } from "@/features/listing/components/ListingGridCard"
import { ListingDetailModal } from "@/features/listing/components/ListingDetailModal"
import {
  ListingGridPreviewPortal,
  useListingGridPreview,
} from "@/features/listing/components/grid-preview"
import { ProfileTabPanel } from "@/features/profile/components/ProfileTabPanel"
import { PROFILE_TAB_CONTENT_TOP_CLASS } from "@/features/profile/utils/profileLayoutStyles"
import type { SearchListing } from "@/features/map-search/types"
import { ListingCardGrid } from "@/shared/components/collections/ListingCardGrid"
import {
  ListingCollectionMessage,
  ListingCollectionSkeleton,
} from "@/shared/components/collections/ListingCollectionState"

type ListerProfileListingsProps = {
  listings: SearchListing[]
  isLoading: boolean
  isError: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError?: boolean
  onFetchNextPage: () => void
  onRetry?: () => void
}

export function ListerProfileListings({
  listings,
  isLoading,
  isError,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError = false,
  onFetchNextPage,
  onRetry,
}: ListerProfileListingsProps) {
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const preview = useListingGridPreview()

  if (isLoading) {
    return (
      <ListingCollectionSkeleton className={PROFILE_TAB_CONTENT_TOP_CLASS} />
    )
  }

  if (isError) {
    return (
      <ListingCollectionMessage
        className={PROFILE_TAB_CONTENT_TOP_CLASS}
        title="Could not load listings"
        description="Please try again in a moment."
        onRetry={onRetry}
      />
    )
  }

  if (listings.length === 0) {
    return (
      <ListingCollectionMessage
        className={PROFILE_TAB_CONTENT_TOP_CLASS}
        icon={Building2}
        title="No active listings yet"
      />
    )
  }

  return (
    <ProfileTabPanel>
      <ListingCardGrid
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isFetchNextPageError={isFetchNextPageError}
        onFetchNextPage={onFetchNextPage}
        endMessage="No more listings"
      >
        {listings.map((listing) => (
          <ListingGridCard
            key={listing._id}
            listing={listing}
            onActivate={preview.openPreview}
          />
        ))}
      </ListingCardGrid>

      <ListingGridPreviewPortal
        preview={preview}
        onOpenDetail={setSelectedListingId}
      />

      <ListingDetailModal
        listingId={selectedListingId}
        onClose={() => setSelectedListingId(null)}
        onListingSelect={setSelectedListingId}
      />
    </ProfileTabPanel>
  )
}
