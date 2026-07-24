import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"

import {
  cancelReviewQueries,
  captureReviewQueries,
  invalidateReviewQueries,
  patchReviewSummaryInQueries,
  removeReviewFromListerReviewData,
  restoreReviewQueries,
  reviewProjectionQueryKeys,
} from "@/features/lister-review/api/reviewMutationCache"
import type { SearchListerReviewsResponse } from "@/features/lister-review/api/searchListerReviews"
import { queryKeys } from "@/lib/query-keys"
import type { InfiniteData } from "@tanstack/react-query"

import {
  deleteAdminListerReview,
  isAdminListerReviewNotFoundError,
} from "./deleteAdminListerReview"

export type DeleteAdminListerReviewVariables = {
  listerProfileId: string
  listerUserId?: string
  reason: string
  reviewId: string
  reviewReportId: string
}

function markReviewDeleted<T>(
  value: T,
  reviewId: string,
  reason: string,
  serverReview?: object,
): T {
  if (Array.isArray(value)) {
    return value.map((item) =>
      markReviewDeleted(item, reviewId, reason, serverReview),
    ) as T
  }
  if (!value || typeof value !== "object") return value

  const record = value as Record<string, unknown>
  let next: Record<string, unknown> = record
  if (record._id === reviewId && "isDeleted" in record) {
    const moderation =
      record.moderation && typeof record.moderation === "object"
        ? (record.moderation as Record<string, unknown>)
        : {}
    next = {
      ...record,
      ...serverReview,
      isDeleted: true,
      moderation: { ...moderation, removedReason: reason.trim() },
    }
  }

  for (const [key, child] of Object.entries(next)) {
    const patched = markReviewDeleted(child, reviewId, reason, serverReview)
    if (patched === child) continue
    if (next === record) next = { ...record }
    next[key] = patched
  }
  return next as T
}

export function useDeleteAdminListerReview(currentUserId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "delete-admin-lister-review" },
    mutationFn: async (variables: DeleteAdminListerReviewVariables) => {
      try {
        return await deleteAdminListerReview({
          reviewId: variables.reviewId,
          reason: variables.reason,
        })
      } catch (error) {
        if (!isAdminListerReviewNotFoundError(error)) throw error
        return null
      }
    },
    onMutate: async (variables) => {
      const adminKeys: QueryKey[] = [
        queryKeys.admin.reviewReports.lists,
        queryKeys.admin.reviewReports.detail(variables.reviewReportId),
      ]
      const optimisticKeys: QueryKey[] = [
        ...adminKeys,
        queryKeys.listerReviews.lists,
      ]

      await cancelReviewQueries(queryClient, optimisticKeys)
      const snapshot = captureReviewQueries(queryClient, optimisticKeys)

      queryClient.setQueriesData<InfiniteData<SearchListerReviewsResponse>>(
        { queryKey: queryKeys.listerReviews.lists },
        (current) =>
          removeReviewFromListerReviewData(current, variables.reviewId),
      )
      queryClient.setQueriesData(
        { queryKey: queryKeys.admin.reviewReports.lists },
        (current: unknown) =>
          markReviewDeleted(current, variables.reviewId, variables.reason),
      )
      queryClient.setQueryData(
        queryKeys.admin.reviewReports.detail(variables.reviewReportId),
        (current: unknown) =>
          markReviewDeleted(current, variables.reviewId, variables.reason),
      )

      return { snapshot }
    },
    onError: (_error, _variables, context) => {
      if (context) restoreReviewQueries(queryClient, context.snapshot)
    },
    onSuccess: async (result, variables) => {
      if (!result) return

      const includeMyProfile =
        Boolean(currentUserId) && variables.listerUserId === currentUserId
      const projectionKeys = reviewProjectionQueryKeys(
        variables.listerProfileId,
        includeMyProfile,
      )
      const adminKeys: QueryKey[] = [
        queryKeys.admin.reviewReports.lists,
        queryKeys.admin.reviewReports.detail(variables.reviewReportId),
      ]

      await cancelReviewQueries(queryClient, [...adminKeys, ...projectionKeys])
      queryClient.setQueriesData(
        { queryKey: queryKeys.admin.reviewReports.lists },
        (current: unknown) =>
          markReviewDeleted(
            current,
            variables.reviewId,
            variables.reason,
            result.review,
          ),
      )
      queryClient.setQueryData(
        queryKeys.admin.reviewReports.detail(variables.reviewReportId),
        (current: unknown) =>
          markReviewDeleted(
            current,
            variables.reviewId,
            variables.reason,
            result.review,
          ),
      )
      patchReviewSummaryInQueries(
        queryClient,
        [...adminKeys, ...projectionKeys],
        variables.listerProfileId,
        result.reviewSummary,
      )
    },
    onSettled: async (_result, error, variables) => {
      if (error) return

      const projectionKeys = reviewProjectionQueryKeys(
        variables.listerProfileId,
        Boolean(currentUserId) && variables.listerUserId === currentUserId,
      )
      await invalidateReviewQueries(queryClient, [
        queryKeys.admin.reviewReports.lists,
        queryKeys.admin.reviewReports.detail(variables.reviewReportId),
        ...projectionKeys,
      ])
    },
  })
}
