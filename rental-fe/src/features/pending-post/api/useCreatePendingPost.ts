import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query"

import type { AgentProfile } from "@/features/profile/api"
import {
  cancelQueriesByKey,
  captureQueriesByKey,
  restoreQueryCacheSnapshot,
} from "@/lib/query-cache-snapshot"
import { queryKeys } from "@/lib/query-keys"

import { createPendingPost } from "./createPendingPost"
import {
  getOwnerPendingPostStatusFromQueryKey,
  insertPendingPostIntoInfiniteData,
  type OwnerPendingPostsInfiniteData,
} from "./pendingPostCache"

const relatedCreatePendingPostQueryKeys: QueryKey[] = [
  queryKeys.pendingPosts.ownerLists,
  queryKeys.admin.pendingPosts.lists,
  queryKeys.profiles.me,
  queryKeys.profiles.details,
]

function incrementPendingCount(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value
  const profile = value as Record<string, unknown>
  const summary = profile.listingSummary
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return value
  }
  const listingSummary = summary as Record<string, unknown>

  return {
    ...profile,
    listingSummary: {
      ...listingSummary,
      pendingCount:
        (typeof listingSummary.pendingCount === "number"
          ? listingSummary.pendingCount
          : 0) + 1,
    },
  }
}

export function useCreatePendingPost() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "create-pending-post" },
    mutationFn: createPendingPost,
    onMutate: async () => {
      await cancelQueriesByKey(queryClient, relatedCreatePendingPostQueryKeys)
      const snapshots = captureQueriesByKey(
        queryClient,
        relatedCreatePendingPostQueryKeys,
      )
      const profile = queryClient.getQueryData<AgentProfile>(
        queryKeys.profiles.me,
      )

      queryClient.setQueryData(queryKeys.profiles.me, incrementPendingCount)
      if (profile?._id) {
        queryClient.setQueryData(
          queryKeys.profiles.detail(profile._id),
          incrementPendingCount,
        )
      }

      return { snapshots }
    },
    onError: (_error, _input, context) => {
      if (!context) return
      restoreQueryCacheSnapshot(queryClient, context.snapshots)
    },
    onSuccess: (pendingPost) => {
      queryClient
        .getQueriesData<OwnerPendingPostsInfiniteData>({
          queryKey: queryKeys.pendingPosts.ownerLists,
        })
        .forEach(([queryKey]) => {
          queryClient.setQueryData<OwnerPendingPostsInfiniteData>(
            queryKey,
            (current) =>
              insertPendingPostIntoInfiniteData(
                current,
                getOwnerPendingPostStatusFromQueryKey(queryKey),
                pendingPost,
              ),
          )
        })
    },
    onSettled: async (_data, error) => {
      if (error) return
      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.pendingPosts.lists,
        refetchType: "active",
      })
    },
  })
}
