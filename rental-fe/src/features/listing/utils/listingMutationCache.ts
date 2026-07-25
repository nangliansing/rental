import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

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

const listingCollectionQueryKeys: QueryKey[] = [
  queryKeys.listings.ownerLists,
  queryKeys.mapSearch.listingsInBuilding,
  queryKeys.agentListings.lists,
  queryKeys.mapSearch.buildings,
  queryKeys.savedListings.all,
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function patchListing<T>(
  value: T,
  listingId: string,
  changes: object,
): T {
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const patched = patchListing(item, listingId, changes)
      changed ||= patched !== item
      return patched
    })
    return (changed ? next : value) as T
  }

  if (!isRecord(value)) return value

  let next: Record<string, unknown> = value
  if (value._id === listingId) {
    next = { ...value, ...changes }
  }

  for (const [key, child] of Object.entries(next)) {
    const patched = patchListing(child, listingId, changes)
    if (patched === child) continue
    if (next === value) next = { ...value }
    next[key] = patched
  }

  return next as T
}

function removeListing<T>(value: T, listingId: string): T {
  if (Array.isArray(value)) {
    let changed = false
    const next = value
      .filter((item) => {
        const shouldRemove = isRecord(item) && item._id === listingId
        changed ||= shouldRemove
        return !shouldRemove
      })
      .map((item) => {
        const patched = removeListing(item, listingId)
        changed ||= patched !== item
        return patched
      })
    return (changed ? next : value) as T
  }

  if (!isRecord(value)) return value

  let next: Record<string, unknown> = value
  for (const [key, child] of Object.entries(value)) {
    const patched = removeListing(child, listingId)
    if (patched === child) continue
    if (next === value) next = { ...value }
    next[key] = patched
  }
  return next as T
}

function removeListingFromCountedCollection<T>(value: T, listingId: string): T {
  if (Array.isArray(value)) {
    let changed = false
    const next = value
      .filter((item) => {
        const shouldRemove = isRecord(item) && item._id === listingId
        changed ||= shouldRemove
        return !shouldRemove
      })
      .map((item) => {
        const patched = removeListingFromCountedCollection(item, listingId)
        changed ||= patched !== item
        return patched
      })
    return (changed ? next : value) as T
  }

  if (!isRecord(value)) return value

  const pagination = isRecord(value.pagination) ? value.pagination : null
  const data = value.data
  const directListings = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.listings)
      ? data.listings
      : null

  if (pagination && directListings) {
    const removedCount = directListings.filter(
      (item) => isRecord(item) && item._id === listingId,
    ).length
    const nextListings = directListings.filter(
      (item) => !(isRecord(item) && item._id === listingId),
    )
    const nextData = Array.isArray(data)
      ? nextListings
      : { ...(data as Record<string, unknown>), listings: nextListings }

    return {
      ...value,
      data: removeListing(nextData, listingId),
      pagination: {
        ...pagination,
        total:
          typeof pagination.total === "number"
            ? Math.max(0, pagination.total - removedCount)
            : pagination.total,
      },
    } as T
  }

  let next: Record<string, unknown> = value
  for (const [key, child] of Object.entries(value)) {
    const patched = removeListingFromCountedCollection(child, listingId)
    if (patched === child) continue
    if (next === value) next = { ...value }
    next[key] = patched
  }
  return next as T
}

function markSavedListingUnavailable<T>(value: T, listingId: string): T {
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const patched = markSavedListingUnavailable(item, listingId)
      changed ||= patched !== item
      return patched
    })
    return (changed ? next : value) as T
  }

  if (!isRecord(value)) return value

  let next: Record<string, unknown> = value
  if (value.listingId === listingId && value.listing !== null) {
    next = { ...value, listing: null }
  }

  for (const [key, child] of Object.entries(next)) {
    const patched = markSavedListingUnavailable(child, listingId)
    if (patched === child) continue
    if (next === value) next = { ...value }
    next[key] = patched
  }
  return next as T
}

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
  const patchedQueries = new Set<string>()

  relatedListingQueryKeys(listingId).forEach((queryKey) => {
    queryClient
      .getQueryCache()
      .findAll({ queryKey })
      .forEach((query) => {
        if (patchedQueries.has(query.queryHash)) return
        patchedQueries.add(query.queryHash)
        queryClient.setQueryData(query.queryKey, (current: unknown) =>
          patchListing(current, listingId, changes),
        )
      })
  })
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
  const collectionPrefixes: QueryKey[] = [
    queryKeys.listings.ownerLists,
    queryKeys.mapSearch.listingsInBuilding,
    queryKeys.agentListings.lists,
    queryKeys.mapSearch.buildings,
  ]

  collectionPrefixes.forEach((queryKey) => {
    queryClient.setQueriesData({ queryKey }, (current: unknown) =>
      removeListingFromCountedCollection(current, listingId),
    )
  })

  queryClient.setQueriesData(
    { queryKey: queryKeys.savedListings.all },
    (current: unknown) => markSavedListingUnavailable(current, listingId),
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
