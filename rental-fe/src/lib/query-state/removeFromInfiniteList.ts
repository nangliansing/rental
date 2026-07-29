import type { QueryClient, QueryKey } from "@tanstack/react-query"

import {
  dropFiniteTotal,
  forEachCachedQuery,
  isFunction,
  isInfiniteCollection,
  isInfiniteListCollection,
  isPositiveFiniteCount,
  isQueryKey,
  isQueryStateRecord,
  readArrayLength,
  readPageItems,
  tryFilterMatchingItems,
  type FlatListCollection,
  type InfiniteListCollection,
  type InfiniteListPage,
  type ItemFilterResult,
  type QueryStateMatcher,
  type QueryStateRecord,
} from "./shared"

type PageFilterPass = {
  page: unknown
  items: unknown[]
  filtered: ItemFilterResult
}

/**
 * Rebuilds one page after a global remove pass.
 * Uses the already-captured `nextItems` (never re-reads `page.data`) so a
 * hostile proxy cannot flip the item array between filter and rebuild.
 */
function withRemovedPageItems(
  page: unknown,
  nextItems: unknown[],
  itemsChanged: boolean,
  totalRemoved: number,
): InfiniteListPage | undefined {
  try {
    if (!Array.isArray(nextItems)) return undefined

    if (Array.isArray(page)) {
      return itemsChanged
        ? (nextItems as QueryStateRecord[])
        : (page as QueryStateRecord[])
    }

    // Pass 1 already validated this as a flat page via readPageItems.
    // Do not re-check `page.data` here — it may be a hostile getter.
    if (!isQueryStateRecord(page) || isInfiniteCollection(page)) {
      return undefined
    }

    const nextPagination = dropFiniteTotal(page.pagination, totalRemoved)
    const paginationChanged =
      nextPagination !== undefined &&
      !Object.is(nextPagination, page.pagination)

    if (!itemsChanged && !paginationChanged) {
      return page as FlatListCollection
    }

    const nextPage: FlatListCollection = {
      ...page,
      data: nextItems as QueryStateRecord[],
    }

    if (paginationChanged && nextPagination !== undefined) {
      nextPage.pagination = nextPagination
    }

    return nextPage
  } catch {
    return undefined
  }
}

/**
 * Removes matching records across every loaded infinite-list page.
 *
 * Returns `undefined` when nothing changed, or when any page cannot be
 * inspected/copied safely (caller must leave `current` unchanged).
 *
 * Finite page `pagination.total` values are treated as a repeated global
 * total (same as {@link addToInfiniteList}): every page drops by the full
 * removed count across all loaded pages.
 */
function removeAcrossPages<T extends QueryStateRecord>(
  pages: unknown[],
  match: QueryStateMatcher<T>,
): InfiniteListPage<T>[] | undefined {
  try {
    const pageCount = readArrayLength(pages)
    if (pageCount === undefined || pageCount === 0) return undefined

    const passes: PageFilterPass[] = []
    let totalRemoved = 0

    // Pass 1: inspect every page. Any failure aborts before mutation.
    for (let index = 0; index < pageCount; index += 1) {
      const page = pages[index]
      const items = readPageItems(page)
      if (items === undefined) return undefined

      const filtered = tryFilterMatchingItems(items, match)
      if (filtered.status === "failed") return undefined

      if (filtered.status === "updated") {
        if (
          !Array.isArray(filtered.next) ||
          !isPositiveFiniteCount(filtered.removedCount)
        ) {
          return undefined
        }
        totalRemoved += filtered.removedCount
      }

      passes.push({ page, items, filtered })
    }

    if (!isPositiveFiniteCount(totalRemoved)) return undefined
    if (passes.length !== pageCount) return undefined

    // Pass 2: rebuild only after every page has been validated.
    const nextPages: InfiniteListPage<T>[] = []

    for (let index = 0; index < passes.length; index += 1) {
      const { page, items, filtered } = passes[index]
      const itemsChanged = filtered.status === "updated"
      const nextItems = itemsChanged ? filtered.next : items

      if (!Array.isArray(nextItems)) return undefined

      const nextPage = withRemovedPageItems(
        page,
        nextItems,
        itemsChanged,
        totalRemoved,
      )
      if (nextPage === undefined) return undefined

      nextPages.push(nextPage as InfiniteListPage<T>)
    }

    if (nextPages.length !== pageCount) return undefined
    return nextPages
  } catch {
    return undefined
  }
}

/**
 * Removes matching item(s) from an infinite-list cache value.
 *
 * Scope:
 * - Supports `{ pages, pageParams }` where each page is `{ data: T[] }` or `T[]`
 * - Removes every top-level record for which `match` returns true, on every
 *   loaded page
 * - Drops every finite page-level `pagination.total` by the total removed count
 *   (clamped at 0), matching {@link addToInfiniteList}'s global-total model
 * - Preserves `pageParams` and unrelated fields
 * - Never touches flat-list cache shapes
 *
 * Defensive: never throws. Bad inputs, matcher failures, or scan failures
 * leave `current` unchanged (atomic).
 */
export function removeFromInfiniteList<T extends QueryStateRecord>(
  current: InfiniteListCollection<T>,
  match: QueryStateMatcher<T>,
): InfiniteListCollection<T>
export function removeFromInfiniteList<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
): unknown
export function removeFromInfiniteList<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
): unknown {
  try {
    if (!isFunction(match)) return current
    if (!isInfiniteListCollection(current)) return current

    // Re-check in case a hostile proxy changed shape after the guard.
    const pages = current.pages
    if (!Array.isArray(pages)) return current

    const nextPages = removeAcrossPages(pages, match)
    if (nextPages === undefined || !Array.isArray(nextPages)) return current

    return {
      ...current,
      pages: nextPages,
    }
  } catch {
    return current
  }
}

/**
 * Applies {@link removeFromInfiniteList} across every cached query under `queryKeys`.
 * Never throws: invalid client/keys/matcher or cache access failures are no-ops.
 */
export function removeFromInfiniteListInQueries<T extends QueryStateRecord>(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  match: QueryStateMatcher<T>,
) {
  if (!isFunction(match)) return

  forEachCachedQuery(queryClient, queryKeys, (query) => {
    if (!isQueryKey(query.queryKey)) return

    try {
      queryClient.setQueryData(query.queryKey, (current: unknown) =>
        removeFromInfiniteList(current, match),
      )
    } catch {
      // Keep going; one key failure must not block the rest.
    }
  })
}

export type {
  InfiniteListCollection,
  InfiniteListPage,
  QueryStateMatcher,
  QueryStateRecord,
}
