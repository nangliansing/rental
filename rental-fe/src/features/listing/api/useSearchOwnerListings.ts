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

import {
  searchOwnerListings,
  type OwnerListingFilter,
  type OwnerListingSort,
} from "./searchOwnerListings"

export const ownerListingsQueryKey = ({
  filter,
  sort,
  limit,
}: {
  filter: OwnerListingFilter
  sort: OwnerListingSort
  limit: number
}) => queryKeys.listings.ownerList({ filter, sort, limit })

type UseSearchOwnerListingsInput = {
  filter?: OwnerListingFilter
  sort?: OwnerListingSort
  limit?: number
  enabled?: boolean
}

export const ownerListingsQueryOptions = ({
  filter = "all",
  sort = "latest",
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchOwnerListingsInput = {}) =>
  infiniteQueryOptions({
    queryKey: ownerListingsQueryKey({ filter, sort, limit }),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchOwnerListings({
        filter,
        sort,
        page: readPageParam(pageParam),
        limit,
        signal,
      }),
    getNextPageParam,
  })

export function useSearchOwnerListings({
  filter = "all",
  sort = "latest",
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchOwnerListingsInput = {}) {
  return useInfiniteQuery(
    ownerListingsQueryOptions({ filter, sort, limit, enabled }),
  )
}
