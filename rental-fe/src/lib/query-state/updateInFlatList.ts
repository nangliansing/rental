import type { QueryClient, QueryKey } from "@tanstack/react-query"

import {
  applyToCachedQueries,
  isFlatListCollection,
  isFunction,
  tryMapMatchingItems,
  type FlatListCollection,
  type QueryStateMatcher,
  type QueryStateRecord,
  type QueryStateUpdater,
} from "./shared"

function withUpdatedData(
  current: FlatListCollection,
  nextData: unknown[],
): FlatListCollection {
  return {
    ...current,
    data: nextData as QueryStateRecord[],
  }
}

/**
 * Updates matching item(s) inside a flat list cache value.
 *
 * Scope:
 * - Supports `{ data: T[], pagination? }` and bare `T[]`
 * - Updates every top-level record for which `match` returns true
 * - Leaves `pagination` untouched (identity/count unchanged)
 * - Never touches infinite `{ pages }` shapes
 *
 * Defensive: never throws. Bad inputs, matcher/updater failures, non-record
 * updater results, or scan failures leave `current` unchanged (atomic).
 */
export function updateInFlatList<T extends QueryStateRecord>(
  current: FlatListCollection<T>,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): FlatListCollection<T>
export function updateInFlatList<T extends QueryStateRecord>(
  current: readonly T[],
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): T[]
export function updateInFlatList<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): unknown
export function updateInFlatList<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): unknown {
  try {
    if (!isFunction(match) || !isFunction(update)) return current

    if (Array.isArray(current)) {
      const mapped = tryMapMatchingItems(current, match, update)
      return mapped.status === "updated" ? mapped.next : current
    }

    if (!isFlatListCollection(current)) return current

    // Re-check in case a hostile proxy changed shape between guards.
    const data = current.data
    if (!Array.isArray(data)) return current

    const mapped = tryMapMatchingItems(data, match, update)
    if (mapped.status !== "updated") return current

    return withUpdatedData(current, mapped.next)
  } catch {
    return current
  }
}

/**
 * Applies {@link updateInFlatList} across every cached query under `queryKeys`.
 * Never throws: invalid client/keys/callbacks or cache access failures are no-ops.
 */
export function updateInFlatListInQueries<T extends QueryStateRecord>(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
) {
  if (!isFunction(match) || !isFunction(update)) return

  applyToCachedQueries(queryClient, queryKeys, (current) =>
    updateInFlatList(current, match, update),
  )
}

export type {
  FlatListCollection,
  QueryStateMatcher,
  QueryStateRecord,
  QueryStateUpdater,
}
