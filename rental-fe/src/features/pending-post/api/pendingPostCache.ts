import type { InfiniteData } from "@tanstack/react-query"

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

import type { SearchOwnerPendingPostsResponse } from "./searchOwnerPendingPosts"
import type { PendingPost, PendingPostStatus } from "./createPendingPost"

export type OwnerPendingPostsInfiniteData =
  InfiniteData<SearchOwnerPendingPostsResponse>

export const PENDING_POST_WRITE_SCOPE_ID = "pending-post-write"

const isPendingPostId =
  (pendingPostId: string): QueryStateMatcher<QueryStateRecord> =>
  (post) =>
    post._id === pendingPostId

function belongsInStatusFilter(
  statusFilter: string | undefined,
  status: PendingPostStatus,
) {
  return statusFilter === "all" || statusFilter === status
}

function readPositivePageLimit(
  page: unknown,
  pageIndex: number,
  itemCount: number,
) {
  if (!isQueryStateRecord(page)) {
    return itemCount + (pageIndex === 0 ? 1 : 0)
  }

  try {
    const pagination = page.pagination
    if (!isQueryStateRecord(pagination)) {
      return itemCount + (pageIndex === 0 ? 1 : 0)
    }

    const limit = pagination.limit
    if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
      return Math.trunc(limit)
    }
  } catch {
    // fall through to fallback limit
  }

  return itemCount + (pageIndex === 0 ? 1 : 0)
}

function readFinitePageTotal(page: unknown, fallback: number) {
  if (!isQueryStateRecord(page)) return fallback

  try {
    const pagination = page.pagination
    if (!isQueryStateRecord(pagination)) return fallback

    const total = pagination.total
    if (typeof total === "number" && Number.isFinite(total) && total >= 0) {
      return Math.trunc(total)
    }
  } catch {
    // fall through to fallback total
  }

  return fallback
}

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

function collectExistingPosts(pages: unknown[]): PendingPost[] | undefined {
  const posts: PendingPost[] = []
  const completed = forEachPageItem(pages, (item) => {
    posts.push(item as PendingPost)
  })
  return completed ? posts : undefined
}

/**
 * Owner pending-post lists paginate with fixed page sizes. A create prepends
 * into the combined collection and re-slices every loaded page so page
 * boundaries stay consistent — different from {@link addToInfiniteList},
 * which only prepends onto the first page.
 */
export function insertPendingPostIntoInfiniteData(
  current: OwnerPendingPostsInfiniteData | undefined,
  statusFilter: string | undefined,
  pendingPost: PendingPost,
): OwnerPendingPostsInfiniteData | undefined {
  try {
    if (current === undefined) return current
    if (!isInfiniteListCollection(current)) return current
    if (!isQueryStateRecord(pendingPost)) return current
    if (!belongsInStatusFilter(statusFilter, pendingPost.status)) return current

    const pages = current.pages
    if (!Array.isArray(pages)) return current

    const pageCount = readArrayLength(pages)
    if (pageCount === undefined || pageCount === 0) return current

    const match = isPendingPostId(pendingPost._id)
    if (containsMatchingPost(pages, match)) return current

    const existing = collectExistingPosts(pages)
    if (existing === undefined) return current

    const posts = [pendingPost, ...existing]
    let offset = 0
    const nextPages: unknown[] = []

    for (let index = 0; index < pageCount; index += 1) {
      const page = pages[index]
      const items = readPageItems(page)
      const itemCount =
        items === undefined ? 0 : (readArrayLength(items) ?? 0)
      const limit = readPositivePageLimit(page, index, itemCount)
      const data = posts.slice(offset, offset + limit)
      offset += limit
      const previousTotal = readFinitePageTotal(page, posts.length - 1)

      if (Array.isArray(page)) {
        nextPages.push(data)
        continue
      }

      if (!isQueryStateRecord(page)) return current

      nextPages.push({
        ...page,
        data,
        pagination: {
          ...(isQueryStateRecord(page.pagination) ? page.pagination : {}),
          total: previousTotal + 1,
        },
      })
    }

    return {
      ...current,
      pages: nextPages,
    } as OwnerPendingPostsInfiniteData
  } catch {
    return current
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
  if (current === undefined) return current

  const result = removeFromInfiniteList(current, isPendingPostId(pendingPostId))
  return result as OwnerPendingPostsInfiniteData | undefined
}

export function transitionOwnerPendingPostInInfiniteData(
  current: OwnerPendingPostsInfiniteData | undefined,
  statusFilter: string | undefined,
  pendingPostId: string,
  status: PendingPostStatus,
  changes: Partial<PendingPost> = {},
): OwnerPendingPostsInfiniteData | undefined {
  if (current === undefined) return current
  if (!isInfiniteListCollection(current)) return current

  const pages = current.pages
  if (!Array.isArray(pages)) return current

  const match = isPendingPostId(pendingPostId)
  if (!containsMatchingPost(pages, match)) return current

  if (belongsInStatusFilter(statusFilter, status)) {
    const result = updateInInfiniteList(current, match, (post) => ({
      ...post,
      ...changes,
      status,
    }))
    return result as OwnerPendingPostsInfiniteData | undefined
  }

  return removePendingPostFromInfiniteData(current, pendingPostId)
}
