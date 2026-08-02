import { Heart } from "lucide-react"
import { useCallback, useMemo, useState, type RefObject } from "react"

import { ListingDetailModal } from "@/features/listing/components/ListingDetailModal"
import { ListingCardGrid } from "@/shared/components/collections/ListingCardGrid"
import {
  ListingCollectionMessage,
  ListingCollectionSkeleton,
} from "@/shared/components/collections/ListingCollectionState"
import { cn } from "@/lib/utils"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"

import {
  useSearchSavedListings,
  type SearchSavedListing,
} from "../api"
import { useDeleteSavedListing } from "../hooks/useDeleteSavedListing"
import { SavedListingGridCard } from "./SavedListingGridCard"

type SavedListingsPanelProps = {
  enabled?: boolean
  layout?: "drawer" | "profile"
  rootRef?: RefObject<HTMLDivElement | null>
}

export function SavedListingsPanel({
  enabled = true,
  layout = "drawer",
  rootRef,
}: SavedListingsPanelProps) {
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [deletingSavedListingId, setDeletingSavedListingId] = useState<
    string | null
  >(null)
  const unsaveMutation = useDeleteSavedListing()

  const savedListingsQuery = useSearchSavedListings({
    limit: DEFAULT_LISTING_PAGE_SIZE,
    enabled,
  })

  const savedListings = useMemo(() => {
    return flattenUniqueInfiniteItems({
      data: savedListingsQuery.data,
      getItems: (page) => page.data?.savedListings ?? [],
      getKey: (savedListing) => savedListing._id,
    })
  }, [savedListingsQuery.data])

  const handleUnsave = useCallback(
    (item: SearchSavedListing) => {
      setDeletingSavedListingId(item._id)
      unsaveMutation.mutate(
        { listingId: item.listingId },
        { onSettled: () => setDeletingSavedListingId(null) },
      )
    },
    [unsaveMutation],
  )

  if (savedListingsQuery.isLoading) {
    return (
      <ListingCollectionSkeleton
        columns={layout === "drawer" ? "two" : "responsive"}
        count={layout === "drawer" ? 4 : 6}
      />
    )
  }

  if (savedListingsQuery.isError) {
    return (
      <ListingCollectionMessage
        title="Could not load saved rooms"
        description="Please try again in a moment."
        onRetry={() => void savedListingsQuery.refetch()}
      />
    )
  }

  if (savedListings.length === 0) {
    return (
      <ListingCollectionMessage
        icon={Heart}
        title="No saved rooms yet"
        description="Tap the heart on listings to keep rooms here for later."
      />
    )
  }

  return (
    <>
      <div className={cn(layout === "profile" && "pt-5")}>
        <ListingCardGrid
          columns={layout === "drawer" ? "two" : "responsive"}
          rootRef={rootRef}
          items={savedListings}
          getItemKey={(savedListing) => savedListing._id}
          renderItem={(savedListing) => (
            <SavedListingGridCard
              savedListing={savedListing}
              isDeleting={deletingSavedListingId === savedListing._id}
              showUnsaveButton
              onUnsave={handleUnsave}
              onOpen={setSelectedListingId}
            />
          )}
          hasNextPage={Boolean(savedListingsQuery.hasNextPage)}
          isFetchingNextPage={savedListingsQuery.isFetchingNextPage}
          isFetchNextPageError={savedListingsQuery.isFetchNextPageError}
          onFetchNextPage={() => void savedListingsQuery.fetchNextPage()}
          endMessage={
            layout === "drawer" ? "No more saved listings" : "No more saved rooms"
          }
        />
      </div>

      <ListingDetailModal
        listingId={selectedListingId}
        onClose={() => setSelectedListingId(null)}
        onListingSelect={setSelectedListingId}
      />
    </>
  )
}
