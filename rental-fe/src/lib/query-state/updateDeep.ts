import type { QueryClient, QueryKey } from "@tanstack/react-query"

import {
  applyToCachedQueries,
  isFunction,
  isQueryStateRecord,
  MAX_TRAVERSAL_DEPTH,
  readArrayLength,
  safeMatch,
  safeUpdate,
  setOwnProperty,
  type QueryStateMatcher,
  type QueryStateRecord,
  type QueryStateUpdater,
} from "./shared"

type DeepPatchResult =
  | { changed: boolean; value: unknown }
  | undefined // traversal failure — caller must keep the original value

function updateNodeDeep<T extends QueryStateRecord>(
  value: unknown,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
  path: WeakSet<object>,
  depth: number,
): DeepPatchResult {
  // Depth-guard containers only; leaf values cannot recurse further.
  if (!Array.isArray(value) && !isQueryStateRecord(value)) {
    return { changed: false, value }
  }
  if (depth > MAX_TRAVERSAL_DEPTH) return undefined

  if (Array.isArray(value)) {
    if (path.has(value)) return undefined

    const length = readArrayLength(value)
    if (length === undefined) return undefined

    path.add(value)
    try {
      let next: unknown[] | undefined

      for (let index = 0; index < length; index += 1) {
        const child = value[index]
        const patched = updateNodeDeep(child, match, update, path, depth + 1)
        if (patched === undefined) return undefined

        if (patched.changed) {
          if (next === undefined) next = value.slice(0, index)
          next.push(patched.value)
          continue
        }
        if (next !== undefined) next.push(child)
      }

      return next === undefined
        ? { changed: false, value }
        : { changed: true, value: next }
    } finally {
      path.delete(value)
    }
  }

  if (path.has(value)) return undefined

  path.add(value)
  try {
    let base: QueryStateRecord = value
    let changed = false

    if (safeMatch(match, value as T)) {
      const updated = safeUpdate(update, value as T)
      if (updated !== undefined && !Object.is(updated, value)) {
        base = updated
        changed = true
      }
    }

    // Walk the (possibly replaced) node's children so nested matches and
    // server-provided replacements are patched consistently.
    let next: QueryStateRecord = base
    for (const [key, child] of Object.entries(base)) {
      const patched = updateNodeDeep(child, match, update, path, depth + 1)
      if (patched === undefined) return undefined
      if (!patched.changed) continue

      if (next === base) next = { ...base }
      setOwnProperty(next, key, patched.value)
      changed = true
    }

    return changed
      ? { changed: true, value: next }
      : { changed: false, value }
  } finally {
    path.delete(value)
  }
}

/**
 * Updates every matching plain record found at any depth inside a cache value.
 *
 * Scope:
 * - Traverses arrays and plain-object records only (Dates, Maps, class
 *   instances, and other exotic values are left as-is and not entered)
 * - Applies `update` at most once per node, then walks the replacement's
 *   children (nested matches inside a replacement are also patched)
 * - Copy-on-write: untouched siblings/subtrees keep their references;
 *   returns the same reference when nothing changed
 * - Shared references (the same object reachable via two paths) are patched
 *   at each occurrence; true cycles abort the update
 *
 * Defensive: never throws. Bad inputs, matcher/updater failures, hostile
 * proxies, cycles, or over-deep trees leave `current` unchanged (atomic).
 */
export function updateDeep<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): unknown {
  try {
    if (!isFunction(match) || !isFunction(update)) return current
    if (!Array.isArray(current) && !isQueryStateRecord(current)) return current

    const result = updateNodeDeep(current, match, update, new WeakSet(), 0)
    if (result === undefined || !result.changed) return current
    return result.value
  } catch {
    return current
  }
}

/**
 * Applies {@link updateDeep} across every cached query under `queryKeys`.
 * Never throws: invalid client/keys/callbacks or cache access failures are no-ops.
 */
export function updateDeepInQueries<T extends QueryStateRecord>(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
) {
  if (!isFunction(match) || !isFunction(update)) return

  applyToCachedQueries(queryClient, queryKeys, (current) =>
    updateDeep(current, match, update),
  )
}

export type { QueryStateMatcher, QueryStateRecord, QueryStateUpdater }
