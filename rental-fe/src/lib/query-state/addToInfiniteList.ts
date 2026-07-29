import type { QueryClient, QueryKey } from "@tanstack/react-query"

import {
  forEachCachedQuery,
  isFlatListCollection,
  isFunction,
  isInfiniteListCollection,
  isQueryKey,
  isQueryStateRecord,
  readArrayLength,
  readPageItems,
  safeMatch,
  type FlatListCollection,
  type InfiniteListCollection,
  type InfiniteListPage,
  type QueryStateMatcher,
  type QueryStateRecord,
} from "./shared"

type InspectedPage = {
  page: unknown
  items: unknown[]
}

function prependItem<T extends QueryStateRecord>(
  items: unknown[],
  item: T,
): unknown[] | undefined {
  try {
    return [item, ...items]
  } catch {
    return undefined
  }
}

function bumpPageTotal(page: FlatListCollection): FlatListCollection {
  try {
    const pagination = page.pagination
    if (!isQueryStateRecord(pagination)) return page

    let total: unknown
    try {
      total = pagination.total
    } catch {
      return page
    }

    if (typeof total !== "number" || !Number.isFinite(total)) return page

    return {
      ...page,
      pagination: {
        ...pagination,
        total: total + 1,
      },
    }
  } catch {
    return page
  }
}

/**
 * Inspects every loaded page once:
 * - validates readable item arrays
 * - rejects when a duplicate match already exists
 *
 * Returns `undefined` when the insert must be skipped.
 */
function inspectPagesForInsert<T extends QueryStateRecord>(
  pages: unknown[],
  match: QueryStateMatcher<T>,
): InspectedPage[] | undefined {
  try {
    const pageCount = readArrayLength(pages)
    if (pageCount === undefined || pageCount === 0) return undefined

    const inspected: InspectedPage[] = []

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const page = pages[pageIndex]
      const items = readPageItems(page)
      if (items === undefined) return undefined

      const itemCount = readArrayLength(items)
      if (itemCount === undefined) return undefined

      for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
        const existing = items[itemIndex]
        if (!isQueryStateRecord(existing)) continue
        if (safeMatch(match, existing as T)) return undefined
      }

      inspected.push({ page, items })
    }

    return inspected
  } catch {
    return undefined
  }
}

function buildNextPages<T extends QueryStateRecord>(
  inspected: InspectedPage[],
  item: T,
): InfiniteListPage<T>[] | undefined {
  try {
    const nextPages: InfiniteListPage<T>[] = []

    for (let index = 0; index < inspected.length; index += 1) {
      const { page, items } = inspected[index]

      if (Array.isArray(page)) {
        if (index === 0) {
          const nextItems = prependItem(items, item)
          if (nextItems === undefined) return undefined
          nextPages.push(nextItems as T[])
        } else {
          nextPages.push(page as T[])
        }
        continue
      }

      if (!isFlatListCollection(page)) return undefined

      const bumpedPage = bumpPageTotal(page)
      if (index === 0) {
        const nextItems = prependItem(items, item)
        if (nextItems === undefined) return undefined
        nextPages.push({
          ...bumpedPage,
          data: nextItems as QueryStateRecord[],
        } as FlatListCollection<T>)
      } else if (Object.is(bumpedPage, page)) {
        nextPages.push(page as FlatListCollection<T>)
      } else {
        nextPages.push(bumpedPage as FlatListCollection<T>)
      }
    }

    return nextPages
  } catch {
    return undefined
  }
}

/**
 * Inserts one item into an infinite-list cache.
 *
 * Scope:
 * - Supports `{ pages, pageParams }` where each page is `{ data: T[] }` or `T[]`
 * - Scans every loaded page and skips insertion when `match` finds a duplicate
 * - Prepends the item as-is to the first loaded page
 * - Bumps every finite page-level `pagination.total` (a repeated global total)
 * - Preserves `pageParams` and all unrelated fields
 * - Does not synthesize a page when `pages` is empty
 *
 * Defensive: never throws. Bad/malformed inputs leave `current` unchanged
 * (atomic: either a full next value or the original reference).
 */
export function addToInfiniteList<T extends QueryStateRecord>(
  current: InfiniteListCollection<T>,
  item: T,
  match: QueryStateMatcher<T>,
): InfiniteListCollection<T>
export function addToInfiniteList<T extends QueryStateRecord>(
  current: unknown,
  item: T,
  match: QueryStateMatcher<T>,
): unknown
export function addToInfiniteList<T extends QueryStateRecord>(
  current: unknown,
  item: T,
  match: QueryStateMatcher<T>,
): unknown {
  try {
    if (!isQueryStateRecord(item) || !isFunction(match)) return current
    if (!isInfiniteListCollection(current)) return current

    // Re-check in case a hostile proxy changed shape after the guard.
    const pages = current.pages
    if (!Array.isArray(pages)) return current

    const inspected = inspectPagesForInsert(pages, match)
    if (inspected === undefined) return current

    const nextPages = buildNextPages(inspected, item)
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
 * Applies {@link addToInfiniteList} to every cached query under `queryKeys`.
 * Never throws: invalid client/keys/item or per-query failures are no-ops.
 */
export function addToInfiniteListInQueries<T extends QueryStateRecord>(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  item: T,
  match: QueryStateMatcher<T>,
) {
  if (!isQueryStateRecord(item) || !isFunction(match)) return

  forEachCachedQuery(queryClient, queryKeys, (query) => {
    if (!isQueryKey(query.queryKey)) return

    try {
      queryClient.setQueryData(query.queryKey, (current: unknown) =>
        addToInfiniteList(current, item, match),
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
