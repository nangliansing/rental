import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import type {
  ListerReview,
  ListerReviewSummary,
} from "./createListerReview"
import {
  cancelReviewQueries,
  captureReviewQueries,
  invalidateReviewQueries,
  patchReviewInQueries,
  patchReviewSummaryInQueries,
  replaceReviewInSummary,
  restoreReviewQueries,
  reviewProjectionQueryKeys,
} from "./reviewMutationCache"
import {
  updateListerReview,
  type UpdateListerReviewInput,
} from "./updateListerReview"

export type UpdateListerReviewVariables = UpdateListerReviewInput & {
  currentSummary?: ListerReviewSummary | null
  review: ListerReview
}

function optimisticReviewFromInput(
  review: ListerReview,
  input: UpdateListerReviewInput,
): ListerReview {
  const now = new Date().toISOString()
  return {
    ...review,
    ...(input.rating !== undefined ? { rating: input.rating } : {}),
    ...(input.tags !== undefined ? { tags: input.tags } : {}),
    ...(input.comment !== undefined
      ? { comment: input.comment?.trim() || null }
      : {}),
    ...(input.relatedListingId !== undefined
      ? { relatedListingId: input.relatedListingId?.trim() || null }
      : {}),
    ...(input.relatedBuildingId !== undefined
      ? { relatedBuildingId: input.relatedBuildingId?.trim() || null }
      : {}),
    editedAt: now,
    updatedAt: now,
  }
}

export function useUpdateListerReview() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "update-lister-review" },
    mutationFn: (variables: UpdateListerReviewVariables) =>
      updateListerReview({
        reviewId: variables.reviewId,
        rating: variables.rating,
        tags: variables.tags,
        comment: variables.comment,
        relatedListingId: variables.relatedListingId,
        relatedBuildingId: variables.relatedBuildingId,
      }),
    onMutate: async (variables) => {
      const listerProfileId = variables.review.listerProfileId
      const keys = [
        ...reviewProjectionQueryKeys(listerProfileId, false),
        queryKeys.admin.reviewReports.lists,
        queryKeys.admin.reviewReports.details,
      ]
      await cancelReviewQueries(queryClient, keys)
      const snapshot = captureReviewQueries(queryClient, keys)
      const optimisticReview = optimisticReviewFromInput(
        variables.review,
        variables,
      )

      patchReviewInQueries(
        queryClient,
        keys,
        variables.review._id,
        optimisticReview,
      )
      if (variables.currentSummary) {
        patchReviewSummaryInQueries(
          queryClient,
          keys,
          listerProfileId,
          replaceReviewInSummary(
            variables.currentSummary,
            variables.review,
            optimisticReview,
          ),
        )
      }

      return { keys, listerProfileId, snapshot }
    },
    onError: (_error, _variables, context) => {
      if (context) restoreReviewQueries(queryClient, context.snapshot)
    },
    onSuccess: (result, variables, context) => {
      const listerProfileId =
        context?.listerProfileId ?? result.review.listerProfileId
      const keys = context?.keys ?? [
        ...reviewProjectionQueryKeys(listerProfileId, false),
        queryKeys.admin.reviewReports.lists,
        queryKeys.admin.reviewReports.details,
      ]
      patchReviewInQueries(
        queryClient,
        keys,
        variables.review._id,
        result.review,
      )
      patchReviewSummaryInQueries(
        queryClient,
        keys,
        listerProfileId,
        result.reviewSummary,
      )
    },
    onSettled: async (result, error, variables, context) => {
      if (error) return
      const listerProfileId =
        context?.listerProfileId ??
        result?.review.listerProfileId ??
        variables.review.listerProfileId
      await invalidateReviewQueries(queryClient, [
        queryKeys.listerReviews.byLister(listerProfileId),
      ])
    },
  })
}
