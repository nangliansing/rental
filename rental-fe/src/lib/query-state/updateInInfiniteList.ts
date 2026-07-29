import type { QueryClient, QueryKey } from "@tanstack/react-query"

import {
  forEachCachedQuery,
  isFlatListCollection,
  isFunction,
  isInfiniteListCollection,
  isQueryKey,
  readArrayLength,
  readPageItems,
  tryMapMatchingItems,
  type FlatListCollection,
  type InfiniteListCollection,
  type InfiniteListPage,
  type QueryStateMatcher,
  type QueryStateRecord,
  type QueryStateUpdater,
} from "./shared"

function withUpdatedPageItems(
  page: unknown,
  nextItems: unknown[],
): InfiniteListPage | undefined {
  try {
    if (Array.isArray(page)) {
      return nextItems as QueryStateRecord[]
    }

    if (!isFlatListCollection(page)) return undefined

    return {
      ...page,
      data: nextItems as QueryStateRecord[],
    } as FlatListCollection
  } catch {
    return undefined
  }
}

/**
 * Updates matching records across every loaded infinite-list page.
 *
 * Returns `undefined` when nothing changed, or when any page cannot be
 * inspected/copied safely (caller must leave `current` unchanged).
 */
function updateAcrossPages<T extends QueryStateRecord>(
  pages: unknown[],
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): InfiniteListPage<T>[] | undefined {
  try {
    const pageCount = readArrayLength(pages)
    if (pageCount === undefined || pageCount === 0) return undefined

    let nextPages: InfiniteListPage<T>[] | undefined

    for (let index = 0; index < pageCount; index += 1) {
      const page = pages[index]
      const items = readPageItems(page)
      if (items === undefined) return undefined

      const mapped = tryMapMatchingItems(items, match, update)
      if (mapped.status === "failed") return undefined

      if (mapped.status === "updated") {
        const nextPage = withUpdatedPageItems(page, mapped.next)
        if (nextPage === undefined) return undefined

        if (nextPages === undefined) {
          nextPages = pages.slice(0, index) as InfiniteListPage<T>[]
        }
        nextPages.push(nextPage as InfiniteListPage<T>)
        continue
      }

      if (nextPages !== undefined) {
        nextPages.push(page as InfiniteListPage<T>)
      }
    }

    return nextPages
  } catch {
    return undefined
  }
}

/**
 * Updates matching item(s) inside an infinite-list cache value.
 *
 * Scope:
 * - Supports `{ pages, pageParams }` where each page is `{ data: T[] }` or `T[]`
 * - Updates every top-level record for which `match` returns true, on every
 *   loaded page
 * - Leaves `pagination` / `pageParams` untouched (identity update, not add/remove)
 * - Never touches flat-list cache shapes
 *
 * Defensive: never throws. Bad inputs, matcher/updater failures, non-record
 * updater results, or scan failures leave `current` unchanged (atomic).
 */
export function updateInInfiniteList<T extends QueryStateRecord>(
  current: InfiniteListCollection<T>,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): InfiniteListCollection<T>
export function updateInInfiniteList<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): unknown
export function updateInInfiniteList<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): unknown {
  try {
    if (!isFunction(match) || !isFunction(update)) return current
    if (!isInfiniteListCollection(current)) return current

    // Re-check in case a hostile proxy changed shape after the guard.
    const pages = current.pages
    if (!Array.isArray(pages)) return current

    const nextPages = updateAcrossPages(pages, match, update)
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
 * Applies {@link updateInInfiniteList} across every cached query under `queryKeys`.
 * Never throws: invalid client/keys/callbacks or cache access failures are no-ops.
 */
export function updateInInfiniteListInQueries<T extends QueryStateRecord>(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
) {
  if (!isFunction(match) || !isFunction(update)) return

  forEachCachedQuery(queryClient, queryKeys, (query) => {
    if (!isQueryKey(query.queryKey)) return

    try {
      queryClient.setQueryData(query.queryKey, (current: unknown) =>
        updateInInfiniteList(current, match, update),
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
  QueryStateUpdater,
}
