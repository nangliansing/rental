import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { QueryKey } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import type { ListerReview, ListerReviewSummary } from "./createListerReview"
import { deleteListerReview } from "./deleteListerReview"
import {
  listerReviewRefetchQueryKeys,
  patchReviewFromServerInQueries,
  patchReviewInQueries,
  patchReviewSummaryInQueries,
  removeReviewFromListerReviewData,
  removeReviewFromSummary,
  REVIEW_WRITE_SCOPE_ID,
  reviewProjectionQueryKeys,
  type ListerReviewsCacheData,
} from "./reviewMutationCache"

export type DeleteListerReviewVariables = {
  currentSummary?: ListerReviewSummary | null
  review: ListerReview
}

const adminReviewReportKeys: QueryKey[] = [
  queryKeys.admin.reviewReports.lists,
  queryKeys.admin.reviewReports.details,
]

function deleteReviewProjectionKeys(
  listerProfileId: string,
): QueryKey[] {
  return [
    ...reviewProjectionQueryKeys(listerProfileId, false),
    ...adminReviewReportKeys,
  ]
}

function deleteReviewInvalidationKeys(
  listerProfileId: string,
): QueryKey[] {
  return [
    ...listerReviewRefetchQueryKeys(listerProfileId),
    ...adminReviewReportKeys,
  ]
}

export function useDeleteListerReview() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof deleteListerReview>>,
    Error,
    DeleteListerReviewVariables,
    { keys: QueryKey[] }
  >({
    queryClient,
    scopeKey: () => REVIEW_WRITE_SCOPE_ID,
    getPlan: ({ review }) => {
      const keys = deleteReviewProjectionKeys(review.listerProfileId)
      return {
        cancel: keys,
        snapshot: keys,
        invalidate: deleteReviewInvalidationKeys(
          review.listerProfileId,
        ),
      }
    },
    apply: ({
      queryClient: client,
      variables: { currentSummary, review },
    }) => {
      const keys = deleteReviewProjectionKeys(review.listerProfileId)
      const now = new Date().toISOString()
      const optimisticDeletedReview: ListerReview = {
        ...review,
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      }

      client.setQueriesData<ListerReviewsCacheData>(
        {
          queryKey: queryKeys.listerReviews.byLister(
            review.listerProfileId,
          ),
        },
        current => removeReviewFromListerReviewData(current, review._id),
      )
      patchReviewInQueries(
        client,
        adminReviewReportKeys,
        review._id,
        optimisticDeletedReview,
      )
      if (currentSummary) {
        patchReviewSummaryInQueries(
          client,
          keys,
          review.listerProfileId,
          removeReviewFromSummary(currentSummary, review),
        )
      }

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
        adminReviewReportKeys,
        variables.review._id,
        data.review,
      )
      patchReviewSummaryInQueries(
        client,
        optimisticContext.keys,
        variables.review.listerProfileId,
        data.reviewSummary,
      )
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: REVIEW_WRITE_SCOPE_ID },
    mutationFn: ({ review }: DeleteListerReviewVariables) =>
      deleteListerReview({ reviewId: review._id }),
    ...transaction,
  })
}
