import type { InfiniteData } from "@tanstack/react-query"

import type { SearchOwnerPendingPostsResponse } from "./searchOwnerPendingPosts"
import type { PendingPost, PendingPostStatus } from "./createPendingPost"

export type OwnerPendingPostsInfiniteData =
  InfiniteData<SearchOwnerPendingPostsResponse>

export function insertPendingPostIntoInfiniteData(
  current: OwnerPendingPostsInfiniteData | undefined,
  statusFilter: string | undefined,
  pendingPost: PendingPost,
): OwnerPendingPostsInfiniteData | undefined {
  if (!current || (statusFilter !== "all" && statusFilter !== pendingPost.status)) {
    return current
  }
  if (current.pages.some((page) =>
    page.data.some((post) => post._id === pendingPost._id),
  )) {
    return current
  }

  return {
    ...current,
    pages: current.pages.map((page, index) => ({
      ...page,
      data: index === 0 ? [pendingPost, ...page.data] : page.data,
      pagination: {
        ...page.pagination,
        total: page.pagination.total + 1,
      },
    })),
  }
}

export function getOwnerPendingPostStatusFromQueryKey(
  queryKey: readonly unknown[],
) {
  return typeof queryKey[1] === "string" ? queryKey[1] : undefined
}

export function removePendingPostFromInfiniteData(
  current: OwnerPendingPostsInfiniteData | undefined,
  pendingPostId: string,
): OwnerPendingPostsInfiniteData | undefined {
  if (!current) return current

  const removedCount = current.pages.reduce(
    (count, page) =>
      count + page.data.filter((post) => post._id === pendingPostId).length,
    0,
  )

  if (removedCount === 0) return current

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: page.data.filter((post) => post._id !== pendingPostId),
      pagination: {
        ...page.pagination,
        total: Math.max(page.pagination.total - removedCount, 0),
      },
    })),
  }
}

export function transitionOwnerPendingPostInInfiniteData(
  current: OwnerPendingPostsInfiniteData | undefined,
  statusFilter: string | undefined,
  pendingPostId: string,
  status: PendingPostStatus,
  changes: Partial<PendingPost> = {},
): OwnerPendingPostsInfiniteData | undefined {
  if (!current) return current

  const containsPost = current.pages.some((page) =>
    page.data.some((post) => post._id === pendingPostId),
  )
  if (!containsPost) return current

  const belongsInList = statusFilter === "all" || statusFilter === status

  if (belongsInList) {
    return {
      ...current,
      pages: current.pages.map((page) => ({
        ...page,
        data: page.data.map((post) =>
          post._id === pendingPostId ? { ...post, ...changes, status } : post,
        ),
      })),
    }
  }

  return removePendingPostFromInfiniteData(current, pendingPostId)
}
