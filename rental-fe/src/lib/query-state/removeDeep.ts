import type { QueryClient, QueryKey } from "@tanstack/react-query"

import {
  applyToCachedQueries,
  dropFiniteTotal,
  isFunction,
  isPositiveFiniteCount,
  isQueryStateRecord,
  MAX_TRAVERSAL_DEPTH,
  readArrayLength,
  safeMatch,
  setOwnProperty,
  type QueryStateMatcher,
  type QueryStateRecord,
} from "./shared"

type NodeResult = { changed: boolean; value: unknown } | undefined

type ArrayResult =
  | { changed: boolean; value: unknown[]; directRemoved: number }
  | undefined

type RecordResult =
  | { changed: boolean; value: QueryStateRecord; collectionRemoved: number }
  | undefined

function removeFromArray<T extends QueryStateRecord>(
  items: unknown[],
  match: QueryStateMatcher<T>,
  path: WeakSet<object>,
  depth: number,
): ArrayResult {
  if (depth > MAX_TRAVERSAL_DEPTH) return undefined
  if (path.has(items)) return undefined

  const length = readArrayLength(items)
  if (length === undefined) return undefined

  path.add(items)
  try {
    let next: unknown[] | undefined
    let directRemoved = 0

    for (let index = 0; index < length; index += 1) {
      const child = items[index]

      if (isQueryStateRecord(child) && safeMatch(match, child as T)) {
        if (next === undefined) next = items.slice(0, index)
        directRemoved += 1
        continue
      }

      const processed = removeFromNode(child, match, path, depth + 1)
      if (processed === undefined) return undefined

      if (processed.changed) {
        if (next === undefined) next = items.slice(0, index)
        next.push(processed.value)
        continue
      }
      if (next !== undefined) next.push(child)
    }

    return next === undefined
      ? { changed: false, value: items, directRemoved: 0 }
      : { changed: true, value: next, directRemoved }
  } finally {
    path.delete(items)
  }
}

function removeFromDataRecord<T extends QueryStateRecord>(
  dataRecord: QueryStateRecord,
  match: QueryStateMatcher<T>,
  path: WeakSet<object>,
  depth: number,
): RecordResult {
  if (depth > MAX_TRAVERSAL_DEPTH) return undefined
  if (path.has(dataRecord)) return undefined

  path.add(dataRecord)
  try {
    let next: QueryStateRecord = dataRecord
    let changed = false
    let directRemoved = 0

    for (const [key, child] of Object.entries(dataRecord)) {
      let processed: NodeResult

      if (Array.isArray(child)) {
        const filtered = removeFromArray(child, match, path, depth + 1)
        if (filtered === undefined) return undefined
        directRemoved += filtered.directRemoved
        processed = filtered
      } else {
        processed = removeFromNode(child, match, path, depth + 1)
        if (processed === undefined) return undefined
      }

      if (!processed.changed) continue
      if (next === dataRecord) next = { ...dataRecord }
      setOwnProperty(next, key, processed.value)
      changed = true
    }

    return { changed, value: next, collectionRemoved: directRemoved }
  } finally {
    path.delete(dataRecord)
  }
}

function removeFromPages<T extends QueryStateRecord>(
  pages: unknown[],
  match: QueryStateMatcher<T>,
  path: WeakSet<object>,
  depth: number,
): NodeResult {
  if (depth > MAX_TRAVERSAL_DEPTH) return undefined
  if (path.has(pages)) return undefined

  const pageCount = readArrayLength(pages)
  if (pageCount === undefined) return undefined

  path.add(pages)
  try {
    type PagePass = {
      changed: boolean
      value: unknown
      isRecordPage: boolean
    }

    const passes: PagePass[] = []
    let globalRemoved = 0

    for (let index = 0; index < pageCount; index += 1) {
      const page = pages[index]

      if (Array.isArray(page)) {
        const filtered = removeFromArray(page, match, path, depth + 1)
        if (filtered === undefined) return undefined
        globalRemoved += filtered.directRemoved
        passes.push({
          changed: filtered.changed,
          value: filtered.value,
          isRecordPage: false,
        })
        continue
      }

      if (isQueryStateRecord(page)) {
        const processed = removeFromRecord(page, match, path, depth + 1, true)
        if (processed === undefined) return undefined
        globalRemoved += processed.collectionRemoved
        passes.push({
          changed: processed.changed,
          value: processed.value,
          isRecordPage: true,
        })
        continue
      }

      passes.push({ changed: false, value: page, isRecordPage: false })
    }

    const applyDrop = isPositiveFiniteCount(globalRemoved)
    let pagesChanged = passes.some((pass) => pass.changed)
    if (!applyDrop && !pagesChanged) return { changed: false, value: pages }

    const nextPages: unknown[] = []
    for (const pass of passes) {
      let pageValue = pass.value

      if (applyDrop && pass.isRecordPage && isQueryStateRecord(pageValue)) {
        const dropped = dropFiniteTotal(pageValue.pagination, globalRemoved)
        if (dropped !== undefined) {
          const nextPage: QueryStateRecord = { ...pageValue }
          setOwnProperty(nextPage, "pagination", dropped)
          pageValue = nextPage
          pagesChanged = true
        }
      }

      nextPages.push(pageValue)
    }

    return pagesChanged
      ? { changed: true, value: nextPages }
      : { changed: false, value: pages }
  } finally {
    path.delete(pages)
  }
}

function removeFromRecord<T extends QueryStateRecord>(
  record: QueryStateRecord,
  match: QueryStateMatcher<T>,
  path: WeakSet<object>,
  depth: number,
  deferTotalDrop: boolean,
): RecordResult {
  if (depth > MAX_TRAVERSAL_DEPTH) return undefined
  if (path.has(record)) return undefined

  path.add(record)
  try {
    let next: QueryStateRecord = record
    let changed = false
    let collectionRemoved = 0

    for (const [key, child] of Object.entries(record)) {
      let processed: NodeResult

      if (key === "pages" && Array.isArray(child)) {
        processed = removeFromPages(child, match, path, depth + 1)
        if (processed === undefined) return undefined
      } else if (key === "data" && Array.isArray(child)) {
        const filtered = removeFromArray(child, match, path, depth + 1)
        if (filtered === undefined) return undefined
        collectionRemoved += filtered.directRemoved
        processed = filtered
      } else if (key === "data" && isQueryStateRecord(child)) {
        const dataResult = removeFromDataRecord(child, match, path, depth + 1)
        if (dataResult === undefined) return undefined
        collectionRemoved += dataResult.collectionRemoved
        processed = dataResult
      } else {
        processed = removeFromNode(child, match, path, depth + 1)
        if (processed === undefined) return undefined
      }

      if (!processed.changed) continue
      if (next === record) next = { ...record }
      setOwnProperty(next, key, processed.value)
      changed = true
    }

    if (!deferTotalDrop && isPositiveFiniteCount(collectionRemoved)) {
      const dropped = dropFiniteTotal(next.pagination, collectionRemoved)
      if (dropped !== undefined) {
        if (next === record) next = { ...record }
        setOwnProperty(next, "pagination", dropped)
        changed = true
      }
    }

    return { changed, value: next, collectionRemoved }
  } finally {
    path.delete(record)
  }
}

function removeFromNode<T extends QueryStateRecord>(
  value: unknown,
  match: QueryStateMatcher<T>,
  path: WeakSet<object>,
  depth: number,
): NodeResult {
  if (Array.isArray(value)) {
    const filtered = removeFromArray(value, match, path, depth)
    if (filtered === undefined) return undefined
    return { changed: filtered.changed, value: filtered.value }
  }

  if (!isQueryStateRecord(value)) return { changed: false, value }

  const processed = removeFromRecord(value, match, path, depth, false)
  if (processed === undefined) return undefined
  return { changed: processed.changed, value: processed.value }
}

/**
 * Removes every matching plain record found in any array at any depth inside
 * a cache value, keeping pagination totals consistent.
 *
 * Defensive: never throws. Bad inputs, matcher failures, hostile proxies,
 * cycles, or over-deep trees leave `current` unchanged (atomic).
 */
export function removeDeep<T extends QueryStateRecord>(
  current: unknown,
  match: QueryStateMatcher<T>,
): unknown {
  try {
    if (!isFunction(match)) return current
    if (!Array.isArray(current) && !isQueryStateRecord(current)) return current

    const result = removeFromNode(current, match, new WeakSet(), 0)
    if (result === undefined || !result.changed) return current
    return result.value
  } catch {
    return current
  }
}

/**
 * Applies {@link removeDeep} across every cached query under `queryKeys`.
 * Never throws: invalid client/keys/matcher or cache access failures are no-ops.
 */
export function removeDeepInQueries<T extends QueryStateRecord>(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  match: QueryStateMatcher<T>,
) {
  if (!isFunction(match)) return

  applyToCachedQueries(queryClient, queryKeys, (current) =>
    removeDeep(current, match),
  )
}

export type { QueryStateMatcher, QueryStateRecord }
