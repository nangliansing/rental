import type { InfiniteData } from "@tanstack/react-query"

import type { SearchOwnerPendingPostsResponse } from "./searchOwnerPendingPosts"
import type { PendingPost, PendingPostStatus } from "./createPendingPost"

export type OwnerPendingPostsInfiniteData =
  InfiniteData<SearchOwnerPendingPostsResponse>

export const PENDING_POST_WRITE_SCOPE_ID = "pending-post-write"

function hasUsablePages(
  current: OwnerPendingPostsInfiniteData,
) {
  return (
    Array.isArray(current.pages) &&
    current.pages.every(
      (page) =>
        Boolean(page) &&
        typeof page === "object" &&
        Array.isArray(page.data),
    )
  )
}

export function insertPendingPostIntoInfiniteData(
  current: OwnerPendingPostsInfiniteData | undefined,
  statusFilter: string | undefined,
  pendingPost: PendingPost,
): OwnerPendingPostsInfiniteData | undefined {
  if (
    !current ||
    !hasUsablePages(current) ||
    (statusFilter !== "all" && statusFilter !== pendingPost.status)
  ) {
    return current
  }
  if (current.pages.some((page) =>
    page.data.some((post) => post._id === pendingPost._id),
  )) {
    return current
  }

  const posts = [
    pendingPost,
    ...current.pages.flatMap((page) => page.data),
  ]
  let offset = 0

  return {
    ...current,
    pages: current.pages.map((page, index) => {
      const limit =
        Number.isFinite(page.pagination?.limit) &&
        page.pagination.limit > 0
          ? Math.trunc(page.pagination.limit)
          : page.data.length + (index === 0 ? 1 : 0)
      const data = posts.slice(offset, offset + limit)
      offset += limit
      const previousTotal =
        Number.isFinite(page.pagination?.total) &&
        page.pagination.total >= 0
          ? Math.trunc(page.pagination.total)
          : posts.length - 1

      return {
        ...page,
        data,
        pagination: {
          ...page.pagination,
          total: previousTotal + 1,
        },
      }
    }),
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
  if (!current || !hasUsablePages(current)) return current

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
  if (!current || !hasUsablePages(current)) return current

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
