import { useInfiniteQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"

import type { ListerReviewSort } from "./createListerReview"
import { searchListerReviews } from "./searchListerReviews"

export const listerReviewsQueryKey = ({
  listerProfileId,
  sort,
  limit,
}: {
  listerProfileId: string
  sort: ListerReviewSort
  limit: number
}) => queryKeys.listerReviews.list({ listerProfileId, sort, limit })

type UseSearchListerReviewsInput = {
  listerProfileId?: string
  sort?: ListerReviewSort
  limit?: number
  enabled?: boolean
}

export function useSearchListerReviews({
  listerProfileId,
  sort = "latest",
  limit = 20,
  enabled = true,
}: UseSearchListerReviewsInput = {}) {
  return useInfiniteQuery({
    queryKey: listerReviewsQueryKey({
      listerProfileId: listerProfileId ?? "",
      sort,
      limit,
    }),
    enabled: enabled && Boolean(listerProfileId),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      searchListerReviews({
        listerProfileId: listerProfileId!,
        sort,
        page: Number(pageParam),
        limit,
      }),
    getNextPageParam: (lastPage) => {
      const { page, limit, total } = lastPage.pagination
      const loaded = page * limit

      return loaded < total ? page + 1 : undefined
    },
  })
}
