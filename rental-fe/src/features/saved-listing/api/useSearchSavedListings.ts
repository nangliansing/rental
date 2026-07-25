import { useInfiniteQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import { searchSavedListings } from "./searchSavedListings"

export const savedListingsQueryKey = ({ limit }: { limit: number }) =>
  queryKeys.savedListings.list({ limit })

type UseSearchSavedListingsInput = {
  limit?: number
  enabled?: boolean
}

export function useSearchSavedListings({
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchSavedListingsInput = {}) {
  return useInfiniteQuery({
    queryKey: savedListingsQueryKey({ limit }),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchSavedListings({
        page: Number(pageParam),
        limit,
        signal,
      }),
    getNextPageParam: (lastPage) => {
      const { page, limit, total } = lastPage.pagination
      const loaded = page * limit

      return loaded < total ? page + 1 : undefined
    },
  })
}
