import type { QueryClient, QueryKey } from "@tanstack/react-query"

import {
  forEachCachedQuery,
  isFunction,
  isQueryStateRecord,
  safeMatch,
  safeUpdate,
  type QueryStateMatcher,
  type QueryStateRecord,
  type QueryStateUpdater,
} from "./shared"

/**
 * Updates one single-resource cache value.
 *
 * Scope: top-level only. If `current` is the matched entity, apply `update`.
 * Nested projections are intentionally out of scope for this helper.
 *
 * Defensive: never throws. Bad inputs, matcher/updater failures, or non-object
 * updater results leave `current` unchanged.
 */
export function updateSingle<T extends QueryStateRecord>(
  current: T,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): T
export function updateSingle<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): unknown
export function updateSingle<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): unknown {
  try {
    if (!isQueryStateRecord(current)) return current
    if (!isFunction(match) || !isFunction(update)) return current
    if (!safeMatch(match, current as T)) return current

    const next = safeUpdate(update, current as T)
    if (next === undefined || Object.is(next, current)) return current
    return next
  } catch {
    return current
  }
}

/**
 * Applies {@link updateSingle} across every cached query under `queryKeys`.
 * Never throws: invalid client/keys or cache access failures are no-ops.
 */
export function updateSingleInQueries<T extends QueryStateRecord>(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
) {
  if (!isFunction(match) || !isFunction(update)) return

  forEachCachedQuery(queryClient, queryKeys, (query) => {
    try {
      queryClient.setQueryData(query.queryKey, (current: unknown) =>
        updateSingle(current, match, update),
      )
    } catch {
      // Keep going; one key failure must not block the rest.
    }
  })
}

export type {
  QueryStateMatcher,
  QueryStateRecord,
  QueryStateUpdater,
}
