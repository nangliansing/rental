import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import {
  createListerReview,
  type CreateListerReviewInput,
  type ListerReview,
  type ListerReviewSummary,
} from "./createListerReview"
import {
  addReviewToSummary,
  cancelReviewQueries,
  captureReviewQueries,
  invalidateReviewQueries,
  listerReviewRefetchQueryKeys,
  patchReviewSummaryInQueries,
  replaceReviewInListerReviewData,
  restoreReviewQueries,
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

export function useCreateListerReview() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "create-lister-review" },
    mutationFn: (input: CreateListerReviewVariables) =>
      createListerReview({
        listerProfileId: input.listerProfileId,
        rating: input.rating,
        tags: input.tags,
        comment: input.comment,
        relatedListingId: input.relatedListingId,
        relatedBuildingId: input.relatedBuildingId,
      }),
    onMutate: async (input) => {
      const listerProfileId = input.listerProfileId.trim()
      const keys = reviewProjectionQueryKeys(listerProfileId, false)
      await cancelReviewQueries(queryClient, keys)
      const snapshot = captureReviewQueries(queryClient, keys)
      const optimisticReviewId = `optimistic-review-${Date.now()}`
      const optimisticReview = createOptimisticReview(
        { ...input, listerProfileId },
        optimisticReviewId,
      )
      const optimisticSummary = addReviewToSummary(
        input.currentSummary,
        input.rating,
        input.tags ?? [],
      )

      queryClient.setQueriesData<ListerReviewsCacheData>(
        { queryKey: queryKeys.listerReviews.byLister(listerProfileId) },
        (current) => setMyReviewInListerReviewData(current, optimisticReview),
      )
      patchReviewSummaryInQueries(
        queryClient,
        keys,
        listerProfileId,
        optimisticSummary,
      )

      return { keys, listerProfileId, optimisticReviewId, snapshot }
    },
    onError: (_error, _input, context) => {
      if (context) restoreReviewQueries(queryClient, context.snapshot)
    },
    onSuccess: (result, _input, context) => {
      queryClient.setQueriesData<ListerReviewsCacheData>(
        {
          queryKey: queryKeys.listerReviews.byLister(
            context?.listerProfileId ?? result.review.listerProfileId,
          ),
        },
        (current) =>
          replaceReviewInListerReviewData(
            current,
            context?.optimisticReviewId ?? "",
            result.review,
          ),
      )
      const listerProfileId = context?.listerProfileId ?? result.review.listerProfileId
      const keys = context?.keys ?? reviewProjectionQueryKeys(listerProfileId, false)
      patchReviewSummaryInQueries(
        queryClient,
        keys,
        listerProfileId,
        result.reviewSummary,
      )
    },
    onSettled: async (result, error, input, context) => {
      if (error) return
      const listerProfileId =
        context?.listerProfileId ??
        result?.review.listerProfileId ??
        input.listerProfileId.trim()
      await invalidateReviewQueries(
        queryClient,
        listerReviewRefetchQueryKeys(listerProfileId),
      )
    },
  })
}
