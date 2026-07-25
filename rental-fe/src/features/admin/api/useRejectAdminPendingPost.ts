import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/query-keys";

import {
  createOptimisticRejectedPendingPost,
  findAdminPendingPost,
  getAdminPendingPostStatusFromQueryKey,
  transitionAdminPendingPostInInfiniteData,
  type AdminPendingPostsInfiniteData,
} from "./adminPendingPostCache";
import {
  rejectAdminPendingPost,
  type RejectAdminPendingPostInput,
} from "./rejectAdminPendingPost";

export function useRejectAdminPendingPost() {
  const queryClient = useQueryClient();

  const updateCachedLists = (
    snapshots: [readonly unknown[], AdminPendingPostsInfiniteData | undefined][],
    post: Parameters<typeof transitionAdminPendingPostInInfiniteData>[2],
  ) => {
    snapshots.forEach(([queryKey]) => {
      queryClient.setQueryData<AdminPendingPostsInfiniteData>(
        queryKey,
        (current) =>
          transitionAdminPendingPostInInfiniteData(
            current,
            getAdminPendingPostStatusFromQueryKey(queryKey),
            post,
          ),
      );
    });
  };

  return useMutation({
    scope: { id: "reject-admin-pending-post" },
    mutationFn: (input: RejectAdminPendingPostInput) =>
      rejectAdminPendingPost(input),
    onMutate: async (input: RejectAdminPendingPostInput) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.admin.pendingPosts.lists,
      });

      const snapshots =
        queryClient.getQueriesData<AdminPendingPostsInfiniteData>({
          queryKey: queryKeys.admin.pendingPosts.lists,
        });
      const currentPost = findAdminPendingPost(
        snapshots,
        input.pendingPostId.trim(),
      );

      if (currentPost) {
        updateCachedLists(
          snapshots,
          createOptimisticRejectedPendingPost(currentPost, input.reason),
        );
      }

      return { snapshots };
    },
    onError: (_error, _input, context) => {
      context?.snapshots.forEach(([queryKey, previousData]) => {
        queryClient.setQueryData(queryKey, previousData);
      });
    },
    onSuccess: (rejectedPost, _input, context) => {
      const cachedLists =
        context?.snapshots ??
        queryClient.getQueriesData<AdminPendingPostsInfiniteData>({
          queryKey: queryKeys.admin.pendingPosts.lists,
        });

      // Defend against cache writes that race with the mutation response.
      updateCachedLists(cachedLists, rejectedPost);
    },
    onSettled: async (_data, error) => {
      if (error) return;

      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.pendingPosts.lists,
        refetchType: "active",
      });
    },
  });
}
