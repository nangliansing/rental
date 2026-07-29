import {
  infiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  getNextPageParam,
  readPageParam,
} from "@/lib/query-pagination"

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

export const listerReviewsQueryOptions = ({
  listerProfileId,
  sort = "latest",
  limit = 20,
  enabled = true,
}: UseSearchListerReviewsInput = {}) =>
  infiniteQueryOptions({
    queryKey: listerReviewsQueryKey({
      listerProfileId: listerProfileId ?? "",
      sort,
      limit,
    }),
    enabled: enabled && Boolean(listerProfileId?.trim()),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchListerReviews({
        listerProfileId: listerProfileId ?? "",
        sort,
        page: readPageParam(pageParam),
        limit,
        signal,
      }),
    getNextPageParam,
  })

export function useSearchListerReviews({
  listerProfileId,
  sort = "latest",
  limit = 20,
  enabled = true,
}: UseSearchListerReviewsInput = {}) {
  return useInfiniteQuery(
    listerReviewsQueryOptions({
      listerProfileId,
      sort,
      limit,
      enabled,
    }),
  )
}
