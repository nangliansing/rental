import { useInfiniteQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  searchOwnerListings,
  type OwnerListingSort,
  type OwnerListingVisibilityFilter,
} from "./searchOwnerListings"

export const ownerListingsQueryKey = ({
  visibility,
  sort,
  limit,
}: {
  visibility: OwnerListingVisibilityFilter
  sort: OwnerListingSort
  limit: number
}) => queryKeys.listings.ownerList({ visibility, sort, limit })

type UseSearchOwnerListingsInput = {
  visibility?: OwnerListingVisibilityFilter
  sort?: OwnerListingSort
  limit?: number
  enabled?: boolean
}

export function useSearchOwnerListings({
  visibility = "all",
  sort = "latest",
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchOwnerListingsInput = {}) {
  return useInfiniteQuery({
    queryKey: ownerListingsQueryKey({ visibility, sort, limit }),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchOwnerListings({
        visibility,
        sort,
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
