import type { InfiniteData, QueryKey } from "@tanstack/react-query";

import type {
  AdminPendingPost,
  AdminPendingPostStatusFilter,
  SearchAdminPendingPostsResponse,
} from "./searchAdminPendingPosts";

export type AdminPendingPostsInfiniteData =
  InfiniteData<SearchAdminPendingPostsResponse>;

export function getAdminPendingPostStatusFromQueryKey(
  queryKey: QueryKey,
): AdminPendingPostStatusFilter | undefined {
  const status = queryKey[1];

  return typeof status === "string"
    ? (status as AdminPendingPostStatusFilter)
    : undefined;
}

export function findAdminPendingPost(
  snapshots: [QueryKey, AdminPendingPostsInfiniteData | undefined][],
  pendingPostId: string,
): AdminPendingPost | undefined {
  for (const [, current] of snapshots) {
    const post = current?.pages
      .flatMap((page) => page.data)
      .find((item) => item._id === pendingPostId);

    if (post) return post;
  }

  return undefined;
}

export function transitionAdminPendingPostInInfiniteData(
  current: AdminPendingPostsInfiniteData | undefined,
  statusFilter: AdminPendingPostStatusFilter | undefined,
  transitionedPost: AdminPendingPost,
): AdminPendingPostsInfiniteData | undefined {
  if (!current) return current;

  const containsPost = current.pages.some((page) =>
    page.data.some((post) => post._id === transitionedPost._id),
  );

  // Do not optimistically insert into a filtered, paginated list: the server
  // owns its ordering and page boundaries. A successful mutation invalidates it.
  if (!containsPost) return current;

  const belongsInList =
    statusFilter === undefined || statusFilter === transitionedPost.status;

  if (belongsInList) {
    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        data: page.data.map((post) =>
          post._id === transitionedPost._id ? transitionedPost : post,
        ),
      })),
    };
  }

  const removedCount = current.pages.reduce(
    (count, page) =>
      count +
      page.data.filter((post) => post._id === transitionedPost._id).length,
    0,
  );

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: page.data.filter((post) => post._id !== transitionedPost._id),
      pagination: {
        ...page.pagination,
        total: Math.max(page.pagination.total - removedCount, 0),
      },
    })),
  };
}

export function createOptimisticRejectedPendingPost(
  post: AdminPendingPost,
  reason: string,
): AdminPendingPost {
  return {
    ...post,
    status: "REJECTED",
    reviewNote: reason.trim(),
  };
}

export function createOptimisticApprovedPendingPost(
  post: AdminPendingPost,
  reason: string,
): AdminPendingPost {
  return {
    ...post,
    status: "APPROVED",
    reviewNote: reason.trim(),
  };
}
