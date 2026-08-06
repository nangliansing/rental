import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query"

import type { OptimisticCachePlan } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"
import { removeFromInfiniteListInQueries } from "@/lib/query-state"
import {
  findStatusItem,
  updateStatusCache,
  type StatusCacheSnapshot,
} from "@/lib/status-transition-cache"

import {
  parseSavedSearchFilters,
  type SavedSearch,
  type SavedSearchFilters,
  type SavedSearchGeoSearch,
  type SearchOwnerSavedSearchesResponse,
} from "./savedSearchParsers"
import { buildCreateOwnerSavedSearchGeoSearch } from "./createOwnerSavedSearch"

export type OwnerSavedSearchesInfiniteData =
  InfiniteData<SearchOwnerSavedSearchesResponse>

export type OwnerSavedSearchCacheSnapshot = StatusCacheSnapshot<
  SavedSearch,
  SearchOwnerSavedSearchesResponse
>

/** Close/update/delete owner writes that conflict on the same request domain. */
export const OWNER_SAVED_SEARCH_WRITE_SCOPE_ID = "owner-saved-search-write"

export type OwnerSavedSearchContentPatch = {
  name?: string
  description?: string | null
  geoSearch?: SavedSearchGeoSearch
  filters?: SavedSearchFilters
}

export function ownerSavedSearchCachePlan(
  savedSearchId: string,
): OptimisticCachePlan {
  const detailKey = queryKeys.savedSearches.ownerDetail(savedSearchId)

  return {
    cancel: [queryKeys.savedSearches.ownerLists, detailKey],
    snapshot: [queryKeys.savedSearches.ownerLists],
    snapshotExact: [detailKey],
    invalidate: [queryKeys.savedSearches.ownerLists, detailKey],
  }
}

/**
 * Reads the concrete caches to patch after the transaction engine has already
 * cancelled and snapshotted the query family.
 */
export function readOwnerSavedSearchCache(
  queryClient: QueryClient,
  savedSearchId: string,
): OwnerSavedSearchCacheSnapshot {
  const detailKey = queryKeys.savedSearches.ownerDetail(savedSearchId)

  return {
    detailKey,
    detailData: queryClient.getQueryData<SavedSearch>(detailKey),
    listData: queryClient.getQueriesData<OwnerSavedSearchesInfiniteData>({
      queryKey: queryKeys.savedSearches.ownerLists,
    }),
  }
}

export function findOwnerSavedSearch(
  detail: SavedSearch | undefined,
  lists: [QueryKey, OwnerSavedSearchesInfiniteData | undefined][],
  savedSearchId: string,
) {
  return findStatusItem(detail, lists, savedSearchId)
}

export function createOptimisticClosedSavedSearch(
  savedSearch: SavedSearch,
): SavedSearch {
  return {
    ...savedSearch,
    status: "Closed",
  }
}

export function createOptimisticUpdatedSavedSearch(
  savedSearch: SavedSearch,
  patch: OwnerSavedSearchContentPatch,
): SavedSearch {
  const next: SavedSearch = {
    ...savedSearch,
    status: savedSearch.status,
  }

  if (patch.name !== undefined) {
    next.name = patch.name.trim()
  }

  if (patch.description !== undefined) {
    next.description =
      patch.description === null
        ? null
        : patch.description.trim() || null
  }

  if (patch.geoSearch !== undefined) {
    next.geoSearch = buildCreateOwnerSavedSearchGeoSearch(patch.geoSearch)
  }

  if (patch.filters !== undefined) {
    next.filters = parseSavedSearchFilters(patch.filters)
  }

  return next
}

export function createOptimisticDeletedSavedSearch(
  savedSearch: SavedSearch,
  deletedAt = new Date().toISOString(),
): SavedSearch {
  return {
    ...savedSearch,
    isDeleted: true,
    deletedAt,
  }
}

/** Soft-delete leaves status unchanged, so remove from every owner list variant. */
export function removeOwnerSavedSearchFromLists(
  queryClient: QueryClient,
  savedSearchId: string,
) {
  removeFromInfiniteListInQueries<SavedSearch>(
    queryClient,
    [queryKeys.savedSearches.ownerLists],
    item => item._id === savedSearchId,
  )
}

export function updateOwnerSavedSearchCache(
  queryClient: QueryClient,
  snapshot: OwnerSavedSearchCacheSnapshot,
  savedSearch: SavedSearch,
) {
  updateStatusCache(queryClient, snapshot, savedSearch)
}

export function softDeleteOwnerSavedSearchCache(
  queryClient: QueryClient,
  savedSearchId: string,
  deleted: SavedSearch,
) {
  removeOwnerSavedSearchFromLists(queryClient, savedSearchId)
  queryClient.setQueryData(
    queryKeys.savedSearches.ownerDetail(savedSearchId),
    deleted,
  )
}
