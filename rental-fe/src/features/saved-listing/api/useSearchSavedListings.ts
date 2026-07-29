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

import { searchSavedListings } from "./searchSavedListings"

export const savedListingsQueryKey = ({ limit }: { limit: number }) =>
  queryKeys.savedListings.list({ limit })

type UseSearchSavedListingsInput = {
  limit?: number
  enabled?: boolean
}

export const savedListingsQueryOptions = ({
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchSavedListingsInput = {}) =>
  infiniteQueryOptions({
    queryKey: savedListingsQueryKey({ limit }),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchSavedListings({
        page: readPageParam(pageParam),
        limit,
        signal,
      }),
    getNextPageParam,
  })

export function useSearchSavedListings({
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchSavedListingsInput = {}) {
  return useInfiniteQuery(savedListingsQueryOptions({ limit, enabled }))
}
