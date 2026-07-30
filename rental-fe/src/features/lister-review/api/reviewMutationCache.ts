import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { updateDeepInQueries } from "@/lib/query-state"
import {
  dropFiniteTotal,
  isInfiniteCollection,
  isPositiveFiniteCount,
  isQueryStateRecord,
  readArrayLength,
  tryFilterMatchingItems,
  tryMapMatchingItems,
  type ItemFilterResult,
  type QueryStateMatcher,
  type QueryStateRecord,
} from "@/lib/query-state/shared"

import type {
  ListerReview,
  ListerReviewSummary,
  ListerReviewTag,
} from "./createListerReview"
import type { SearchListerReviewsResponse } from "./searchListerReviews"

/** Cache shape of the infinite review lists under `queryKeys.listerReviews`. */
export type ListerReviewsCacheData =
  InfiniteData<SearchListerReviewsResponse>

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

type ListerReviewPageBundle = {
  page: QueryStateRecord
  pageData: QueryStateRecord
  reviews: unknown[]
  myReview: unknown
}

function readFinitePageTotal(pagination: unknown): boolean {
  if (!isQueryStateRecord(pagination)) return false

  try {
    const total = pagination.total
    return typeof total === "number" && Number.isFinite(total)
  } catch {
    return false
  }
}

function readListerReviewPage(page: unknown): ListerReviewPageBundle | undefined {
  try {
    if (!isQueryStateRecord(page) || isInfiniteCollection(page)) {
      return undefined
    }

    const pageData = page.data
    if (!isQueryStateRecord(pageData)) return undefined

    const reviews = pageData.reviews
    if (!Array.isArray(reviews)) return undefined
    if (readArrayLength(reviews) === undefined) return undefined
    if (!readFinitePageTotal(page.pagination)) return undefined

    return {
      page,
      pageData,
      reviews,
      myReview: pageData.myReview,
    }
  } catch {
    return undefined
  }
}

/**
 * Guards the helpers below against non-infinite caches. Only `useInfiniteQuery`
 * data with `{ data: { reviews, myReview? } }` pages is accepted.
 */
function isInfiniteListerReviewsData(
  value: unknown,
): value is ListerReviewsCacheData {
  if (!isInfiniteCollection(value)) return false

  try {
    const pages = value.pages
    const pageCount = readArrayLength(pages)
    if (pageCount === undefined) return false

    for (let index = 0; index < pageCount; index += 1) {
      if (readListerReviewPage(pages[index]) === undefined) return false
    }

    return true
  } catch {
    return false
  }
}

const isReviewId =
  (reviewId: string): QueryStateMatcher<QueryStateRecord> =>
  (value) =>
    value._id === reviewId

/** Strict shape guard for deep cache patches outside review-list arrays. */
function isReviewRecord(reviewId: string): QueryStateMatcher<QueryStateRecord> {
  return (value) =>
    value._id === reviewId &&
    typeof value.reviewerId === "string" &&
    typeof value.listerProfileId === "string" &&
    typeof value.rating === "number"
}

function myReviewMatchesId(myReview: unknown, reviewId: string) {
  return isQueryStateRecord(myReview) && myReview._id === reviewId
}

const RATING_COUNT_KEY = {
  1: "oneStar",
  2: "twoStars",
  3: "threeStars",
  4: "fourStars",
  5: "fiveStars",
} as const

type ValidRating = keyof typeof RATING_COUNT_KEY

function normalizeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0
}

function normalizeAverage(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(5, Math.max(0, value))
    : 0
}

function normalizeRating(rating: unknown): ValidRating | null {
  return Number.isInteger(rating) &&
    (rating as number) >= 1 &&
    (rating as number) <= 5
    ? (rating as ValidRating)
    : null
}

function emptySummary(): ListerReviewSummary {
  return {
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
}

function normalizeSummaryBase(
  current: ListerReviewSummary | null | undefined,
) {
  const summary = current ?? emptySummary()
  const ratingCounts = {
    oneStar: normalizeCount(summary.ratingCounts?.oneStar),
    twoStars: normalizeCount(summary.ratingCounts?.twoStars),
    threeStars: normalizeCount(summary.ratingCounts?.threeStars),
    fourStars: normalizeCount(summary.ratingCounts?.fourStars),
    fiveStars: normalizeCount(summary.ratingCounts?.fiveStars),
  }
  const tagCounts = new Map<ListerReviewTag, number>()

  for (const entry of Array.isArray(summary.tagCounts) ? summary.tagCounts : []) {
    if (!entry || typeof entry.tag !== "string") continue
    tagCounts.set(
      entry.tag as ListerReviewTag,
      (tagCounts.get(entry.tag as ListerReviewTag) ?? 0) +
        normalizeCount(entry.count),
    )
  }

  return {
    averageRating: normalizeAverage(summary.averageRating),
    reviewCount: normalizeCount(summary.reviewCount),
    ratingCounts,
    tagCounts,
  }
}

function summaryFromBase(
  base: ReturnType<typeof normalizeSummaryBase>,
): ListerReviewSummary {
  return {
    averageRating: base.averageRating,
    reviewCount: base.reviewCount,
    ratingCounts: base.ratingCounts,
    tagCounts: [...base.tagCounts.entries()].map(([tag, count]) => ({
      tag,
      count,
    })),
  }
}

export function removeReviewFromListerReviewData(
  current: ListerReviewsCacheData | undefined,
  reviewId: string,
): ListerReviewsCacheData | undefined {
  if (current === undefined) return current
  if (!isInfiniteListerReviewsData(current)) return current

  const match = isReviewId(reviewId)
  const pages = current.pages
  const pageCount = readArrayLength(pages)
  if (pageCount === undefined) return current

  type RemovePass = ListerReviewPageBundle & {
    filtered: ItemFilterResult
    clearsMyReview: boolean
  }

  const passes: RemovePass[] = []
  let totalRemoved = 0
  let clearsMyReviewAnywhere = false

  for (let index = 0; index < pageCount; index += 1) {
    const bundle = readListerReviewPage(pages[index])
    if (bundle === undefined) return current

    const filtered = tryFilterMatchingItems(bundle.reviews, match)
    if (filtered.status === "failed") return current

    const clearsMyReview = myReviewMatchesId(bundle.myReview, reviewId)
    clearsMyReviewAnywhere ||= clearsMyReview

    if (filtered.status === "updated") {
      if (!isPositiveFiniteCount(filtered.removedCount)) return current
      totalRemoved += filtered.removedCount
    }

    passes.push({ ...bundle, filtered, clearsMyReview })
  }

  if (totalRemoved === 0 && !clearsMyReviewAnywhere) return current

  const nextPages: QueryStateRecord[] = []

  for (const pass of passes) {
    const itemsChanged = pass.filtered.status === "updated"
    const nextReviews =
      itemsChanged && pass.filtered.status === "updated"
        ? pass.filtered.next
        : pass.reviews
    if (!Array.isArray(nextReviews)) return current

    const myReviewChanged =
      pass.clearsMyReview && pass.myReview !== null && pass.myReview !== undefined
    const dataChanged = itemsChanged || myReviewChanged

    let nextPage: QueryStateRecord = pass.page

    if (dataChanged) {
      nextPage = {
        ...pass.page,
        data: {
          ...pass.pageData,
          myReview: pass.clearsMyReview ? null : pass.myReview,
          reviews: nextReviews,
        },
      }
    }

    if (isPositiveFiniteCount(totalRemoved)) {
      const nextPagination = dropFiniteTotal(pass.page.pagination, totalRemoved)
      if (
        nextPagination !== undefined &&
        !Object.is(nextPagination, pass.page.pagination)
      ) {
        nextPage = { ...nextPage, pagination: nextPagination }
      }
    }

    nextPages.push(nextPage)
  }

  if (nextPages.length !== pageCount) return current

  return {
    ...current,
    pages: nextPages,
  } as ListerReviewsCacheData
}

export function setMyReviewInListerReviewData(
  current: ListerReviewsCacheData | undefined,
  review: ListerReview,
): ListerReviewsCacheData | undefined {
  if (current === undefined) return current
  if (!isInfiniteListerReviewsData(current)) return current
  if (!isQueryStateRecord(review)) return current

  const pages = current.pages
  const pageCount = readArrayLength(pages)
  if (pageCount === undefined) return current

  let changed = false
  const nextPages: QueryStateRecord[] = []

  for (let index = 0; index < pageCount; index += 1) {
    const bundle = readListerReviewPage(pages[index])
    if (bundle === undefined) return current

    if (Object.is(bundle.myReview, review)) {
      nextPages.push(bundle.page)
      continue
    }

    changed = true
    nextPages.push({
      ...bundle.page,
      data: {
        ...bundle.pageData,
        myReview: review,
      },
    })
  }

  if (!changed) return current

  return {
    ...current,
    pages: nextPages,
  } as ListerReviewsCacheData
}

export function replaceReviewInListerReviewData(
  current: ListerReviewsCacheData | undefined,
  optimisticReviewId: string,
  review: ListerReview,
): ListerReviewsCacheData | undefined {
  if (current === undefined) return current
  if (!isInfiniteListerReviewsData(current)) return current
  if (!isQueryStateRecord(review)) return current

  const match = isReviewId(optimisticReviewId)
  const pages = current.pages
  const pageCount = readArrayLength(pages)
  if (pageCount === undefined) return current

  let changed = false
  const nextPages: QueryStateRecord[] = []

  for (let index = 0; index < pageCount; index += 1) {
    const bundle = readListerReviewPage(pages[index])
    if (bundle === undefined) return current

    const mapped = tryMapMatchingItems(bundle.reviews, match, () => review)
    if (mapped.status === "failed") return current

    let nextMyReview = bundle.myReview
    if (
      isQueryStateRecord(bundle.myReview) &&
      bundle.myReview._id === optimisticReviewId &&
      !Object.is(bundle.myReview, review)
    ) {
      nextMyReview = review
      changed = true
    }

    if (mapped.status === "updated") changed = true

    if (
      mapped.status === "unchanged" &&
      Object.is(nextMyReview, bundle.myReview)
    ) {
      nextPages.push(bundle.page)
      continue
    }

    nextPages.push({
      ...bundle.page,
      data: {
        ...bundle.pageData,
        myReview: nextMyReview,
        reviews:
          mapped.status === "updated" ? mapped.next : bundle.reviews,
      },
    })
  }

  if (!changed) return current

  return {
    ...current,
    pages: nextPages,
  } as ListerReviewsCacheData
}

export function addReviewToSummary(
  current: ListerReviewSummary | null | undefined,
  rating: number,
  tags: ListerReviewTag[],
): ListerReviewSummary {
  const base = normalizeSummaryBase(current)
  const normalizedRating = normalizeRating(rating)

  if (normalizedRating === null) {
    return summaryFromBase(base)
  }

  const reviewCount = base.reviewCount + 1
  const ratingKey = RATING_COUNT_KEY[normalizedRating]
  const ratingCounts = { ...base.ratingCounts }
  ratingCounts[ratingKey] += 1

  for (const tag of new Set(Array.isArray(tags) ? tags : [])) {
    base.tagCounts.set(tag, (base.tagCounts.get(tag) ?? 0) + 1)
  }

  return {
    averageRating:
      (base.averageRating * base.reviewCount + normalizedRating) / reviewCount,
    reviewCount,
    ratingCounts,
    tagCounts: [...base.tagCounts.entries()].map(([tag, count]) => ({
      tag,
      count,
    })),
  }
}

export function replaceReviewInSummary(
  current: ListerReviewSummary,
  previousReview: Pick<ListerReview, "rating" | "tags">,
  nextReview: Pick<ListerReview, "rating" | "tags">,
): ListerReviewSummary {
  const base = normalizeSummaryBase(current)
  const reviewCount = base.reviewCount
  const previousRating = normalizeRating(previousReview.rating)
  const nextRating = normalizeRating(nextReview.rating)
  const ratingCounts = { ...base.ratingCounts }

  if (previousRating !== null) {
    const previousKey = RATING_COUNT_KEY[previousRating]
    ratingCounts[previousKey] = Math.max(0, ratingCounts[previousKey] - 1)
  }
  if (nextRating !== null) {
    const nextKey = RATING_COUNT_KEY[nextRating]
    ratingCounts[nextKey] += 1
  }

  const previousTags = new Set(
    Array.isArray(previousReview.tags) ? previousReview.tags : [],
  )
  const nextTags = new Set(
    Array.isArray(nextReview.tags) ? nextReview.tags : [],
  )

  for (const tag of previousTags) {
    base.tagCounts.set(tag, Math.max(0, (base.tagCounts.get(tag) ?? 0) - 1))
  }
  for (const tag of nextTags) {
    base.tagCounts.set(tag, (base.tagCounts.get(tag) ?? 0) + 1)
  }

  const averageRating =
    reviewCount > 0 && previousRating !== null && nextRating !== null
      ? (base.averageRating * reviewCount -
          previousRating +
          nextRating) /
        reviewCount
      : base.averageRating

  return {
    averageRating: normalizeAverage(averageRating),
    reviewCount,
    ratingCounts,
    tagCounts: [...base.tagCounts.entries()]
      .filter(([, count]) => count > 0)
      .map(([tag, count]) => ({ tag, count })),
  }
}

export function removeReviewFromSummary(
  current: ListerReviewSummary,
  review: Pick<ListerReview, "rating" | "tags">,
): ListerReviewSummary {
  const base = normalizeSummaryBase(current)
  const reviewCount = Math.max(0, base.reviewCount - 1)
  const rating = normalizeRating(review.rating)
  const ratingCounts = { ...base.ratingCounts }

  if (rating !== null) {
    const ratingKey = RATING_COUNT_KEY[rating]
    ratingCounts[ratingKey] = Math.max(0, ratingCounts[ratingKey] - 1)
  }

  const removedTags = new Set(Array.isArray(review.tags) ? review.tags : [])
  for (const tag of removedTags) {
    base.tagCounts.set(tag, Math.max(0, (base.tagCounts.get(tag) ?? 0) - 1))
  }

  const averageRating =
    reviewCount > 0 && rating !== null
      ? Math.max(
          0,
          (base.averageRating * base.reviewCount - rating) / reviewCount,
        )
      : 0

  return {
    averageRating: normalizeAverage(averageRating),
    reviewCount,
    ratingCounts,
    tagCounts: [...base.tagCounts.entries()]
      .filter(([, count]) => count > 0)
      .map(([tag, count]) => ({ tag, count })),
  }
}

function mergeReviewerProjection(
  previous: ListerReview["reviewer"],
  next: ListerReview["reviewer"],
): ListerReview["reviewer"] {
  if (!next) return previous
  if (!previous) return next

  return {
    ...previous,
    ...next,
    name: next.name ?? previous.name,
    displayName: next.displayName ?? previous.displayName,
    profilePhoto: next.profilePhoto ?? previous.profilePhoto,
  }
}

/**
 * Applies authoritative mutation fields from `next` while keeping embedded
 * list/search projections (e.g. reviewer name and photo) when the write
 * response omits or strips them.
 */
export function mergeListerReviewWithServerResponse(
  previous: ListerReview,
  next: ListerReview,
): ListerReview {
  if (previous._id !== next._id) return next

  return {
    ...previous,
    ...next,
    reviewer: mergeReviewerProjection(previous.reviewer, next.reviewer),
  }
}

/**
 * Replaces every occurrence of the review (matched by id + review shape) at
 * any depth in the cached queries under `keys`. Delegates the deep traversal
 * to the defensive `query-state` layer: never throws, copy-on-write, and
 * atomic per cache entry.
 */
export function patchReviewInQueries(
  queryClient: QueryClient,
  keys: QueryKey[],
  reviewId: string,
  review: ListerReview,
) {
  updateDeepInQueries(queryClient, keys, isReviewRecord(reviewId), () => review)
}

/**
 * Reconciles a mutation response onto cached review copies without dropping
 * embedded projections that list/search queries include but write endpoints
 * often omit.
 */
export function patchReviewFromServerInQueries(
  queryClient: QueryClient,
  keys: QueryKey[],
  reviewId: string,
  serverReview: ListerReview,
) {
  updateDeepInQueries(
    queryClient,
    keys,
    isReviewRecord(reviewId),
    (current) =>
      mergeListerReviewWithServerResponse(
        current as unknown as ListerReview,
        serverReview,
      ),
  )
}

/**
 * Writes `reviewSummary` onto every cached projection of the lister profile
 * (matched by id + presence of a `reviewSummary` field) at any depth.
 */
export function patchReviewSummaryInQueries(
  queryClient: QueryClient,
  keys: QueryKey[],
  listerProfileId: string,
  reviewSummary: ListerReviewSummary,
) {
  updateDeepInQueries(
    queryClient,
    keys,
    (value) => value._id === listerProfileId && "reviewSummary" in value,
    (value) => ({ ...value, reviewSummary }),
  )
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
