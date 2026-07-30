import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { QueryKey } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import type { ListerReview } from "./createListerReview"
import {
  listerReviewRefetchQueryKeys,
  patchReviewFromServerInQueries,
  patchReviewInQueries,
  REVIEW_WRITE_SCOPE_ID,
} from "./reviewMutationCache"
import { toggleListerReviewCollapse } from "./toggleListerReviewCollapse"

export type ToggleListerReviewCollapseVariables = {
  review: ListerReview
}

function toggleReviewProjectionKeys(
  variables: ToggleListerReviewCollapseVariables,
): QueryKey[] {
  return [
    queryKeys.listerReviews.byLister(
      variables.review.listerProfileId,
    ),
    queryKeys.admin.reviewReports.lists,
    queryKeys.admin.reviewReports.details,
  ]
}

export function useToggleListerReviewCollapse() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof toggleListerReviewCollapse>>,
    Error,
    ToggleListerReviewCollapseVariables,
    { keys: QueryKey[] }
  >({
    queryClient,
    scopeKey: () => REVIEW_WRITE_SCOPE_ID,
    getPlan: variables => {
      const keys = toggleReviewProjectionKeys(variables)
      return {
        cancel: keys,
        snapshot: keys,
        invalidate: listerReviewRefetchQueryKeys(
          variables.review.listerProfileId,
        ),
      }
    },
    apply: ({ queryClient: client, variables }) => {
      const { review } = variables
      const keys = toggleReviewProjectionKeys(variables)
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
        client,
        keys,
        review._id,
        optimisticReview,
      )
      return { keys }
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
        data,
      )
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: REVIEW_WRITE_SCOPE_ID },
    mutationFn: ({ review }: ToggleListerReviewCollapseVariables) =>
      toggleListerReviewCollapse({ reviewId: review._id }),
    ...transaction,
  })
}
