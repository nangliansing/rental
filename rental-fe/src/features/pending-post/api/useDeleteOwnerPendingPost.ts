import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import {
  deleteOwnerPendingPost,
  isOwnerPendingPostNotFoundError,
} from "./deleteOwnerPendingPost"
import {
  removePendingPostFromInfiniteData,
  type OwnerPendingPostsInfiniteData,
} from "./pendingPostCache"

export function useDeleteOwnerPendingPost() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "delete-owner-pending-post" },
    mutationFn: async (pendingPostId: string) => {
      try {
        return await deleteOwnerPendingPost(pendingPostId)
      } catch (error) {
        if (!isOwnerPendingPostNotFoundError(error)) throw error
        return null
      }
    },
    onMutate: async (pendingPostId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.pendingPosts.ownerLists,
      })

      const snapshots = queryClient.getQueriesData<OwnerPendingPostsInfiniteData>(
        { queryKey: queryKeys.pendingPosts.ownerLists },
      )

      queryClient.setQueriesData<OwnerPendingPostsInfiniteData>(
        { queryKey: queryKeys.pendingPosts.ownerLists },
        (current) =>
          removePendingPostFromInfiniteData(current, pendingPostId),
      )

      return { snapshots }
    },
    onError: (_error, _pendingPostId, context) => {
      context?.snapshots.forEach(([queryKey, previousData]) => {
        queryClient.setQueryData(queryKey, previousData)
      })
    },
    onSuccess: (_deletedPost, pendingPostId) => {
      // Defend against a refetch that completed between onMutate and success.
      queryClient.setQueriesData<OwnerPendingPostsInfiniteData>(
        { queryKey: queryKeys.pendingPosts.ownerLists },
        (current) =>
          removePendingPostFromInfiniteData(current, pendingPostId),
      )
    },
    onSettled: async (_data, error) => {
      if (error) return

      await queryClient.invalidateQueries({
        queryKey: queryKeys.pendingPosts.ownerLists,
        refetchType: "active",
      })
    },
  })
}
