import type { QueryClient, QueryKey } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import {
  applyToCachedQueries,
  dropFiniteTotal,
  forEachCachedQuery,
  isPositiveFiniteCount,
  isQueryKey,
  isQueryStateRecord,
  isUsableQueryClient,
  readArrayLength,
  readPageItems,
  safeMatch,
  safeUpdate,
  tryFilterMatchingItems,
  tryMapMatchingItems,
} from "./shared"

describe("query-state shared guards", () => {
  it("handles revoked proxies without throwing", () => {
    const objectProxy = Proxy.revocable({}, {})
    const keyProxy = Proxy.revocable([], {})
    const clientProxy = Proxy.revocable({}, {})
    objectProxy.revoke()
    keyProxy.revoke()
    clientProxy.revoke()

    expect(() => isQueryStateRecord(objectProxy.proxy)).not.toThrow()
    expect(isQueryStateRecord(objectProxy.proxy)).toBe(false)
    expect(() => isQueryKey(keyProxy.proxy)).not.toThrow()
    expect(isQueryKey(keyProxy.proxy)).toBe(false)
    expect(() => isUsableQueryClient(clientProxy.proxy)).not.toThrow()
    expect(isUsableQueryClient(clientProxy.proxy)).toBe(false)
  })

  it("requires an exact boolean true matcher result", () => {
    const value = { _id: "1" }

    expect(safeMatch(() => true, value)).toBe(true)
    expect(safeMatch(() => false, value)).toBe(false)
    expect(safeMatch((() => 1) as never, value)).toBe(false)
    expect(
      safeMatch(() => {
        throw new Error("matcher failed")
      }, value),
    ).toBe(false)
  })

  it("safeUpdate accepts plain records and rejects unsafe updater results", () => {
    const current = { _id: "1", rent: 1 }

    expect(safeUpdate((entity) => ({ ...entity, rent: 2 }), current)).toEqual({
      _id: "1",
      rent: 2,
    })
    expect(safeUpdate(null as never, current)).toBeUndefined()
    expect(safeUpdate(() => null as never, current)).toBeUndefined()
    expect(safeUpdate(() => [{ _id: "1" }] as never, current)).toBeUndefined()
    expect(
      safeUpdate(() => {
        throw new Error("update failed")
      }, current),
    ).toBeUndefined()
    expect(
      safeUpdate((() => Promise.resolve(current)) as never, current),
    ).toBeUndefined()
  })

  it.each([
    [[], 0],
    [[1, 2, 3], 3],
  ])("readArrayLength accepts usable arrays", (value, expected) => {
    expect(readArrayLength(value)).toBe(expected)
  })

  it.each([
    undefined,
    null,
    true,
    1,
    "x",
    {},
    new Proxy([], {
      get(target, prop, receiver) {
        if (prop === "length") return Number.POSITIVE_INFINITY
        return Reflect.get(target, prop, receiver)
      },
    }),
    new Proxy([], {
      get(target, prop, receiver) {
        if (prop === "length") return 1.5
        return Reflect.get(target, prop, receiver)
      },
    }),
    new Proxy([], {
      get(target, prop, receiver) {
        if (prop === "length") throw new Error("length failed")
        return Reflect.get(target, prop, receiver)
      },
    }),
  ])("readArrayLength rejects unusable values: %s", (value) => {
    expect(readArrayLength(value)).toBeUndefined()
  })

  it.each([
    [[{ _id: "1" }], [{ _id: "1" }]],
    [{ data: [{ _id: "1" }] }, [{ _id: "1" }]],
  ])("readPageItems accepts usable pages: %s", (page, expected) => {
    expect(readPageItems(page)).toEqual(expected)
  })

  it.each([
    undefined,
    null,
    true,
    1,
    "x",
    {},
    { data: null },
    { pages: [] },
  ])("readPageItems rejects unusable pages: %s", (page) => {
    expect(readPageItems(page)).toBeUndefined()
  })

  it("tryMapMatchingItems updates matches and leaves non-matches", () => {
    const items = [
      { _id: "1", rent: 1 },
      { _id: "2", rent: 2 },
      { _id: "3", rent: 3 },
    ]

    expect(
      tryMapMatchingItems(
        items,
        (item) => item._id === "2",
        (item) => ({ ...item, rent: 20 }),
      ),
    ).toEqual({
      status: "updated",
      next: [
        { _id: "1", rent: 1 },
        { _id: "2", rent: 20 },
        { _id: "3", rent: 3 },
      ],
    })
  })

  it("tryMapMatchingItems reports unchanged when nothing applied", () => {
    const items = [{ _id: "1", rent: 1 }]

    expect(
      tryMapMatchingItems(
        items,
        (item) => item._id === "missing",
        (item) => ({ ...item, rent: 9 }),
      ),
    ).toEqual({ status: "unchanged" })

    expect(
      tryMapMatchingItems(
        items,
        () => true,
        (item) => item,
      ),
    ).toEqual({ status: "unchanged" })
  })

  it("tryMapMatchingItems reports failed for unusable inputs and throws", () => {
    expect(
      tryMapMatchingItems(null, () => true, (item) => item),
    ).toEqual({ status: "failed" })
    expect(
      tryMapMatchingItems([], null as never, (item) => item),
    ).toEqual({ status: "failed" })
    expect(
      tryMapMatchingItems([], () => true, null as never),
    ).toEqual({ status: "failed" })

    const throwing = new Proxy([{ _id: "1" }], {
      get(target, prop, receiver) {
        if (prop === "length") throw new Error("length failed")
        return Reflect.get(target, prop, receiver)
      },
    })
    expect(
      tryMapMatchingItems(throwing, () => true, (item) => item),
    ).toEqual({ status: "failed" })
  })

  it("tryMapMatchingItems skips failed updaters and keeps later matches", () => {
    let calls = 0
    const items = [
      { _id: "1", rent: 1 },
      { _id: "1", rent: 2 },
    ]

    expect(
      tryMapMatchingItems(
        items,
        (item) => item._id === "1",
        (item) => {
          calls += 1
          if (calls === 1) return null as never
          return { ...item, rent: 99 }
        },
      ),
    ).toEqual({
      status: "updated",
      next: [
        { _id: "1", rent: 1 },
        { _id: "1", rent: 99 },
      ],
    })
  })

  it("tryMapMatchingItems fails when index access throws mid-scan", () => {
    const items = new Proxy([{ _id: "1" }, { _id: "2" }], {
      get(target, prop, receiver) {
        if (prop === "1") throw new Error("index failed")
        return Reflect.get(target, prop, receiver)
      },
    })

    expect(
      tryMapMatchingItems(
        items,
        (item) => item._id === "1",
        (item) => ({ ...item, rent: 9 }),
      ),
    ).toEqual({ status: "failed" })
  })

  it("tryMapMatchingItems fails when slice throws during copy-on-write", () => {
    const items = new Proxy([{ _id: "1" }, { _id: "2" }], {
      get(target, prop, receiver) {
        if (prop === "slice") {
          return () => {
            throw new Error("slice failed")
          }
        }
        return Reflect.get(target, prop, receiver)
      },
    })

    expect(
      tryMapMatchingItems(
        items,
        (item) => item._id === "1",
        (item) => ({ ...item, rent: 9 }),
      ),
    ).toEqual({ status: "failed" })
  })

  it("tryFilterMatchingItems removes matches and reports removedCount", () => {
    const items = [
      { _id: "1" },
      { _id: "2" },
      { _id: "1" },
    ]

    expect(
      tryFilterMatchingItems(items, (item) => item._id === "1"),
    ).toEqual({
      status: "updated",
      next: [{ _id: "2" }],
      removedCount: 2,
    })
  })

  it("tryFilterMatchingItems reports unchanged when nothing matches", () => {
    const items = [{ _id: "1" }]

    expect(
      tryFilterMatchingItems(items, (item) => item._id === "missing"),
    ).toEqual({ status: "unchanged" })
  })

  it("tryFilterMatchingItems reports failed for unusable inputs and throws", () => {
    expect(tryFilterMatchingItems(null, () => true)).toEqual({
      status: "failed",
    })
    expect(tryFilterMatchingItems([], null as never)).toEqual({
      status: "failed",
    })

    const throwing = new Proxy([{ _id: "1" }], {
      get(target, prop, receiver) {
        if (prop === "length") throw new Error("length failed")
        return Reflect.get(target, prop, receiver)
      },
    })
    expect(tryFilterMatchingItems(throwing, () => true)).toEqual({
      status: "failed",
    })
  })

  it("dropFiniteTotal clamps and ignores non-finite totals", () => {
    expect(dropFiniteTotal({ total: 5, page: 1 }, 2)).toEqual({
      total: 3,
      page: 1,
    })
    expect(dropFiniteTotal({ total: 1 }, 3)).toEqual({ total: 0 })
    expect(dropFiniteTotal({ total: -2 }, 1)).toEqual({ total: 0 })
    expect(dropFiniteTotal({ total: Number.NaN }, 1)).toBeUndefined()
    expect(dropFiniteTotal({ page: 1 }, 1)).toBeUndefined()
    expect(dropFiniteTotal(null, 1)).toBeUndefined()
    expect(dropFiniteTotal({ total: 5 }, 0)).toBeUndefined()
    expect(dropFiniteTotal({ total: 5 }, 1.5)).toBeUndefined()
    expect(dropFiniteTotal({ total: 5 }, -1)).toBeUndefined()
    expect(dropFiniteTotal({ total: 5 }, Number.POSITIVE_INFINITY)).toBeUndefined()
  })

  it("isPositiveFiniteCount accepts only positive integers", () => {
    expect(isPositiveFiniteCount(1)).toBe(true)
    expect(isPositiveFiniteCount(3)).toBe(true)
    expect(isPositiveFiniteCount(0)).toBe(false)
    expect(isPositiveFiniteCount(-1)).toBe(false)
    expect(isPositiveFiniteCount(1.5)).toBe(false)
    expect(isPositiveFiniteCount(Number.NaN)).toBe(false)
    expect(isPositiveFiniteCount(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isPositiveFiniteCount("1")).toBe(false)
  })

  it("readPageItems returns undefined when page data getter throws", () => {
    const page = {}
    Object.defineProperty(page, "data", {
      enumerable: true,
      get() {
        throw new Error("data failed")
      },
    })

    expect(readPageItems(page)).toBeUndefined()
  })
})

describe("applyToCachedQueries", () => {
  it("applies the transform to every unique query and validates keys", () => {
    const validKey = ["listing", "valid"] as const
    const store = new Map<string, unknown>([
      [JSON.stringify(validKey), { count: 1 }],
    ])
    const setQueryData = vi.fn(
      (key: unknown, updater: (current: unknown) => unknown) => {
        store.set(JSON.stringify(key), updater(store.get(JSON.stringify(key))))
      },
    )
    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [
          { queryHash: "bad", queryKey: "not-an-array" },
          { queryHash: "good", queryKey: validKey },
          { queryHash: "good", queryKey: validKey },
        ],
      }),
      setQueryData,
    } as unknown as QueryClient

    applyToCachedQueries(queryClient, [["listing"]], (current) => ({
      ...(current as Record<string, unknown>),
      count: 2,
    }))

    expect(setQueryData).toHaveBeenCalledTimes(1)
    expect(store.get(JSON.stringify(validKey))).toEqual({ count: 2 })
  })

  it("continues after a throwing setQueryData and ignores invalid transforms", () => {
    const goodKey = ["listing", "good"] as const
    const badKey = ["listing", "bad"] as const
    const store = new Map<string, unknown>([
      [JSON.stringify(goodKey), 1],
      [JSON.stringify(badKey), 1],
    ])
    const setQueryData = vi.fn(
      (key: unknown, updater: (current: unknown) => unknown) => {
        if (JSON.stringify(key) === JSON.stringify(badKey)) {
          throw new Error("set failed")
        }
        store.set(JSON.stringify(key), updater(store.get(JSON.stringify(key))))
      },
    )
    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [
          { queryHash: "bad", queryKey: badKey },
          { queryHash: "good", queryKey: goodKey },
        ],
      }),
      setQueryData,
    } as unknown as QueryClient

    expect(() =>
      applyToCachedQueries(queryClient, [["listing"]], (current) =>
        typeof current === "number" ? current + 1 : current,
      ),
    ).not.toThrow()
    expect(store.get(JSON.stringify(goodKey))).toBe(2)

    expect(() =>
      applyToCachedQueries(queryClient, [["listing"]], null as never),
    ).not.toThrow()
  })
})

describe("forEachCachedQuery", () => {
  it("dedupes hashes and continues after malformed queries and visitor errors", () => {
    const visited: string[] = []
    const malformed = Object.create(null)
    Object.defineProperty(malformed, "queryHash", {
      get() {
        throw new Error("bad hash")
      },
    })
    const queryA = { queryHash: "a", queryKey: ["a"] as QueryKey }
    const queryB = { queryHash: "b", queryKey: ["b"] as QueryKey }

    const queryClient = {
      getQueryCache: () => ({
        findAll: ({ queryKey }: { queryKey: QueryKey }) => {
          if (queryKey[0] === "bad-prefix") throw new Error("bad prefix")
          if (queryKey[0] === "not-array-result") return null
          return [null, malformed, queryA, queryA, queryB]
        },
      }),
      setQueryData: vi.fn(),
    } as unknown as QueryClient

    expect(() =>
      forEachCachedQuery(
        queryClient,
        [
          ["bad-prefix"],
          ["not-array-result"],
          ["valid"],
        ],
        (query) => {
          visited.push(query.queryHash)
          if (query.queryHash === "a") throw new Error("visitor failed")
        },
      ),
    ).not.toThrow()

    expect(visited).toEqual(["a", "b"])
  })

  it("is a no-op for invalid visitors and malformed clients", () => {
    const findAll = vi.fn()
    const queryClient = {
      getQueryCache: () => ({ findAll }),
      setQueryData: vi.fn(),
    } as unknown as QueryClient

    expect(() =>
      forEachCachedQuery(queryClient, [["listing"]], null as never),
    ).not.toThrow()
    expect(findAll).not.toHaveBeenCalled()

    const throwingClient = Object.create(null)
    Object.defineProperty(throwingClient, "getQueryCache", {
      get() {
        throw new Error("client getter failed")
      },
    })
    expect(() =>
      forEachCachedQuery(
        throwingClient as QueryClient,
        [["listing"]],
        () => undefined,
      ),
    ).not.toThrow()
  })
})
