import {
  infiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  getNextPageParam,
  readPageParam,
} from "@/lib/query-pagination"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import type { SavedSearchStatus } from "./savedSearchParsers"
import { searchOwnerSavedSearches } from "./searchOwnerSavedSearches"

/** Backend defaults omitted status to Waiting; keep the cache key aligned. */
export const DEFAULT_OWNER_SAVED_SEARCH_STATUS: SavedSearchStatus =
  "Waiting"

export const ownerSavedSearchesQueryKey = ({
  status,
  limit,
}: {
  status: SavedSearchStatus
  limit: number
}) => queryKeys.savedSearches.ownerList({ status, limit })

type UseSearchOwnerSavedSearchesInput = {
  status?: SavedSearchStatus
  limit?: number
  enabled?: boolean
}

export const ownerSavedSearchesQueryOptions = ({
  status = DEFAULT_OWNER_SAVED_SEARCH_STATUS,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchOwnerSavedSearchesInput = {}) =>
  infiniteQueryOptions({
    queryKey: ownerSavedSearchesQueryKey({ status, limit }),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchOwnerSavedSearches({
        status,
        page: readPageParam(pageParam),
        limit,
        signal,
      }),
    getNextPageParam,
  })

export function useSearchOwnerSavedSearches({
  status = DEFAULT_OWNER_SAVED_SEARCH_STATUS,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchOwnerSavedSearchesInput = {}) {
  return useInfiniteQuery(
    ownerSavedSearchesQueryOptions({ status, limit, enabled }),
  )
}
