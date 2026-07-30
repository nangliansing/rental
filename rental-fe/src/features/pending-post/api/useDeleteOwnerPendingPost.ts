import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { AgentProfile } from "@/features/profile/api"
import { decrementListingSummaryCounts } from "@/features/profile/utils/profileListingSummary"
import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import type { PendingPostStatus } from "./createPendingPost"
import {
  deleteOwnerPendingPost,
  isOwnerPendingPostNotFoundError,
} from "./deleteOwnerPendingPost"
import {
  PENDING_POST_WRITE_SCOPE_ID,
  removePendingPostFromInfiniteData,
  type OwnerPendingPostsInfiniteData,
} from "./pendingPostCache"

const deletePendingPostProjectionKeys = [
  queryKeys.pendingPosts.ownerLists,
  queryKeys.profiles.me,
  queryKeys.profiles.details,
]

const deletePendingPostInvalidationKeys = [
  queryKeys.pendingPosts.ownerLists,
  queryKeys.admin.pendingPosts.lists,
]

function findPendingPostStatus(
  queryClient: ReturnType<typeof useQueryClient>,
  pendingPostId: string,
): PendingPostStatus | null {
  for (const [, data] of queryClient.getQueriesData<OwnerPendingPostsInfiniteData>({
    queryKey: queryKeys.pendingPosts.ownerLists,
  })) {
    if (!data || !Array.isArray(data.pages)) continue
    for (const page of data.pages) {
      if (
        !page ||
        typeof page !== "object" ||
        !Array.isArray(page.data)
      ) {
        continue
      }
      const post = page.data.find(({ _id }) => _id === pendingPostId)
      if (post) return post.status
    }
  }
  return null
}

function isCountedProfileStatus(
  status: PendingPostStatus | null,
): status is "PENDING" | "REJECTED" {
  return status === "PENDING" || status === "REJECTED"
}

function decrementProfilePostCount(
  queryClient: ReturnType<typeof useQueryClient>,
  profileId: string,
  status: PendingPostStatus,
) {
  const decrement = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return value
    }
    const profile = value as Record<string, unknown>
    const summary =
      profile.listingSummary &&
      typeof profile.listingSummary === "object" &&
      !Array.isArray(profile.listingSummary)
        ? profile.listingSummary
        : null

    return {
      ...profile,
      listingSummary: decrementListingSummaryCounts(summary, {
        pending: status === "PENDING" ? 1 : 0,
        rejected: status === "REJECTED" ? 1 : 0,
      }),
    }
  }

  queryClient.setQueryData(queryKeys.profiles.me, decrement)
  queryClient.setQueryData(queryKeys.profiles.detail(profileId), decrement)
}

async function deleteOwnerPendingPostIdempotently(pendingPostId: string) {
  try {
    return await deleteOwnerPendingPost(pendingPostId)
  } catch (error) {
    if (!isOwnerPendingPostNotFoundError(error)) throw error
    return null
  }
}

export function useDeleteOwnerPendingPost() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof deleteOwnerPendingPostIdempotently>>,
    Error,
    string,
    {
      profileAdjusted: boolean
      profileId: string | null
      status: PendingPostStatus | null
    }
  >({
    queryClient,
    scopeKey: () => PENDING_POST_WRITE_SCOPE_ID,
    getPlan: () => ({
      cancel: deletePendingPostProjectionKeys,
      snapshot: deletePendingPostProjectionKeys,
      invalidate: deletePendingPostInvalidationKeys,
    }),
    apply: ({ queryClient: client, variables: pendingPostId }) => {
      const status = findPendingPostStatus(client, pendingPostId)
      const profileId =
        client.getQueryData<AgentProfile>(queryKeys.profiles.me)?._id ?? null

      client.setQueriesData<OwnerPendingPostsInfiniteData>(
        { queryKey: queryKeys.pendingPosts.ownerLists },
        current =>
          removePendingPostFromInfiniteData(current, pendingPostId),
      )
      const profileAdjusted = Boolean(
        profileId && isCountedProfileStatus(status),
      )
      if (profileId && isCountedProfileStatus(status)) {
        decrementProfilePostCount(client, profileId, status)
      }

      return { profileAdjusted, profileId, status }
    },
    reconcile: ({
      queryClient: client,
      variables: pendingPostId,
      optimisticContext,
      data,
    }) => {
      client.setQueriesData<OwnerPendingPostsInfiniteData>(
        { queryKey: queryKeys.pendingPosts.ownerLists },
        current =>
          removePendingPostFromInfiniteData(current, pendingPostId),
      )

      const profileId =
        optimisticContext.profileId ??
        client.getQueryData<AgentProfile>(queryKeys.profiles.me)?._id ??
        null
      const status = optimisticContext.status ?? data?.status ?? null
      if (
        !optimisticContext.profileAdjusted &&
        profileId &&
        isCountedProfileStatus(status)
      ) {
        decrementProfilePostCount(
          client,
          profileId,
          status,
        )
      }
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: PENDING_POST_WRITE_SCOPE_ID },
    mutationFn: deleteOwnerPendingPostIdempotently,
    ...transaction,
  })
}
