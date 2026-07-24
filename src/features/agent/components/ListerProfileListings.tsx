import { Building2 } from "lucide-react"
import { useState } from "react"

import { ListingGridCard } from "@/features/listing/components/ListingGridCard"
import { ListingDetailModal } from "@/features/listing/components/ListingDetailModal"
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

  if (isLoading) {
    return (
      <div className="-mx-4 sm:mx-0">
        <ListingCollectionSkeleton className="mt-4" />
      </div>
    )
  }

  if (isError) {
    return (
      <ListingCollectionMessage
        title="Could not load listings"
        description="Please try again in a moment."
        onRetry={onRetry}
      />
    )
  }

  if (listings.length === 0) {
    return (
      <ListingCollectionMessage
        icon={Building2}
        title="No active listings yet"
      />
    )
  }

  return (
    <div className="mt-4 bg-white">
      <div className="-mx-4 sm:mx-0">
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
              onOpen={setSelectedListingId}
            />
          ))}
        </ListingCardGrid>
      </div>

      <ListingDetailModal
        listingId={selectedListingId}
        onClose={() => setSelectedListingId(null)}
        onListingSelect={setSelectedListingId}
      />
    </div>
  )
}
