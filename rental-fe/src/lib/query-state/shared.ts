import type { QueryClient, QueryKey } from "@tanstack/react-query"

export type QueryStateRecord = Record<string, unknown>

export type QueryStateMatcher<
  T extends QueryStateRecord = QueryStateRecord,
> = (value: T) => boolean

export type QueryStateUpdater<T extends QueryStateRecord> = (current: T) => T

/** Common flat `useQuery` list payload: `{ data, pagination? }`. */
export type FlatListCollection<
  T extends QueryStateRecord = QueryStateRecord,
> = QueryStateRecord & {
  data: T[]
  pagination?: QueryStateRecord
}

export type InfiniteListPage<
  T extends QueryStateRecord = QueryStateRecord,
> = FlatListCollection<T> | T[]

/** Common `useInfiniteQuery` list payload: `{ pages, pageParams }`. */
export type InfiniteListCollection<
  T extends QueryStateRecord = QueryStateRecord,
> = QueryStateRecord & {
  pages: InfiniteListPage<T>[]
  pageParams?: unknown[]
}

/** Plain object only — rejects null, arrays, Date, Map, class instances, etc. */
export function isQueryStateRecord(value: unknown): value is QueryStateRecord {
  if (value == null || typeof value !== "object") {
    return false
  }

  try {
    if (Array.isArray(value)) return false
    const proto = Object.getPrototypeOf(value)
    return proto === Object.prototype || proto === null
  } catch {
    return false
  }
}

/** Infinite `useInfiniteQuery` shape — never treat as a flat list. */
export function isInfiniteCollection(
  value: unknown,
): value is QueryStateRecord & { pages: unknown[] } {
  if (!isQueryStateRecord(value)) return false
  try {
    return Array.isArray(value.pages)
  } catch {
    return false
  }
}

/**
 * Reads a usable array length. Rejects non-integers, negatives, and throwing
 * getters so hostile/proxy arrays cannot hang or crash callers.
 */
export function readArrayLength(value: unknown): number | undefined {
  if (!Array.isArray(value)) return undefined

  try {
    const length = value.length
    if (!Number.isInteger(length) || length < 0) return undefined
    return length
  } catch {
    return undefined
  }
}

/**
 * Flat collection shape used by this utility layer.
 * Requires a top-level `data` array and must not look like `{ pages }`.
 */
export function isFlatListCollection(
  value: unknown,
): value is FlatListCollection {
  if (!isQueryStateRecord(value) || isInfiniteCollection(value)) return false
  try {
    return Array.isArray(value.data)
  } catch {
    return false
  }
}

/**
 * Reads the item array from one infinite-list page.
 * Supports bare `T[]` pages and `{ data: T[] }` flat pages.
 * Reads `page.data` at most once so hostile getters cannot flip mid-read.
 */
export function readPageItems(page: unknown): unknown[] | undefined {
  try {
    if (Array.isArray(page)) return page
    if (!isQueryStateRecord(page) || isInfiniteCollection(page)) {
      return undefined
    }

    const data = page.data
    return Array.isArray(data) ? data : undefined
  } catch {
    return undefined
  }
}

/**
 * Infinite collection whose pages are flat list payloads or bare arrays.
 * Empty `pages` is structurally valid, although add operations cannot seed it.
 */
export function isInfiniteListCollection(
  value: unknown,
): value is InfiniteListCollection {
  if (!isInfiniteCollection(value)) return false

  try {
    const pages = value.pages
    const pageCount = readArrayLength(pages)
    if (pageCount === undefined) return false

    for (let index = 0; index < pageCount; index += 1) {
      const page = pages[index]
      if (!Array.isArray(page) && !isFlatListCollection(page)) return false
    }
    return true
  } catch {
    return false
  }
}

export function isFunction(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === "function"
}

export function isQueryKey(value: unknown): value is QueryKey {
  try {
    return Array.isArray(value)
  } catch {
    return false
  }
}

export function safelyConsumeThenable(value: unknown): boolean {
  if (
    value == null ||
    (typeof value !== "object" && typeof value !== "function")
  ) {
    return false
  }

  try {
    if (typeof (value as PromiseLike<unknown>).then !== "function") return false
    void Promise.resolve(value).catch(() => undefined)
    return true
  } catch {
    return true
  }
}

export function safeMatch<T extends QueryStateRecord>(
  match: QueryStateMatcher<T>,
  value: T,
): boolean {
  try {
    const result: unknown = match(value)
    if (safelyConsumeThenable(result)) return false
    return result === true
  } catch {
    return false
  }
}

/**
 * Runs an entity updater safely.
 * Returns `undefined` when the updater is unusable, throws, returns a
 * thenable, or returns a non-record — callers must keep the previous value.
 */
export function safeUpdate<T extends QueryStateRecord>(
  update: QueryStateUpdater<T>,
  current: T,
): T | undefined {
  if (!isFunction(update)) return undefined

  try {
    const next: unknown = update(current)
    if (safelyConsumeThenable(next)) return undefined
    return isQueryStateRecord(next) ? (next as T) : undefined
  } catch {
    return undefined
  }
}

export type ItemMapResult =
  | { status: "unchanged" }
  | { status: "updated"; next: unknown[] }
  | { status: "failed" }

export type ItemFilterResult =
  | { status: "unchanged" }
  | { status: "updated"; next: unknown[]; removedCount: number }
  | { status: "failed" }

/**
 * Copy-on-write mapper for matching records in a list.
 * Distinguishes no-op from hard failure so multi-page updates can stay atomic.
 */
export function tryMapMatchingItems<T extends QueryStateRecord>(
  items: unknown,
  match: QueryStateMatcher<T>,
  update: QueryStateUpdater<T>,
): ItemMapResult {
  if (!Array.isArray(items) || !isFunction(match) || !isFunction(update)) {
    return { status: "failed" }
  }

  try {
    const length = readArrayLength(items)
    if (length === undefined) return { status: "failed" }

    let next: unknown[] | undefined

    for (let index = 0; index < length; index += 1) {
      const existing = items[index]

      if (isQueryStateRecord(existing) && safeMatch(match, existing as T)) {
        const updated = safeUpdate(update, existing as T)
        if (updated !== undefined && !Object.is(updated, existing)) {
          if (next === undefined) {
            next = items.slice(0, index)
          }
          next.push(updated)
          continue
        }
      }

      if (next !== undefined) next.push(existing)
    }

    if (next === undefined) return { status: "unchanged" }
    return { status: "updated", next }
  } catch {
    return { status: "failed" }
  }
}

/**
 * Copy-on-write filter that drops matching records.
 * Distinguishes no-op from hard failure so multi-page removes can stay atomic.
 */
export function tryFilterMatchingItems<T extends QueryStateRecord>(
  items: unknown,
  match: QueryStateMatcher<T>,
): ItemFilterResult {
  if (!Array.isArray(items) || !isFunction(match)) {
    return { status: "failed" }
  }

  try {
    const length = readArrayLength(items)
    if (length === undefined) return { status: "failed" }

    let next: unknown[] | undefined
    let removedCount = 0

    for (let index = 0; index < length; index += 1) {
      const existing = items[index]

      if (isQueryStateRecord(existing) && safeMatch(match, existing as T)) {
        if (next === undefined) {
          next = items.slice(0, index)
        }
        removedCount += 1
        continue
      }

      if (next !== undefined) next.push(existing)
    }

    if (next === undefined || !isPositiveFiniteCount(removedCount)) {
      return { status: "unchanged" }
    }

    return { status: "updated", next, removedCount }
  } catch {
    return { status: "failed" }
  }
}

/** True for a usable removal/add count: finite integer greater than zero. */
export function isPositiveFiniteCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

/**
 * Drops a finite `pagination.total` by `removedCount`, clamped at 0.
 * Returns `undefined` when the total cannot be adjusted safely.
 */
export function dropFiniteTotal(
  pagination: unknown,
  removedCount: number,
): QueryStateRecord | undefined {
  if (!isPositiveFiniteCount(removedCount)) return undefined
  if (!isQueryStateRecord(pagination)) return undefined

  try {
    const total = pagination.total
    if (typeof total !== "number" || !Number.isFinite(total)) return undefined

    return {
      ...pagination,
      total: Math.max(0, total - removedCount),
    }
  } catch {
    return undefined
  }
}

export function isUsableQueryClient(
  value: unknown,
): value is QueryClient {
  if (!value || typeof value !== "object") return false

  try {
    return (
      typeof (value as QueryClient).getQueryCache === "function" &&
      typeof (value as QueryClient).setQueryData === "function"
    )
  } catch {
    return false
  }
}

/**
 * Walks every unique cached query under the given key prefixes.
 * Never throws: bad client/keys and per-key failures are skipped.
 */
export function forEachCachedQuery(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  visit: (query: { queryHash: string; queryKey: QueryKey }) => void,
) {
  if (!isUsableQueryClient(queryClient) || !isQueryKey(queryKeys)) return
  if (!isFunction(visit)) return

  const touched = new Set<string>()
  let safeQueryKeys: QueryKey[]

  try {
    safeQueryKeys = [...queryKeys]
  } catch {
    return
  }

  for (const queryKey of safeQueryKeys) {
    if (!isQueryKey(queryKey)) continue

    try {
      const queries = queryClient.getQueryCache().findAll({ queryKey })
      if (!Array.isArray(queries)) continue

      for (const query of queries) {
        try {
          if (!query || typeof query.queryHash !== "string") continue
          if (touched.has(query.queryHash)) continue
          touched.add(query.queryHash)
          visit(query)
        } catch {
          // Keep going; one query failure must not block the rest.
        }
      }
    } catch {
      // Skip this key prefix; continue with the rest.
    }
  }
}
