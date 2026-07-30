import type { QueryClient, QueryKey } from "@tanstack/react-query"

import {
  applyToCachedQueries,
  isFlatListCollection,
  isFunction,
  isQueryStateRecord,
  safeMatch,
  type FlatListCollection,
  type QueryStateMatcher,
  type QueryStateRecord,
} from "./shared"

/**
 * Returns true when a matching record is already in the list.
 * On iteration / matcher-surface failures, returns true so callers leave
 * `current` unchanged instead of inserting into an unreadable list.
 */
function listAlreadyHasMatch<T extends QueryStateRecord>(
  items: unknown[],
  match: QueryStateMatcher<T>,
): boolean {
  try {
    for (const existing of items) {
      if (!isQueryStateRecord(existing)) continue
      if (safeMatch(match, existing as T)) return true
    }
    return false
  } catch {
    return true
  }
}

/**
 * Prepends `item` when absent. Returns `undefined` when the list already
 * contains a match, or when the list cannot be safely copied.
 */
function prependIfAbsent<T extends QueryStateRecord>(
  items: unknown[],
  item: T,
  match: QueryStateMatcher<T>,
): unknown[] | undefined {
  if (listAlreadyHasMatch(items, match)) return undefined
  try {
    return [item, ...items]
  } catch {
    return undefined
  }
}

function withBumpedPagination(
  current: FlatListCollection,
  nextData: unknown[],
): FlatListCollection {
  const pagination = current.pagination
  if (!isQueryStateRecord(pagination)) {
    return { ...current, data: nextData as QueryStateRecord[] }
  }

  const total = pagination.total
  if (typeof total !== "number" || !Number.isFinite(total)) {
    return { ...current, data: nextData as QueryStateRecord[] }
  }

  return {
    ...current,
    data: nextData as QueryStateRecord[],
    pagination: { ...pagination, total: total + 1 },
  }
}

/**
 * Inserts one item into a flat list cache value.
 *
 * Scope:
 * - Supports `{ data: T[], pagination? }` and bare `T[]`
 * - Prepends the item as-is (caller owns identity / optimistic ids)
 * - Skips insert when `match` finds an existing item
 * - Bumps `pagination.total` only when it is a finite number
 * - Never touches infinite `{ pages }` shapes
 *
 * Defensive: never throws. Bad inputs leave `current` unchanged.
 */
export function addToFlatList<T extends QueryStateRecord>(
  current: FlatListCollection<T>,
  item: T,
  match: QueryStateMatcher<T>,
): FlatListCollection<T>
export function addToFlatList<T extends QueryStateRecord>(
  current: readonly T[],
  item: T,
  match: QueryStateMatcher<T>,
): T[]
export function addToFlatList<T extends QueryStateRecord>(
  current: unknown,
  item: T,
  match: QueryStateMatcher<T>,
): unknown
export function addToFlatList<T extends QueryStateRecord>(
  current: unknown,
  item: T,
  match: QueryStateMatcher<T>,
): unknown {
  try {
    if (!isQueryStateRecord(item) || !isFunction(match)) return current

    if (Array.isArray(current)) {
      return prependIfAbsent(current, item, match) ?? current
    }

    if (!isFlatListCollection(current)) return current

    const nextData = prependIfAbsent(current.data, item, match)
    if (nextData === undefined) return current

    return withBumpedPagination(current, nextData)
  } catch {
    return current
  }
}

/**
 * Applies {@link addToFlatList} across every cached query under `queryKeys`.
 * Never throws: invalid client/keys/item or cache access failures are no-ops.
 */
export function addToFlatListInQueries<T extends QueryStateRecord>(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  item: T,
  match: QueryStateMatcher<T>,
) {
  if (!isQueryStateRecord(item) || !isFunction(match)) return

  applyToCachedQueries(queryClient, queryKeys, (current) =>
    addToFlatList(current, item, match),
  )
}

export type { FlatListCollection, QueryStateMatcher, QueryStateRecord }
