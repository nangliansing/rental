import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  removeDeepInQueries,
  updateDeepInQueries,
} from "@/lib/query-state"

export type ListingCacheSnapshot = Array<{
  data: unknown
  queryKey: QueryKey
}>

export const relatedListingQueryKeys = (listingId: string): QueryKey[] => [
  queryKeys.listings.ownerDetail(listingId),
  queryKeys.listings.ownerLists,
  queryKeys.listings.publicListingDetails(listingId),
  queryKeys.mapSearch.listingsInBuilding,
  queryKeys.agentListings.lists,
  queryKeys.mapSearch.buildings,
  queryKeys.savedListings.all,
]

export const listingCollectionQueryKeys: QueryKey[] = [
  queryKeys.listings.ownerLists,
  queryKeys.mapSearch.listingsInBuilding,
  queryKeys.agentListings.lists,
  queryKeys.mapSearch.buildings,
  queryKeys.savedListings.all,
]

const listingCollectionPrefixes: QueryKey[] = [
  queryKeys.listings.ownerLists,
  queryKeys.mapSearch.listingsInBuilding,
  queryKeys.agentListings.lists,
  queryKeys.mapSearch.buildings,
]

const isListingRecord =
  (listingId: string) =>
  (value: Record<string, unknown>) =>
    value._id === listingId

const isSavedListingWithLiveListing =
  (listingId: string) =>
  (value: Record<string, unknown>) =>
    value.listingId === listingId && value.listing !== null

export async function cancelRelatedListingQueries(
  queryClient: QueryClient,
  listingId: string,
) {
  await Promise.all(
    relatedListingQueryKeys(listingId).map((queryKey) =>
      queryClient.cancelQueries({ queryKey }),
    ),
  )
}

export function captureRelatedListingQueries(
  queryClient: QueryClient,
  listingId: string,
): ListingCacheSnapshot {
  const snapshots = new Map<string, ListingCacheSnapshot[number]>()

  relatedListingQueryKeys(listingId).forEach((queryKey) => {
    queryClient
      .getQueryCache()
      .findAll({ queryKey })
      .forEach((query) => {
        snapshots.set(query.queryHash, {
          queryKey: query.queryKey,
          data: query.state.data,
        })
      })
  })

  return [...snapshots.values()]
}

export function patchListingInRelatedQueries(
  queryClient: QueryClient,
  listingId: string,
  changes: object,
) {
  updateDeepInQueries(
    queryClient,
    relatedListingQueryKeys(listingId),
    isListingRecord(listingId),
    (listing) => ({ ...listing, ...changes }),
  )
}

export function restoreListingCacheSnapshot(
  queryClient: QueryClient,
  snapshot: ListingCacheSnapshot,
) {
  snapshot.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data)
  })
}

export function optimisticallyDeleteListing(
  queryClient: QueryClient,
  listingId: string,
) {
  // Saved-listing caches are intentionally excluded: saved rows keep their
  // snapshot and only have the embedded live listing marked unavailable.
  removeDeepInQueries(
    queryClient,
    listingCollectionPrefixes,
    isListingRecord(listingId),
  )

  updateDeepInQueries(
    queryClient,
    [queryKeys.savedListings.all],
    isSavedListingWithLiveListing(listingId),
    (saved) => ({ ...saved, listing: null }),
  )

  patchListingInRelatedQueries(queryClient, listingId, {
    visibility: "PRIVATE",
  })
}

export function removeDeletedListingDetails(
  queryClient: QueryClient,
  listingId: string,
) {
  queryClient.removeQueries({ queryKey: queryKeys.listings.ownerDetail(listingId) })
  queryClient.removeQueries({
    queryKey: queryKeys.listings.publicListingDetails(listingId),
  })
}

export async function invalidateListingCollections(queryClient: QueryClient) {
  await Promise.all(
    listingCollectionQueryKeys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  )
}
