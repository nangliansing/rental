import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { AgentProfile } from "@/features/profile/api"
import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import { createPendingPost } from "./createPendingPost"
import {
  getOwnerPendingPostStatusFromQueryKey,
  insertPendingPostIntoInfiniteData,
  PENDING_POST_WRITE_SCOPE_ID,
  type OwnerPendingPostsInfiniteData,
} from "./pendingPostCache"

const createPendingPostProjectionKeys = [
  queryKeys.pendingPosts.ownerLists,
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
  const currentPendingCount =
    typeof listingSummary.pendingCount === "number" &&
    Number.isFinite(listingSummary.pendingCount)
      ? Math.max(0, Math.trunc(listingSummary.pendingCount))
      : 0

  return {
    ...profile,
    listingSummary: {
      ...listingSummary,
      pendingCount: currentPendingCount + 1,
    },
  }
}

export function useCreatePendingPost() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof createPendingPost>>,
    Error,
    Parameters<typeof createPendingPost>[0],
    { profileAdjusted: boolean; profileId: string | null }
  >({
    queryClient,
    scopeKey: () => PENDING_POST_WRITE_SCOPE_ID,
    getPlan: () => ({
      cancel: createPendingPostProjectionKeys,
      snapshot: createPendingPostProjectionKeys,
      invalidate: [queryKeys.admin.pendingPosts.lists],
    }),
    apply: ({ queryClient: client }) => {
      const profile = client.getQueryData<AgentProfile>(
        queryKeys.profiles.me,
      )
      const profileId = profile?._id ?? null

      if (profileId) {
        client.setQueryData(queryKeys.profiles.me, incrementPendingCount)
        client.setQueryData(
          queryKeys.profiles.detail(profileId),
          incrementPendingCount,
        )
      }

      return { profileAdjusted: Boolean(profileId), profileId }
    },
    reconcile: ({ queryClient: client, optimisticContext, data }) => {
      const profileId =
        optimisticContext.profileId ??
        client.getQueryData<AgentProfile>(queryKeys.profiles.me)?._id ??
        null
      if (!optimisticContext.profileAdjusted && profileId) {
        client.setQueryData(queryKeys.profiles.me, incrementPendingCount)
        client.setQueryData(
          queryKeys.profiles.detail(profileId),
          incrementPendingCount,
        )
      }

      client
        .getQueriesData<OwnerPendingPostsInfiniteData>({
          queryKey: queryKeys.pendingPosts.ownerLists,
        })
        .forEach(([queryKey]) => {
          client.setQueryData<OwnerPendingPostsInfiniteData>(
            queryKey,
            current =>
              insertPendingPostIntoInfiniteData(
                current,
                getOwnerPendingPostStatusFromQueryKey(queryKey),
                data,
              ),
          )
        })
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: PENDING_POST_WRITE_SCOPE_ID },
    mutationFn: createPendingPost,
    ...transaction,
  })
}
