import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { QueryKey } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import type { ListerReview } from "./createListerReview"
import {
  cancelReviewQueries,
  captureReviewQueries,
  invalidateReviewQueries,
  listerReviewRefetchQueryKeys,
  patchReviewInQueries,
  restoreReviewQueries,
} from "./reviewMutationCache"
import { toggleListerReviewCollapse } from "./toggleListerReviewCollapse"

export type ToggleListerReviewCollapseVariables = {
  review: ListerReview
}

export function useToggleListerReviewCollapse() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "toggle-lister-review-collapse" },
    mutationFn: ({ review }: ToggleListerReviewCollapseVariables) =>
      toggleListerReviewCollapse({ reviewId: review._id }),
    onMutate: async ({ review }) => {
      const keys: QueryKey[] = [
        queryKeys.listerReviews.byLister(review.listerProfileId),
        queryKeys.admin.reviewReports.lists,
        queryKeys.admin.reviewReports.details,
      ]
      await cancelReviewQueries(queryClient, keys)
      const snapshot = captureReviewQueries(queryClient, keys)
      const isCollapsed = !review.visibility.isCollapsed
      const now = new Date().toISOString()
      const optimisticReview: ListerReview = {
        ...review,
        visibility: {
          ...review.visibility,
          isCollapsed,
          collapsedAt: isCollapsed ? now : null,
          collapsedBy: isCollapsed ? review.visibility.collapsedBy : null,
          collapseReason: isCollapsed
            ? review.visibility.collapseReason
            : null,
        },
        updatedAt: now,
      }

      patchReviewInQueries(
        queryClient,
        keys,
        review._id,
        optimisticReview,
      )
      return { keys, snapshot }
    },
    onError: (_error, _variables, context) => {
      if (context) restoreReviewQueries(queryClient, context.snapshot)
    },
    onSuccess: (review, variables, context) => {
      patchReviewInQueries(
        queryClient,
        context?.keys ?? [
          queryKeys.listerReviews.byLister(
            variables.review.listerProfileId,
          ),
          queryKeys.admin.reviewReports.lists,
          queryKeys.admin.reviewReports.details,
        ],
        variables.review._id,
        review,
      )
    },
    onSettled: async (_review, error, variables) => {
      if (error) return
      // Collapsing hides a review from teasers, so they must refetch.
      await invalidateReviewQueries(
        queryClient,
        listerReviewRefetchQueryKeys(variables.review.listerProfileId),
      )
    },
  })
}
