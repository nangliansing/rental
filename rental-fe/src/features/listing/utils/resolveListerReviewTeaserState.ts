import type { SearchListerReviewsResponse } from "@/features/lister-review/api/searchListerReviews"

import {
  mapListerReviewsToTeasers,
  type ReviewTeaserItem,
} from "./mapListerReviewsToTeasers"

/**
 * Single source of truth for what the lister review teaser shows.
 *
 * Backend contract worth remembering, because both teaser bugs came from it:
 * - `data.myReview` is the viewer's own review and is EXCLUDED from `data.reviews`.
 * - `pagination.total` counts other people's reviews only, so it also excludes
 *   the viewer's own review.
 * The listing summary `reviewCount` — not `pagination.total` — is therefore the
 * authority on whether a lister has any reviews at all.
 */
export type ListerReviewTeaserState =
  | { kind: "skeleton" }
  | { kind: "error" }
  | { kind: "empty"; hasReviews: boolean }
  | { kind: "rotation"; teasers: ReviewTeaserItem[] }

type ListerReviewTeaserTarget = {
  listerProfileId?: string | null
  /** Review count from the listing summary payload. */
  reviewCount?: number | null
}

export type ResolveListerReviewTeaserStateInput = ListerReviewTeaserTarget & {
  isError?: boolean
  /** Present once the query has data, even if it is refetching or stale. */
  response?: SearchListerReviewsResponse | null
}

function normalizeProfileId(listerProfileId?: string | null): string {
  return typeof listerProfileId === "string" ? listerProfileId.trim() : ""
}

function normalizeCount(value?: number | null): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0
}

/** True when the summary says this lister has no reviews, so no request is needed. */
export function isListerKnownWithoutReviews(reviewCount?: number | null) {
  return reviewCount === 0
}

export function shouldFetchListerReviewTeasers({
  listerProfileId,
  reviewCount,
  enabled = true,
}: ListerReviewTeaserTarget & { enabled?: boolean }) {
  return (
    enabled &&
    !isListerKnownWithoutReviews(reviewCount) &&
    Boolean(normalizeProfileId(listerProfileId))
  )
}

export function resolveListerReviewTeaserState({
  listerProfileId,
  reviewCount,
  isError = false,
  response,
}: ResolveListerReviewTeaserStateInput): ListerReviewTeaserState {
  if (
    !normalizeProfileId(listerProfileId) ||
    isListerKnownWithoutReviews(reviewCount)
  ) {
    return { kind: "empty", hasReviews: false }
  }

  // No data yet: idle, loading, and off-screen all hold the skeleton.
  if (!response) {
    return isError ? { kind: "error" } : { kind: "skeleton" }
  }

  const teasers = mapListerReviewsToTeasers([
    ...(response.data?.reviews ?? []),
    ...(response.data?.myReview ? [response.data.myReview] : []),
  ])

  if (teasers.length > 0) return { kind: "rotation", teasers }

  return {
    kind: "empty",
    hasReviews:
      normalizeCount(reviewCount) > 0 ||
      normalizeCount(response.pagination?.total) > 0,
  }
}
