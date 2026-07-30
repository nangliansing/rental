import type { QueryClient, QueryKey } from "@tanstack/react-query"

import {
  applyToCachedQueries,
  dropFiniteTotal,
  isFlatListCollection,
  isFunction,
  tryFilterMatchingItems,
  type FlatListCollection,
  type QueryStateMatcher,
  type QueryStateRecord,
} from "./shared"

function withDroppedPagination(
  current: FlatListCollection,
  nextData: unknown[],
  removedCount: number,
): FlatListCollection | undefined {
  try {
    if (!Array.isArray(nextData)) return undefined

    const nextCollection: FlatListCollection = {
      ...current,
      data: nextData as QueryStateRecord[],
    }

    const nextPagination = dropFiniteTotal(current.pagination, removedCount)
    if (nextPagination === undefined) return nextCollection

    return {
      ...nextCollection,
      pagination: nextPagination,
    }
  } catch {
    return undefined
  }
}

/**
 * Removes matching item(s) from a flat list cache value.
 *
 * Scope:
 * - Supports `{ data: T[], pagination? }` and bare `T[]`
 * - Removes every top-level record for which `match` returns true
 * - Drops `pagination.total` by the removed count (clamped at 0) when finite
 * - Never touches infinite `{ pages }` shapes
 *
 * Defensive: never throws. Bad inputs / scan failures leave `current`
 * unchanged (atomic: either full next value or original reference).
 */
export function removeFromFlatList<T extends QueryStateRecord>(
  current: FlatListCollection<T>,
  match: QueryStateMatcher<T>,
): FlatListCollection<T>
export function removeFromFlatList<T extends QueryStateRecord>(
  current: readonly T[],
  match: QueryStateMatcher<T>,
): T[]
export function removeFromFlatList<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
): unknown
export function removeFromFlatList<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
): unknown {
  try {
    if (!isFunction(match)) return current

    if (Array.isArray(current)) {
      const filtered = tryFilterMatchingItems(current, match)
      return filtered.status === "updated" ? filtered.next : current
    }

    if (!isFlatListCollection(current)) return current

    // Re-check in case a hostile proxy changed shape between guards.
    const data = current.data
    if (!Array.isArray(data)) return current

    const filtered = tryFilterMatchingItems(data, match)
    if (filtered.status !== "updated") return current
    if (
      !Array.isArray(filtered.next) ||
      typeof filtered.removedCount !== "number"
    ) {
      return current
    }

    return (
      withDroppedPagination(current, filtered.next, filtered.removedCount) ??
      current
    )
  } catch {
    return current
  }
}

/**
 * Applies {@link removeFromFlatList} across every cached query under `queryKeys`.
 * Never throws: invalid client/keys/matcher or cache access failures are no-ops.
 */
export function removeFromFlatListInQueries<T extends QueryStateRecord>(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  match: QueryStateMatcher<T>,
) {
  if (!isFunction(match)) return

  applyToCachedQueries(queryClient, queryKeys, (current) =>
    removeFromFlatList(current, match),
  )
}

export type { FlatListCollection, QueryStateMatcher, QueryStateRecord }
