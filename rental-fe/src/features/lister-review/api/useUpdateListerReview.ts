import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { QueryKey } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import type {
  ListerReview,
  ListerReviewSummary,
} from "./createListerReview"
import {
  listerReviewRefetchQueryKeys,
  patchReviewFromServerInQueries,
  patchReviewInQueries,
  patchReviewSummaryInQueries,
  replaceReviewInSummary,
  REVIEW_WRITE_SCOPE_ID,
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

function updateReviewProjectionKeys(
  variables: UpdateListerReviewVariables,
): QueryKey[] {
  return [
    ...reviewProjectionQueryKeys(
      variables.review.listerProfileId,
      false,
    ),
    queryKeys.admin.reviewReports.lists,
    queryKeys.admin.reviewReports.details,
  ]
}

export function useUpdateListerReview() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof updateListerReview>>,
    Error,
    UpdateListerReviewVariables,
    { keys: QueryKey[]; listerProfileId: string }
  >({
    queryClient,
    scopeKey: () => REVIEW_WRITE_SCOPE_ID,
    getPlan: variables => {
      const listerProfileId = variables.review.listerProfileId
      const keys = updateReviewProjectionKeys(variables)
      return {
        cancel: keys,
        snapshot: keys,
        invalidate: listerReviewRefetchQueryKeys(listerProfileId),
      }
    },
    apply: ({ queryClient: client, variables }) => {
      const listerProfileId = variables.review.listerProfileId
      const keys = updateReviewProjectionKeys(variables)
      const optimisticReview = optimisticReviewFromInput(
        variables.review,
        variables,
      )

      patchReviewInQueries(
        client,
        keys,
        variables.review._id,
        optimisticReview,
      )
      if (variables.currentSummary) {
        patchReviewSummaryInQueries(
          client,
          keys,
          listerProfileId,
          replaceReviewInSummary(
            variables.currentSummary,
            variables.review,
            optimisticReview,
          ),
        )
      }

      return { keys, listerProfileId }
    },
    reconcile: ({
      queryClient: client,
      variables,
      optimisticContext,
      data,
    }) => {
      patchReviewFromServerInQueries(
        client,
        optimisticContext.keys,
        variables.review._id,
        data.review,
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
    mutationFn: (variables: UpdateListerReviewVariables) =>
      updateListerReview({
        reviewId: variables.reviewId,
        rating: variables.rating,
        tags: variables.tags,
        comment: variables.comment,
        relatedListingId: variables.relatedListingId,
        relatedBuildingId: variables.relatedBuildingId,
      }),
    ...transaction,
  })
}
