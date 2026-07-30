import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import {
  createListerReview,
  type CreateListerReviewInput,
  type ListerReview,
  type ListerReviewSummary,
} from "./createListerReview"
import {
  addReviewToSummary,
  listerReviewRefetchQueryKeys,
  patchReviewSummaryInQueries,
  REVIEW_WRITE_SCOPE_ID,
  reviewProjectionQueryKeys,
  setMyReviewInListerReviewData,
  type ListerReviewsCacheData,
} from "./reviewMutationCache"

export type CreateListerReviewVariables = CreateListerReviewInput & {
  currentSummary?: ListerReviewSummary | null
  reviewerId: string
}

function createOptimisticReview(
  input: CreateListerReviewVariables,
  optimisticReviewId: string,
): ListerReview {
  const now = new Date().toISOString()
  return {
    _id: optimisticReviewId,
    reviewerId: input.reviewerId,
    listerProfileId: input.listerProfileId,
    relatedListingId: input.relatedListingId ?? null,
    relatedBuildingId: input.relatedBuildingId ?? null,
    rating: input.rating,
    tags: input.tags ?? [],
    comment: input.comment?.trim() || null,
    interaction: {
      isVerified: false,
      verifiedBy: null,
      contactEventId: null,
      verifiedAt: null,
    },
    moderation: {
      hiddenBy: null,
      hiddenAt: null,
      hiddenReason: null,
      removedBy: null,
      removedAt: null,
      removedReason: null,
    },
    visibility: {
      isCollapsed: false,
      collapsedBy: null,
      collapsedAt: null,
      collapseReason: null,
    },
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

let nextOptimisticReviewId = 0

function createOptimisticReviewId() {
  nextOptimisticReviewId += 1
  return `optimistic-review-${Date.now()}-${nextOptimisticReviewId}`
}

export function useCreateListerReview() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof createListerReview>>,
    Error,
    CreateListerReviewVariables,
    { keys: ReturnType<typeof reviewProjectionQueryKeys>; listerProfileId: string }
  >({
    queryClient,
    scopeKey: () => REVIEW_WRITE_SCOPE_ID,
    getPlan: input => {
      const listerProfileId = input.listerProfileId.trim()
      const keys = reviewProjectionQueryKeys(listerProfileId, false)
      return {
        cancel: keys,
        snapshot: keys,
        invalidate: listerReviewRefetchQueryKeys(listerProfileId),
      }
    },
    apply: ({ queryClient: client, variables: input }) => {
      const listerProfileId = input.listerProfileId.trim()
      const keys = reviewProjectionQueryKeys(listerProfileId, false)
      const optimisticReview = createOptimisticReview(
        { ...input, listerProfileId },
        createOptimisticReviewId(),
      )
      const optimisticSummary = addReviewToSummary(
        input.currentSummary,
        input.rating,
        input.tags ?? [],
      )

      client.setQueriesData<ListerReviewsCacheData>(
        { queryKey: queryKeys.listerReviews.byLister(listerProfileId) },
        current => setMyReviewInListerReviewData(current, optimisticReview),
      )
      patchReviewSummaryInQueries(
        client,
        keys,
        listerProfileId,
        optimisticSummary,
      )

      return { keys, listerProfileId }
    },
    reconcile: ({ queryClient: client, optimisticContext, data }) => {
      client.setQueriesData<ListerReviewsCacheData>(
        {
          queryKey: queryKeys.listerReviews.byLister(
            optimisticContext.listerProfileId,
          ),
        },
        current => setMyReviewInListerReviewData(current, data.review),
      )
      patchReviewSummaryInQueries(
        client,
        optimisticContext.keys,
        optimisticContext.listerProfileId,
        data.reviewSummary,
      )
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: REVIEW_WRITE_SCOPE_ID },
    mutationFn: (input: CreateListerReviewVariables) =>
      createListerReview({
        listerProfileId: input.listerProfileId,
        rating: input.rating,
        tags: input.tags,
        comment: input.comment,
        relatedListingId: input.relatedListingId,
        relatedBuildingId: input.relatedBuildingId,
      }),
    ...transaction,
  })
}
