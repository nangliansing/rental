import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";

import {
  transitionOwnerPendingPostInInfiniteData,
  type OwnerPendingPostsInfiniteData,
} from "@/features/pending-post/api/pendingPostCache";
import { queryKeys } from "@/lib/query-keys";

import {
  createOptimisticApprovedPendingPost,
  findAdminPendingPost,
  getAdminPendingPostStatusFromQueryKey,
  transitionAdminPendingPostInInfiniteData,
  type AdminPendingPostsInfiniteData,
} from "./adminPendingPostCache";
import {
  approveAdminPendingPost,
  type ApproveAdminPendingPostInput,
} from "./approveAdminPendingPost";
import type { AdminPendingPost } from "./searchAdminPendingPosts";

type CacheSnapshot = [QueryKey, unknown];

const patchProfileSummary = (current: unknown, shouldTransition: boolean) => {
  if (!shouldTransition || !current || typeof current !== "object") return current;

  const profile = current as Record<string, unknown>;
  const summary = profile.listingSummary;
  if (!summary || typeof summary !== "object") return current;

  const counts = summary as Record<string, unknown>;
  const number = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;

  return {
    ...profile,
    listingSummary: {
      ...counts,
      activeCount: number(counts.activeCount) + 1,
      pendingCount: Math.max(0, number(counts.pendingCount) - 1),
      ...(typeof counts.approvedCount === "number"
        ? { approvedCount: counts.approvedCount + 1 }
        : {}),
    },
  };
};

export function useApproveAdminPendingPost(currentUserId?: string) {
  const queryClient = useQueryClient();

  const updateAdminLists = (
    snapshots: [QueryKey, AdminPendingPostsInfiniteData | undefined][],
    post: AdminPendingPost,
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
    scope: { id: "approve-admin-pending-post" },
    mutationFn: (input: ApproveAdminPendingPostInput) =>
      approveAdminPendingPost(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.admin.pendingPosts.lists,
      });

      const adminSnapshots =
        queryClient.getQueriesData<AdminPendingPostsInfiniteData>({
          queryKey: queryKeys.admin.pendingPosts.lists,
        });
      const currentPost = findAdminPendingPost(
        adminSnapshots,
        input.pendingPostId.trim(),
      );
      const isOwnPost = Boolean(
        currentUserId && currentPost?.submittedBy?._id === currentUserId,
      );
      const agentProfileId = currentPost?.agentProfile?._id;
      const dependentKeys: QueryKey[] = [
        ...(agentProfileId ? [queryKeys.profiles.detail(agentProfileId)] : []),
        ...(isOwnPost
          ? [queryKeys.profiles.me, queryKeys.pendingPosts.ownerLists]
          : []),
      ];

      await Promise.all(
        dependentKeys.map((queryKey) =>
          queryClient.cancelQueries({ queryKey }),
        ),
      );

      const dependentSnapshots = new Map<string, CacheSnapshot>();
      dependentKeys.forEach((queryKey) => {
        queryClient
          .getQueryCache()
          .findAll({ queryKey })
          .forEach((query) => {
            dependentSnapshots.set(query.queryHash, [
              query.queryKey,
              query.state.data,
            ]);
          });
      });

      if (currentPost) {
        updateAdminLists(
          adminSnapshots,
          createOptimisticApprovedPendingPost(currentPost, input.reason),
        );

        const shouldTransitionSummary = currentPost.status === "PENDING";
        if (agentProfileId) {
          queryClient.setQueryData(
            queryKeys.profiles.detail(agentProfileId),
            (current: unknown) =>
              patchProfileSummary(current, shouldTransitionSummary),
          );
        }
        if (isOwnPost) {
          queryClient.setQueryData(queryKeys.profiles.me, (current: unknown) =>
            patchProfileSummary(current, shouldTransitionSummary),
          );
          queryClient
            .getQueriesData<OwnerPendingPostsInfiniteData>({
              queryKey: queryKeys.pendingPosts.ownerLists,
            })
            .forEach(([queryKey]) => {
              queryClient.setQueryData<OwnerPendingPostsInfiniteData>(
                queryKey,
                (current) =>
              transitionOwnerPendingPostInInfiniteData(
                current,
                    typeof queryKey[1] === "string"
                      ? queryKey[1]
                  : undefined,
                currentPost._id,
                "APPROVED",
                { reviewNote: input.reason.trim() },
              ),
              );
            });
        }
      }

      return {
        adminSnapshots,
        dependentSnapshots: [...dependentSnapshots.values()],
        agentProfileId,
        isOwnPost,
      };
    },
    onError: (_error, _input, context) => {
      context?.adminSnapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      context?.dependentSnapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (approvedPost, _input, context) => {
      updateAdminLists(
        context?.adminSnapshots ??
          queryClient.getQueriesData<AdminPendingPostsInfiniteData>({
            queryKey: queryKeys.admin.pendingPosts.lists,
          }),
        approvedPost,
      );
    },
    onSettled: async (approvedPost, error, _input, context) => {
      if (error || !approvedPost) return;

      const invalidations: QueryKey[] = [
        queryKeys.admin.pendingPosts.lists,
        queryKeys.agentListings.lists,
        queryKeys.mapSearch.buildings,
        queryKeys.mapSearch.listingsInBuilding,
      ];

      const agentProfileId =
        approvedPost.agentProfile?._id ?? context?.agentProfileId;
      if (agentProfileId) {
        invalidations.push(queryKeys.profiles.detail(agentProfileId));
      }
      if (approvedPost.approvedBuildingId) {
        invalidations.push(
          queryKeys.buildings.detail(approvedPost.approvedBuildingId),
        );
      }
      if (approvedPost.approvedListingId) {
        invalidations.push(
          queryKeys.listings.publicListingDetails(
            approvedPost.approvedListingId,
          ),
        );
      }
      if (context?.isOwnPost) {
        invalidations.push(
          queryKeys.pendingPosts.ownerLists,
          queryKeys.listings.ownerLists,
          queryKeys.profiles.me,
          queryKeys.notifications.me,
        );
        if (approvedPost.approvedListingId) {
          invalidations.push(
            queryKeys.listings.ownerDetail(approvedPost.approvedListingId),
          );
        }
      }

      await Promise.all(
        invalidations.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey, refetchType: "active" }),
        ),
      );
    },
  });
}
