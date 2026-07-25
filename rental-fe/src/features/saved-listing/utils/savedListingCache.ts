import type { Query, QueryClient, QueryKey } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

export const relatedSavedListingQueryKeys: QueryKey[] = [
  queryKeys.savedListings.all,
  queryKeys.listings.ownerLists,
  queryKeys.listings.ownerDetails,
  queryKeys.listings.publicDetails,
  queryKeys.agentListings.lists,
  queryKeys.mapSearch.buildings,
  queryKeys.mapSearch.listingsInBuilding,
]

type PatchResult<T> = {
  value: T
  changed: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function looksLikeListing(value: Record<string, unknown>, listingId: string) {
  return (
    value._id === listingId &&
    ("rent" in value || "buildingId" in value || "isSavedByMe" in value)
  )
}

function patchSavedState<T>(value: T, listingId: string, isSaved: boolean): PatchResult<T> {
  if (Array.isArray(value)) {
    let changed = false
    const nextValue = value.map((item) => {
      const patched = patchSavedState(item, listingId, isSaved)
      changed ||= patched.changed
      return patched.value
    })

    return {
      value: (changed ? nextValue : value) as T,
      changed,
    }
  }

  if (!isRecord(value)) {
    return { value, changed: false }
  }

  let changed = false
  let nextValue: Record<string, unknown> = value

  if (looksLikeListing(value, listingId) && value.isSavedByMe !== isSaved) {
    nextValue = { ...nextValue, isSavedByMe: isSaved }
    changed = true
  }

  for (const [key, childValue] of Object.entries(nextValue)) {
    const patched = patchSavedState(childValue, listingId, isSaved)

    if (!patched.changed) continue

    if (nextValue === value) nextValue = { ...value }
    nextValue[key] = patched.value
    changed = true
  }

  return {
    value: (changed ? nextValue : value) as T,
    changed,
  }
}

function removeListingFromSavedData<T>(value: T, listingId: string): PatchResult<T> {
  if (Array.isArray(value)) {
    let changed = false
    const nextValue = value.map((item) => {
      const patched = removeListingFromSavedData(item, listingId)
      changed ||= patched.changed
      return patched.value
    })

    return {
      value: (changed ? nextValue : value) as T,
      changed,
    }
  }

  if (!isRecord(value)) {
    return { value, changed: false }
  }

  const data = value.data
  let changed = false
  let nextValue: Record<string, unknown> = value

  if (isRecord(data) && Array.isArray(data.savedListings)) {
    const nextSavedListings = data.savedListings.filter((savedListing) => {
      return !isRecord(savedListing) || savedListing.listingId !== listingId
    })

    if (nextSavedListings.length !== data.savedListings.length) {
      const removedCount = data.savedListings.length - nextSavedListings.length
      const pagination = isRecord(value.pagination)
        ? {
            ...value.pagination,
            total:
              typeof value.pagination.total === "number"
                ? Math.max(value.pagination.total - removedCount, 0)
                : value.pagination.total,
          }
        : value.pagination

      nextValue = {
        ...value,
        data: {
          ...data,
          savedListings: nextSavedListings,
        },
        pagination,
      }
      changed = true
    }
  }

  for (const [key, childValue] of Object.entries(nextValue)) {
    const patched = removeListingFromSavedData(childValue, listingId)
    if (!patched.changed) continue

    if (nextValue === value) nextValue = { ...value }
    nextValue[key] = patched.value
    changed = true
  }

  return {
    value: (changed ? nextValue : value) as T,
    changed,
  }
}

function removeListingFromSavedCaches(queryClient: QueryClient, listingId: string) {
  queryClient.getQueryCache().findAll({ queryKey: queryKeys.savedListings.all }).forEach((query) => {
    queryClient.setQueryData(query.queryKey, (currentData: unknown) => {
      const patched = patchSavedState(currentData, listingId, false)
      const withoutListing = removeListingFromSavedData(patched.value, listingId)

      return withoutListing.changed ? withoutListing.value : patched.value
    })
  })
}

function relatedSavedListingQueries(queryClient: QueryClient) {
  const queries = new Map<string, Query>()

  relatedSavedListingQueryKeys.forEach((queryKey) => {
    queryClient.getQueryCache().findAll({ queryKey }).forEach((query) => {
      queries.set(query.queryHash, query)
    })
  })

  return [...queries.values()]
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
  relatedSavedListingQueries(queryClient).forEach((query) => {
    queryClient.setQueryData(query.queryKey, (currentData: unknown) => {
      const patched = patchSavedState(currentData, listingId, isSaved)
      return patched.changed ? patched.value : currentData
    })
  })
}

export function applyDeletedSavedListingToCache(
  queryClient: QueryClient,
  listingId: string,
) {
  patchListingSavedStateInCache({ queryClient, listingId, isSaved: false })
  removeListingFromSavedCaches(queryClient, listingId)
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
    removeListingFromSavedCaches(queryClient, listingId)
    return
  }

  // Create responses do not contain the populated live listing required by
  // the saved-listings panel. Refresh that collection without refetching the
  // listing feed or detail currently being viewed.
  await queryClient.invalidateQueries({ queryKey: queryKeys.savedListings.all })
}
