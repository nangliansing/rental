import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { InfiniteData, QueryKey } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import type { ListerReview, ListerReviewSummary } from "./createListerReview"
import { deleteListerReview } from "./deleteListerReview"
import {
  cancelReviewQueries,
  captureReviewQueries,
  invalidateReviewQueries,
  patchReviewInQueries,
  patchReviewSummaryInQueries,
  removeReviewFromListerReviewData,
  removeReviewFromSummary,
  restoreReviewQueries,
  reviewProjectionQueryKeys,
} from "./reviewMutationCache"
import type { SearchListerReviewsResponse } from "./searchListerReviews"

export type DeleteListerReviewVariables = {
  currentSummary?: ListerReviewSummary | null
  review: ListerReview
}

export function useDeleteListerReview() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "delete-lister-review" },
    mutationFn: ({ review }: DeleteListerReviewVariables) =>
      deleteListerReview({ reviewId: review._id }),
    onMutate: async ({ currentSummary, review }) => {
      const projectionKeys = reviewProjectionQueryKeys(
        review.listerProfileId,
        false,
      )
      const adminKeys: QueryKey[] = [
        queryKeys.admin.reviewReports.lists,
        queryKeys.admin.reviewReports.details,
      ]
      const keys = [...projectionKeys, ...adminKeys]
      await cancelReviewQueries(queryClient, keys)
      const snapshot = captureReviewQueries(queryClient, keys)
      const now = new Date().toISOString()
      const optimisticDeletedReview: ListerReview = {
        ...review,
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      }

      queryClient.setQueriesData<InfiniteData<SearchListerReviewsResponse>>(
        {
          queryKey: queryKeys.listerReviews.byLister(review.listerProfileId),
        },
        (current) => removeReviewFromListerReviewData(current, review._id),
      )
      patchReviewInQueries(
        queryClient,
        adminKeys,
        review._id,
        optimisticDeletedReview,
      )
      if (currentSummary) {
        patchReviewSummaryInQueries(
          queryClient,
          keys,
          review.listerProfileId,
          removeReviewFromSummary(currentSummary, review),
        )
      }

      return { adminKeys, keys, snapshot }
    },
    onError: (_error, _variables, context) => {
      if (context) restoreReviewQueries(queryClient, context.snapshot)
    },
    onSuccess: (result, variables, context) => {
      const keys = context?.keys ?? [
        ...reviewProjectionQueryKeys(variables.review.listerProfileId, false),
        queryKeys.admin.reviewReports.lists,
        queryKeys.admin.reviewReports.details,
      ]
      patchReviewInQueries(
        queryClient,
        context?.adminKeys ?? [
          queryKeys.admin.reviewReports.lists,
          queryKeys.admin.reviewReports.details,
        ],
        variables.review._id,
        result.review,
      )
      patchReviewSummaryInQueries(
        queryClient,
        keys,
        variables.review.listerProfileId,
        result.reviewSummary,
      )
    },
    onSettled: async (_result, error, variables) => {
      if (error) return
      await invalidateReviewQueries(queryClient, [
        queryKeys.listerReviews.byLister(variables.review.listerProfileId),
        queryKeys.admin.reviewReports.lists,
        queryKeys.admin.reviewReports.details,
      ])
    },
  })
}
