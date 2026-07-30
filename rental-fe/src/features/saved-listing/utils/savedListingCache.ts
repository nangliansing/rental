import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  removeDeep,
  updateDeep,
  updateDeepInQueries,
} from "@/lib/query-state"
import { applyToCachedQueries } from "@/lib/query-state/shared"

export const SAVED_LISTING_WRITE_SCOPE_ID = "saved-listing-write"

export const relatedSavedListingQueryKeys: QueryKey[] = [
  queryKeys.savedListings.all,
  queryKeys.listings.ownerLists,
  queryKeys.listings.ownerDetails,
  queryKeys.listings.publicDetails,
  queryKeys.agentListings.lists,
  queryKeys.mapSearch.buildings,
  queryKeys.mapSearch.listingsInBuilding,
]

const isListingSavedStateTarget =
  (listingId: string) => (value: Record<string, unknown>) =>
    value._id === listingId &&
    ("rent" in value || "buildingId" in value || "isSavedByMe" in value)

/** Saved-list row keyed by listing id, not the listing record itself. */
const isSavedListingRow =
  (listingId: string) => (value: Record<string, unknown>) =>
    value.listingId === listingId &&
    typeof value._id === "string" &&
    value._id !== listingId

function removeSavedListingRowsFromCache(
  queryClient: QueryClient,
  listingId: string,
) {
  applyToCachedQueries(queryClient, [queryKeys.savedListings.all], (current) =>
    removeDeep(
      updateDeep(
        current,
        isListingSavedStateTarget(listingId),
        (listing) => ({ ...listing, isSavedByMe: false }),
      ),
      isSavedListingRow(listingId),
    ),
  )
}

export function patchListingSavedStateInCache({
  queryClient,
  listingId,
  isSaved,
}: {
  queryClient: QueryClient
  listingId: string
  isSaved: boolean
}) {
  updateDeepInQueries(
    queryClient,
    relatedSavedListingQueryKeys,
    isListingSavedStateTarget(listingId),
    (listing) =>
      listing.isSavedByMe === isSaved
        ? listing
        : { ...listing, isSavedByMe: isSaved },
  )
}

export function applyDeletedSavedListingToCache(
  queryClient: QueryClient,
  listingId: string,
) {
  patchListingSavedStateInCache({ queryClient, listingId, isSaved: false })
  removeSavedListingRowsFromCache(queryClient, listingId)
}

export async function syncListingSavedState({
  queryClient,
  listingId,
  isSaved,
}: {
  queryClient: QueryClient
  listingId: string
  isSaved: boolean
}) {
  patchListingSavedStateInCache({ queryClient, listingId, isSaved })

  if (!isSaved) {
    removeSavedListingRowsFromCache(queryClient, listingId)
    return
  }

  // Create responses do not contain the populated live listing required by
  // the saved-listings panel. Refresh that collection without refetching the
  // listing feed or detail currently being viewed.
  await queryClient.invalidateQueries({ queryKey: queryKeys.savedListings.all })
}
