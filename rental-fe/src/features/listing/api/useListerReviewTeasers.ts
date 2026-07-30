import { queryOptions, useQuery } from "@tanstack/react-query"

import { searchListerReviews } from "@/features/lister-review/api"
import { queryKeys } from "@/lib/query-keys"

/** Small first-page size for listing-detail teaser rotation. */
export const LISTER_REVIEW_TEASER_LIMIT = 3
export const LISTER_REVIEW_TEASER_SORT = "latest" as const
const TEASER_STALE_TIME_MS = 60_000

export type UseListerReviewTeasersInput = {
  listerProfileId?: string
  /** When false, the query stays idle (e.g. off-screen or known empty). */
  enabled?: boolean
}

export const listerReviewTeasersQueryOptions = ({
  listerProfileId,
  enabled = true,
}: UseListerReviewTeasersInput = {}) => {
  const profileId = listerProfileId?.trim() || ""

  return queryOptions({
    queryKey: queryKeys.listerReviewTeasers.list({
      listerProfileId: profileId,
      sort: LISTER_REVIEW_TEASER_SORT,
      limit: LISTER_REVIEW_TEASER_LIMIT,
    }),
    queryFn: ({ signal }) =>
      searchListerReviews({
        listerProfileId: profileId,
        page: 1,
        limit: LISTER_REVIEW_TEASER_LIMIT,
        sort: LISTER_REVIEW_TEASER_SORT,
        signal,
      }),
    enabled: enabled && Boolean(profileId),
    staleTime: TEASER_STALE_TIME_MS,
  })
}

/**
 * Fetches a small latest page of lister reviews for card teasers.
 * Uses a dedicated limit so it does not collide with the full reviews dialog cache.
 */
export function useListerReviewTeasers({
  listerProfileId,
  enabled = true,
}: UseListerReviewTeasersInput = {}) {
  return useQuery(
    listerReviewTeasersQueryOptions({ listerProfileId, enabled }),
  )
}
