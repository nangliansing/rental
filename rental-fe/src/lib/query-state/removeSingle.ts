import type { QueryClient, QueryKey } from "@tanstack/react-query"

import {
  forEachCachedQuery,
  isFunction,
  isQueryKey,
  isQueryStateRecord,
  safeMatch,
  type QueryStateMatcher,
  type QueryStateRecord,
} from "./shared"

function readQueryData(
  queryClient: QueryClient,
  queryKey: QueryKey,
): unknown {
  try {
    if (typeof queryClient.getQueryData !== "function") return undefined
    return queryClient.getQueryData(queryKey)
  } catch {
    return undefined
  }
}

/**
 * Clears one exact query entry. Prefers `removeQueries`; falls back to
 * `setQueryData(undefined)` because updater callbacks that return `undefined`
 * are treated as "no change" by TanStack Query.
 */
function clearExactQuery(queryClient: QueryClient, queryKey: QueryKey) {
  try {
    if (typeof queryClient.removeQueries === "function") {
      try {
        queryClient.removeQueries({ queryKey, exact: true })
        return
      } catch {
        // Fall through to setQueryData.
      }
    }

    if (typeof queryClient.setQueryData !== "function") return
    queryClient.setQueryData(queryKey, undefined)
  } catch {
    // Never throw from cache clearing.
  }
}

/**
 * Removes one single-resource cache value.
 *
 * Scope: top-level only. If `current` is the matched entity, return `undefined`
 * (entity absent). Nested projections are intentionally out of scope.
 *
 * Defensive: never throws. Bad inputs or matcher failures leave `current`
 * unchanged.
 */
export function removeSingle<T extends QueryStateRecord>(
  current: T,
  match: QueryStateMatcher<T>,
): T | undefined
export function removeSingle<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
): unknown
export function removeSingle<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
): unknown {
  if (!isQueryStateRecord(current)) return current
  if (!isFunction(match)) return current
  if (!safeMatch(match, current as T)) return current
  return undefined
}

/**
 * Removes matching single-resource queries under `queryKeys`.
 *
 * Uses `removeQueries({ exact: true })` when available; otherwise clears with
 * `setQueryData(key, undefined)`. Never throws.
 *
 * Note: TanStack Query updaters that return `undefined` are treated as "no
 * change", so removal cannot go through an updater callback.
 */
export function removeSingleInQueries<T extends QueryStateRecord>(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  match: QueryStateMatcher<T>,
) {
  if (!isFunction(match)) return

  forEachCachedQuery(queryClient, queryKeys, (query) => {
    const queryKey = query.queryKey
    if (!isQueryKey(queryKey)) return

    const current = readQueryData(queryClient, queryKey)
    // Only clear when a real single-resource entity matched and was removed.
    if (!isQueryStateRecord(current)) return
    if (removeSingle(current, match) !== undefined) return

    clearExactQuery(queryClient, queryKey)
  })
}
