import { useQuery } from "@tanstack/react-query"

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

/**
 * Fetches a small latest page of lister reviews for card teasers.
 * Uses a dedicated limit so it does not collide with the full reviews dialog cache.
 */
export function useListerReviewTeasers({
  listerProfileId,
  enabled = true,
}: UseListerReviewTeasersInput = {}) {
  const profileId = listerProfileId?.trim() || ""

  return useQuery({
    queryKey: queryKeys.listerReviewTeasers.list({
      listerProfileId: profileId,
      sort: LISTER_REVIEW_TEASER_SORT,
      limit: LISTER_REVIEW_TEASER_LIMIT,
    }),
    queryFn: () =>
      searchListerReviews({
        listerProfileId: profileId,
        page: 1,
        limit: LISTER_REVIEW_TEASER_LIMIT,
        sort: LISTER_REVIEW_TEASER_SORT,
      }),
    enabled: enabled && Boolean(profileId),
    staleTime: TEASER_STALE_TIME_MS,
  })
}
