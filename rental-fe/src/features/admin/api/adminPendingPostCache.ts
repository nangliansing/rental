import type { InfiniteData, QueryKey } from "@tanstack/react-query"

import {
  removeFromInfiniteList,
  updateInInfiniteList,
} from "@/lib/query-state"
import {
  isInfiniteListCollection,
  isQueryStateRecord,
  readArrayLength,
  readPageItems,
  safeMatch,
  type QueryStateMatcher,
  type QueryStateRecord,
} from "@/lib/query-state/shared"

import type {
  AdminPendingPost,
  AdminPendingPostStatusFilter,
  SearchAdminPendingPostsResponse,
} from "./searchAdminPendingPosts"

export type AdminPendingPostsInfiniteData =
  InfiniteData<SearchAdminPendingPostsResponse>

const isPendingPostId =
  (pendingPostId: string): QueryStateMatcher<QueryStateRecord> =>
  (post) =>
    post._id === pendingPostId

function forEachPageItem(
  pages: unknown[],
  visit: (item: QueryStateRecord) => boolean | void,
): boolean {
  const pageCount = readArrayLength(pages)
  if (pageCount === undefined) return false

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const items = readPageItems(pages[pageIndex])
    if (items === undefined) return false

    const itemCount = readArrayLength(items)
    if (itemCount === undefined) return false

    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      const item = items[itemIndex]
      if (!isQueryStateRecord(item)) continue
      if (visit(item) === true) return true
    }
  }

  return true
}

function containsMatchingPost(
  pages: unknown[],
  match: QueryStateMatcher<QueryStateRecord>,
) {
  let found = false
  const completed = forEachPageItem(pages, (item) => {
    if (safeMatch(match, item)) {
      found = true
      return true
    }
  })
  return completed && found
}

export function getAdminPendingPostStatusFromQueryKey(
  queryKey: QueryKey,
): AdminPendingPostStatusFilter | undefined {
  const status = queryKey[1]

  return typeof status === "string"
    ? (status as AdminPendingPostStatusFilter)
    : undefined
}

export function findAdminPendingPost(
  snapshots: [QueryKey, AdminPendingPostsInfiniteData | undefined][],
  pendingPostId: string,
): AdminPendingPost | undefined {
  const match = isPendingPostId(pendingPostId)

  for (const [, current] of snapshots) {
    if (current === undefined || !isInfiniteListCollection(current)) continue

    const pages = current.pages
    if (!Array.isArray(pages)) continue

    let found: AdminPendingPost | undefined
    const completed = forEachPageItem(pages, (item) => {
      if (safeMatch(match, item)) {
        found = item as AdminPendingPost
        return true
      }
    })

    if (completed && found !== undefined) return found
  }

  return undefined
}

export function transitionAdminPendingPostInInfiniteData(
  current: AdminPendingPostsInfiniteData | undefined,
  statusFilter: AdminPendingPostStatusFilter | undefined,
  transitionedPost: AdminPendingPost,
): AdminPendingPostsInfiniteData | undefined {
  if (current === undefined) return current
  if (!isInfiniteListCollection(current)) return current
  if (!isQueryStateRecord(transitionedPost)) return current

  const pages = current.pages
  if (!Array.isArray(pages)) return current

  const match = isPendingPostId(transitionedPost._id)

  // Do not optimistically insert into a filtered, paginated list: the server
  // owns its ordering and page boundaries. A successful mutation invalidates it.
  if (!containsMatchingPost(pages, match)) return current

  const belongsInList =
    statusFilter === undefined || statusFilter === transitionedPost.status

  if (belongsInList) {
    const result = updateInInfiniteList(current, match, () => transitionedPost)
    return result as AdminPendingPostsInfiniteData | undefined
  }

  const result = removeFromInfiniteList(current, match)
  return result as AdminPendingPostsInfiniteData | undefined
}

export function createOptimisticRejectedPendingPost(
  post: AdminPendingPost,
  reason: string,
): AdminPendingPost {
  return {
    ...post,
    status: "REJECTED",
    reviewNote: reason.trim(),
  }
}

export function createOptimisticApprovedPendingPost(
  post: AdminPendingPost,
  reason: string,
): AdminPendingPost {
  return {
    ...post,
    status: "APPROVED",
    reviewNote: reason.trim(),
  }
}
