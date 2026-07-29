import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import type {
  ListerReview,
  ListerReviewSummary,
  ListerReviewTag,
} from "./createListerReview"
import type { SearchListerReviewsResponse } from "./searchListerReviews"

/** Cache shape of the infinite review lists under `queryKeys.listerReviews`. */
export type ListerReviewsCacheData = InfiniteData<SearchListerReviewsResponse>

export const REVIEW_WRITE_SCOPE_ID = "lister-review-write"

export type ReviewCacheSnapshot = Array<{
  data: unknown
  queryKey: QueryKey
}>

export function reviewProjectionQueryKeys(
  listerProfileId: string,
  includeMyProfile: boolean,
): QueryKey[] {
  return [
    queryKeys.listerReviews.byLister(listerProfileId),
    queryKeys.profiles.detail(listerProfileId),
    ...(includeMyProfile ? [queryKeys.profiles.me] : []),
    queryKeys.agentListings.lists,
    queryKeys.mapSearch.buildings,
    queryKeys.mapSearch.listingsInBuilding,
    queryKeys.listings.ownerLists,
    queryKeys.listings.ownerDetails,
    queryKeys.listings.publicDetails,
    queryKeys.savedListings.all,
  ]
}

/**
 * Caches to refetch after a review changes: the infinite review lists plus the
 * listing-detail teaser queries. Teasers are cheap (one small page) so they are
 * invalidated rather than patched, which keeps their flat shape out of the
 * optimistic-update helpers below.
 */
export function listerReviewRefetchQueryKeys(
  listerProfileId: string,
): QueryKey[] {
  return [
    queryKeys.listerReviews.byLister(listerProfileId),
    queryKeys.listerReviewTeasers.byLister(listerProfileId),
  ]
}

export async function cancelReviewQueries(
  queryClient: QueryClient,
  queryKeysToCancel: QueryKey[],
) {
  await Promise.all(
    queryKeysToCancel.map((queryKey) =>
      queryClient.cancelQueries({ queryKey }),
    ),
  )
}

export function captureReviewQueries(
  queryClient: QueryClient,
  queryKeysToCapture: QueryKey[],
): ReviewCacheSnapshot {
  const snapshots = new Map<string, ReviewCacheSnapshot[number]>()

  queryKeysToCapture.forEach((queryKey) => {
    queryClient
      .getQueryCache()
      .findAll({ queryKey })
      .forEach((query) => {
        snapshots.set(query.queryHash, {
          queryKey: query.queryKey,
          data: query.state.data,
        })
      })
  })

  return [...snapshots.values()]
}

export function restoreReviewQueries(
  queryClient: QueryClient,
  snapshot: ReviewCacheSnapshot,
) {
  snapshot.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data)
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

/**
 * Guards the helpers below against non-infinite caches. Only `useInfiniteQuery`
 * data has `pages`; anything else is left untouched instead of crashing.
 */
function isInfiniteListerReviewsData(
  value: unknown,
): value is InfiniteData<SearchListerReviewsResponse> {
  return (
    isRecord(value) &&
    Array.isArray(value.pages) &&
    value.pages.every(
      (page) =>
        isRecord(page) &&
        isRecord(page.data) &&
        Array.isArray(page.data.reviews) &&
        isRecord(page.pagination) &&
        typeof page.pagination.total === "number" &&
        Number.isFinite(page.pagination.total),
    )
  )
}

export function removeReviewFromListerReviewData(
  current: ListerReviewsCacheData | undefined,
  reviewId: string,
): ListerReviewsCacheData | undefined {
  if (!isInfiniteListerReviewsData(current)) return current

  const removedCount = current.pages.reduce(
    (count, page) =>
      count +
      page.data.reviews.filter((review) => review._id === reviewId).length,
    0,
  )
  const removesMyReview = current.pages.some(
    (page) => page.data.myReview?._id === reviewId,
  )
  if (removedCount === 0 && !removesMyReview) return current

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: {
        ...page.data,
        myReview:
          page.data.myReview?._id === reviewId ? null : page.data.myReview,
        reviews: page.data.reviews.filter((review) => review._id !== reviewId),
      },
      pagination: {
        ...page.pagination,
        total: Math.max(0, page.pagination.total - removedCount),
      },
    })),
  }
}

export function setMyReviewInListerReviewData(
  current: ListerReviewsCacheData | undefined,
  review: ListerReview,
): ListerReviewsCacheData | undefined {
  if (!isInfiniteListerReviewsData(current)) return current

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: { ...page.data, myReview: review },
    })),
  }
}

export function replaceReviewInListerReviewData(
  current: ListerReviewsCacheData | undefined,
  optimisticReviewId: string,
  review: ListerReview,
): ListerReviewsCacheData | undefined {
  if (!isInfiniteListerReviewsData(current)) return current

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: {
        ...page.data,
        myReview:
          page.data.myReview?._id === optimisticReviewId
            ? review
            : page.data.myReview,
        reviews: page.data.reviews.map((item) =>
          item._id === optimisticReviewId ? review : item,
        ),
      },
    })),
  }
}

const RATING_COUNT_KEY = {
  1: "oneStar",
  2: "twoStars",
  3: "threeStars",
  4: "fourStars",
  5: "fiveStars",
} as const

export function addReviewToSummary(
  current: ListerReviewSummary | null | undefined,
  rating: number,
  tags: ListerReviewTag[],
): ListerReviewSummary {
  const summary = current ?? {
    averageRating: 0,
    reviewCount: 0,
    ratingCounts: {
      oneStar: 0,
      twoStars: 0,
      threeStars: 0,
      fourStars: 0,
      fiveStars: 0,
    },
    tagCounts: [],
  }
  const normalizeCount = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.trunc(value))
      : 0
  const previousReviewCount = normalizeCount(summary.reviewCount)
  const previousAverage =
    typeof summary.averageRating === "number" &&
    Number.isFinite(summary.averageRating)
      ? Math.min(5, Math.max(0, summary.averageRating))
      : 0
  const normalizedRating: keyof typeof RATING_COUNT_KEY | null =
    Number.isInteger(rating) && rating >= 1 && rating <= 5
      ? (rating as keyof typeof RATING_COUNT_KEY)
      : null
  const ratingCounts = {
    oneStar: normalizeCount(summary.ratingCounts?.oneStar),
    twoStars: normalizeCount(summary.ratingCounts?.twoStars),
    threeStars: normalizeCount(summary.ratingCounts?.threeStars),
    fourStars: normalizeCount(summary.ratingCounts?.fourStars),
    fiveStars: normalizeCount(summary.ratingCounts?.fiveStars),
  }
  const tagCounts = new Map<ListerReviewTag, number>()
  for (const entry of Array.isArray(summary.tagCounts)
    ? summary.tagCounts
    : []) {
    tagCounts.set(
      entry.tag,
      (tagCounts.get(entry.tag) ?? 0) + normalizeCount(entry.count),
    )
  }

  if (normalizedRating === null) {
    return {
      averageRating: previousAverage,
      reviewCount: previousReviewCount,
      ratingCounts,
      tagCounts: [...tagCounts].map(([tag, count]) => ({ tag, count })),
    }
  }

  const reviewCount = previousReviewCount + 1
  const ratingKey = RATING_COUNT_KEY[normalizedRating]
  ratingCounts[ratingKey] += 1
  for (const tag of new Set(tags)) {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  }

  return {
    averageRating:
      (previousAverage * previousReviewCount + normalizedRating) /
      reviewCount,
    reviewCount,
    ratingCounts,
    tagCounts: [...tagCounts].map(([tag, count]) => ({ tag, count })),
  }
}

export function replaceReviewInSummary(
  current: ListerReviewSummary,
  previousReview: Pick<ListerReview, "rating" | "tags">,
  nextReview: Pick<ListerReview, "rating" | "tags">,
): ListerReviewSummary {
  const reviewCount = current.reviewCount
  const previousRatingKey =
    RATING_COUNT_KEY[previousReview.rating as keyof typeof RATING_COUNT_KEY]
  const nextRatingKey =
    RATING_COUNT_KEY[nextReview.rating as keyof typeof RATING_COUNT_KEY]
  const ratingCounts = { ...current.ratingCounts }
  if (previousRatingKey) {
    ratingCounts[previousRatingKey] = Math.max(
      0,
      ratingCounts[previousRatingKey] - 1,
    )
  }
  if (nextRatingKey) ratingCounts[nextRatingKey] += 1

  const tagCounts = new Map(
    current.tagCounts.map(({ tag, count }) => [tag, count]),
  )
  new Set(previousReview.tags).forEach((tag) => {
    tagCounts.set(tag, Math.max(0, (tagCounts.get(tag) ?? 0) - 1))
  })
  new Set(nextReview.tags).forEach((tag) => {
    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  })

  return {
    averageRating:
      reviewCount > 0
        ? (current.averageRating * reviewCount -
            previousReview.rating +
            nextReview.rating) /
          reviewCount
        : current.averageRating,
    reviewCount,
    ratingCounts,
    tagCounts: [...tagCounts.entries()]
      .filter(([, count]) => count > 0)
      .map(([tag, count]) => ({ tag, count })),
  }
}

export function removeReviewFromSummary(
  current: ListerReviewSummary,
  review: Pick<ListerReview, "rating" | "tags">,
): ListerReviewSummary {
  const reviewCount = Math.max(0, current.reviewCount - 1)
  const ratingKey = RATING_COUNT_KEY[review.rating as keyof typeof RATING_COUNT_KEY]
  const ratingCounts = { ...current.ratingCounts }
  if (ratingKey) ratingCounts[ratingKey] = Math.max(0, ratingCounts[ratingKey] - 1)

  const removedTags = new Set(review.tags)
  return {
    averageRating:
      reviewCount > 0
        ? Math.max(
            0,
            (current.averageRating * current.reviewCount - review.rating) /
              reviewCount,
          )
        : 0,
    reviewCount,
    ratingCounts,
    tagCounts: current.tagCounts
      .map((entry) => ({
        ...entry,
        count: Math.max(
          0,
          entry.count - (removedTags.has(entry.tag) ? 1 : 0),
        ),
      }))
      .filter(({ count }) => count > 0),
  }
}

function patchReview<T>(value: T, reviewId: string, review: ListerReview): T {
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const patched = patchReview(item, reviewId, review)
      changed ||= patched !== item
      return patched
    })
    return (changed ? next : value) as T
  }
  if (!isRecord(value)) return value

  const isReview =
    value._id === reviewId &&
    typeof value.reviewerId === "string" &&
    typeof value.listerProfileId === "string" &&
    typeof value.rating === "number"
  let next: Record<string, unknown> = isReview ? review : value

  for (const [key, child] of Object.entries(next)) {
    const patched = patchReview(child, reviewId, review)
    if (patched === child) continue
    if (next === value) next = { ...value }
    next[key] = patched
  }
  return next as T
}

export function patchReviewInQueries(
  queryClient: QueryClient,
  keys: QueryKey[],
  reviewId: string,
  review: ListerReview,
) {
  const patched = new Set<string>()
  keys.forEach((queryKey) => {
    queryClient.getQueryCache().findAll({ queryKey }).forEach((query) => {
      if (patched.has(query.queryHash)) return
      patched.add(query.queryHash)
      queryClient.setQueryData(query.queryKey, (current: unknown) =>
        patchReview(current, reviewId, review),
      )
    })
  })
}

function patchReviewSummary<T>(
  value: T,
  listerProfileId: string,
  reviewSummary: ListerReviewSummary,
): T {
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const patched = patchReviewSummary(item, listerProfileId, reviewSummary)
      changed ||= patched !== item
      return patched
    })
    return (changed ? next : value) as T
  }

  if (!isRecord(value)) return value

  const isAffectedProfile =
    value._id === listerProfileId && "reviewSummary" in value
  let next: Record<string, unknown> = isAffectedProfile
    ? { ...value, reviewSummary }
    : value

  for (const [key, child] of Object.entries(next)) {
    const patched = patchReviewSummary(child, listerProfileId, reviewSummary)
    if (patched === child) continue
    if (next === value) next = { ...value }
    next[key] = patched
  }

  return next as T
}

export function patchReviewSummaryInQueries(
  queryClient: QueryClient,
  keys: QueryKey[],
  listerProfileId: string,
  reviewSummary: ListerReviewSummary,
) {
  const patched = new Set<string>()

  keys.forEach((queryKey) => {
    queryClient
      .getQueryCache()
      .findAll({ queryKey })
      .forEach((query) => {
        if (patched.has(query.queryHash)) return
        patched.add(query.queryHash)
        queryClient.setQueryData(query.queryKey, (current: unknown) =>
          patchReviewSummary(current, listerProfileId, reviewSummary),
        )
      })
  })
}

export async function invalidateReviewQueries(
  queryClient: QueryClient,
  keys: QueryKey[],
) {
  await Promise.all(
    keys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey, refetchType: "active" }),
    ),
  )
}
