import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { addToFlatList, addToFlatListInQueries } from "./addToFlatList"
import { isFlatListCollection, isInfiniteCollection } from "./shared"

const byId =
  (id: string) =>
  (value: Record<string, unknown>) =>
    value._id === id

describe("flat list shape guards", () => {
  it("accepts only { data: array } without pages", () => {
    expect(isFlatListCollection({ data: [] })).toBe(true)
    expect(
      isFlatListCollection({ data: [{ _id: "1" }], pagination: { total: 1 } }),
    ).toBe(true)
    expect(isFlatListCollection(Object.assign(Object.create(null), { data: [] }))).toBe(
      true,
    )

    expect(isFlatListCollection(undefined)).toBe(false)
    expect(isFlatListCollection(null)).toBe(false)
    expect(isFlatListCollection([])).toBe(false)
    expect(isFlatListCollection({ items: [] })).toBe(false)
    expect(isFlatListCollection({ data: "not-array" })).toBe(false)
    expect(isFlatListCollection({ data: null })).toBe(false)
    expect(isFlatListCollection(new Date())).toBe(false)
    expect(
      isFlatListCollection({
        data: [],
        pages: [{ data: [] }],
        pageParams: [1],
      }),
    ).toBe(false)
  })

  it("detects infinite collections only via pages arrays", () => {
    expect(isInfiniteCollection({ pages: [], pageParams: [] })).toBe(true)
    expect(isInfiniteCollection({ pages: [{ data: [] }] })).toBe(true)
    expect(isInfiniteCollection({ data: [] })).toBe(false)
    expect(isInfiniteCollection({ pages: "not-array" })).toBe(false)
    expect(isInfiniteCollection(null)).toBe(false)
  })

  it("treats throwing property access as non-matching shapes", () => {
    const throwingPages = new Proxy(
      {},
      {
        get() {
          throw new Error("pages failed")
        },
        getPrototypeOf() {
          return Object.prototype
        },
      },
    )
    const throwingData = new Proxy(
      { pages: undefined },
      {
        get(target, prop, receiver) {
          if (prop === "data") throw new Error("data failed")
          return Reflect.get(target, prop, receiver)
        },
        getPrototypeOf() {
          return Object.prototype
        },
      },
    )

    expect(isInfiniteCollection(throwingPages)).toBe(false)
    expect(isFlatListCollection(throwingData)).toBe(false)
  })
})

describe("addToFlatList", () => {
  it.each([
    undefined,
    null,
    true,
    false,
    0,
    1,
    "",
    "list",
    1n,
    Symbol("list"),
    () => undefined,
    new Date(),
    new Map(),
    new Set(),
    { items: [{ _id: "listing-1" }] },
    { pagination: { total: 1 } },
    { data: "not-array" },
    { data: null },
    { data: { _id: "listing-1" } },
    {
      pages: [{ data: [{ _id: "listing-1" }], pagination: { total: 1 } }],
      pageParams: [1],
    },
    {
      data: [{ _id: "listing-1" }],
      pages: [{ data: [{ _id: "listing-1" }] }],
      pageParams: [1],
    },
  ])("returns unsupported current unchanged: %s", (current) => {
    expect(
      addToFlatList(current, { _id: "listing-1" }, byId("listing-1")),
    ).toBe(current)
  })

  it.each([
    undefined,
    null,
    true,
    false,
    0,
    1,
    "",
    "item",
    1n,
    Symbol("item"),
    () => undefined,
    [],
    [{ _id: "listing-1" }],
    new Date(),
    new Map(),
    new Set(),
  ])("returns current unchanged for invalid item: %s", (item) => {
    const current = { data: [{ _id: "listing-2" }], pagination: { total: 1 } }
    expect(addToFlatList(current, item as never, byId("listing-1"))).toBe(current)
  })

  it.each([
    undefined,
    null,
    true,
    false,
    0,
    1,
    "",
    "match",
    [],
    {},
  ])("returns current unchanged for invalid matcher: %s", (match) => {
    const current = { data: [{ _id: "listing-2" }], pagination: { total: 1 } }
    expect(
      addToFlatList(current, { _id: "listing-1" }, match as never),
    ).toBe(current)
  })

  it("prepends into { data, pagination } and bumps a finite total", () => {
    const current = {
      data: [{ _id: "listing-2", rent: 20000 }],
      pagination: { page: 1, limit: 20, total: 1 },
      success: true,
    }
    const item = { _id: "listing-1", rent: 10000 }

    const next = addToFlatList(current, item, byId("listing-1"))

    expect(next).toEqual({
      data: [item, { _id: "listing-2", rent: 20000 }],
      pagination: { page: 1, limit: 20, total: 2 },
      success: true,
    })
    expect(next).not.toBe(current)
    expect(next.data[0]).toBe(item)
    expect(current.data).toHaveLength(1)
    expect(current.pagination.total).toBe(1)
  })

  it("prepends into an empty flat list", () => {
    const item = { _id: "listing-1" }
    expect(
      addToFlatList({ data: [], pagination: { total: 0 } }, item, byId("listing-1")),
    ).toEqual({
      data: [item],
      pagination: { total: 1 },
    })
  })

  it("prepends into a bare array without inventing wrapper fields", () => {
    const current = [{ _id: "listing-2" }]
    const item = { _id: "listing-1" }

    const next = addToFlatList(current, item, byId("listing-1"))
    expect(next).toEqual([item, { _id: "listing-2" }])
    expect(next[0]).toBe(item)
    expect(current).toHaveLength(1)
  })

  it("prepends into an empty bare array", () => {
    const item = { _id: "listing-1" }
    expect(addToFlatList([], item, byId("listing-1"))).toEqual([item])
  })

  it("returns the same reference when the item already matches", () => {
    const item = { _id: "listing-1", rent: 10000 }
    const current = {
      data: [item, { _id: "listing-2" }],
      pagination: { total: 2 },
    }
    const bare = [{ _id: "listing-1" }]

    expect(
      addToFlatList(current, { _id: "listing-1", rent: 999 }, byId("listing-1")),
    ).toBe(current)
    expect(addToFlatList(bare, { _id: "listing-1" }, byId("listing-1"))).toBe(
      bare,
    )
  })

  it("dedupes when the match is later in the list", () => {
    const current = {
      data: [{ _id: "listing-2" }, { _id: "listing-1" }, { _id: "listing-3" }],
      pagination: { total: 3 },
    }

    expect(
      addToFlatList(current, { _id: "listing-1", rent: 1 }, byId("listing-1")),
    ).toBe(current)
  })

  it("does not invent an id and keeps the provided item reference", () => {
    const item = { _id: "temp-optimistic-1", title: "New" }
    const current = {
      data: [] as Record<string, unknown>[],
      pagination: { total: 0 },
    }

    const next = addToFlatList(current, item, byId("temp-optimistic-1"))

    expect(next.data[0]).toBe(item)
    expect(next.data[0]).toEqual({ _id: "temp-optimistic-1", title: "New" })
  })

  it.each([
    [{ page: 1 }, { page: 1 }],
    [{ total: Number.NaN }, { total: Number.NaN }],
    [{ total: Number.POSITIVE_INFINITY }, { total: Number.POSITIVE_INFINITY }],
    [{ total: Number.NEGATIVE_INFINITY }, { total: Number.NEGATIVE_INFINITY }],
    [{ total: "1" }, { total: "1" }],
    [{ total: null }, { total: null }],
  ])(
    "leaves non-finite/non-number pagination.total unchanged: %j",
    (pagination, expectedPagination) => {
      const current = {
        data: [] as Record<string, unknown>[],
        pagination,
      }
      const next = addToFlatList(current, { _id: "a" }, byId("a"))
      expect(next.pagination).toEqual(expectedPagination)
      expect(next.data).toEqual([{ _id: "a" }])
    },
  )

  it("preserves missing and non-record pagination without inventing totals", () => {
    expect(
      addToFlatList(
        { data: [] as Record<string, unknown>[], success: true },
        { _id: "a" },
        byId("a"),
      ),
    ).toEqual({
      data: [{ _id: "a" }],
      success: true,
    })

    expect(
      addToFlatList(
        { data: [] as Record<string, unknown>[], pagination: null },
        { _id: "a" },
        byId("a"),
      ),
    ).toEqual({
      data: [{ _id: "a" }],
      pagination: null,
    })

    expect(
      addToFlatList(
        { data: [] as Record<string, unknown>[], pagination: "bad" as never },
        { _id: "a" },
        byId("a"),
      ),
    ).toEqual({
      data: [{ _id: "a" }],
      pagination: "bad",
    })
  })

  it("bumps zero and negative finite totals by +1", () => {
    expect(
      addToFlatList(
        { data: [], pagination: { total: 0 } },
        { _id: "a" },
        byId("a"),
      ).pagination,
    ).toEqual({ total: 1 })

    expect(
      addToFlatList(
        { data: [], pagination: { total: -2 } },
        { _id: "a" },
        byId("a"),
      ).pagination,
    ).toEqual({ total: -1 })
  })

  it("skips non-record entries while matching and still prepends", () => {
    const current = {
      data: [null, "x", { _id: "listing-2" }, 42, undefined],
      pagination: { total: 1 },
    }

    const next = addToFlatList(current, { _id: "listing-1" }, byId("listing-1"))

    expect(next.data[0]).toEqual({ _id: "listing-1" })
    expect(next.data).toHaveLength(6)
    expect(next.pagination).toEqual({ total: 2 })
  })

  it("supports null-prototype records for item and collection", () => {
    const item = Object.assign(Object.create(null), {
      _id: "listing-1",
      rent: 10000,
    }) as Record<string, unknown>
    const current = Object.assign(Object.create(null), {
      data: [],
      pagination: Object.assign(Object.create(null), { total: 0 }),
    }) as {
      data: Record<string, unknown>[]
      pagination: Record<string, unknown>
    }

    const next = addToFlatList(current, item, byId("listing-1"))

    expect(next.data[0]).toBe(item)
    expect(next.pagination.total).toBe(1)
    expect(next).toMatchObject({
      data: [item],
      pagination: { total: 1 },
    })
  })

  it("treats matcher throw / non-boolean / thenable as not already present", () => {
    const current = { data: [{ _id: "listing-1" }], pagination: { total: 1 } }
    const item = { _id: "listing-2" }

    expect(
      addToFlatList(current, item, () => {
        throw new Error("match failed")
      }),
    ).toEqual({
      data: [item, { _id: "listing-1" }],
      pagination: { total: 2 },
    })

    expect(addToFlatList(current, item, (() => 1) as never)).toEqual({
      data: [item, { _id: "listing-1" }],
      pagination: { total: 2 },
    })
    expect(addToFlatList(current, item, (() => "yes") as never)).toEqual({
      data: [item, { _id: "listing-1" }],
      pagination: { total: 2 },
    })
    expect(
      addToFlatList(current, item, (() => Promise.resolve(true)) as never),
    ).toEqual({
      data: [item, { _id: "listing-1" }],
      pagination: { total: 2 },
    })
  })

  it("never mutates frozen list / pagination / item inputs", () => {
    const item = Object.freeze({ _id: "listing-1" })
    const row = Object.freeze({ _id: "listing-2" })
    const pagination = Object.freeze({ page: 1, total: 1 })
    const current = Object.freeze({
      data: Object.freeze([row]) as unknown as Record<string, unknown>[],
      pagination,
    })

    const next = addToFlatList(current, item, byId("listing-1"))

    expect(next).toEqual({
      data: [item, row],
      pagination: { page: 1, total: 2 },
    })
    expect(current.data).toHaveLength(1)
    expect(pagination.total).toBe(1)
  })

  it("leaves current unchanged when the list cannot be inspected safely", () => {
    const throwingList = {
      data: new Proxy([] as Record<string, unknown>[], {
        get(target, prop, receiver) {
          if (prop === Symbol.iterator) {
            throw new Error("cannot iterate")
          }
          return Reflect.get(target, prop, receiver)
        },
      }),
      pagination: { total: 1 },
    }

    expect(
      addToFlatList(throwingList, { _id: "listing-1" }, byId("listing-1")),
    ).toBe(throwingList)
  })

  it("leaves current unchanged when spreading the list throws", () => {
    const throwingSpread = {
      data: new Proxy([{ _id: "listing-2" }] as Record<string, unknown>[], {
        get(target, prop, receiver) {
          if (prop === Symbol.iterator) {
            return () => ({
              next() {
                throw new Error("spread failed")
              },
            })
          }
          return Reflect.get(target, prop, receiver)
        },
      }),
      pagination: { total: 1 },
    }

    expect(
      addToFlatList(throwingSpread, { _id: "listing-1" }, byId("listing-1")),
    ).toBe(throwingSpread)
  })

  it("handles revoked proxies without throwing", () => {
    const itemProxy = Proxy.revocable({ _id: "listing-1" }, {})
    const listProxy = Proxy.revocable({ data: [] }, {})
    itemProxy.revoke()
    listProxy.revoke()

    expect(() =>
      addToFlatList(listProxy.proxy, { _id: "listing-1" }, byId("listing-1")),
    ).not.toThrow()
    expect(
      addToFlatList(listProxy.proxy, { _id: "listing-1" }, byId("listing-1")),
    ).toBe(listProxy.proxy)

    const current = {
      data: [] as Record<string, unknown>[],
      pagination: { total: 0 },
    }
    expect(() =>
      addToFlatList(current, itemProxy.proxy as never, byId("listing-1")),
    ).not.toThrow()
    expect(
      addToFlatList(current, itemProxy.proxy as never, byId("listing-1")),
    ).toBe(current)
  })

  it("preserves extra top-level fields on the collection", () => {
    const current = {
      success: true,
      meta: { source: "owner" },
      data: [{ _id: "listing-2" }],
      pagination: { total: 1, page: 1 },
    }

    expect(
      addToFlatList(current, { _id: "listing-1" }, byId("listing-1")),
    ).toEqual({
      success: true,
      meta: { source: "owner" },
      data: [{ _id: "listing-1" }, { _id: "listing-2" }],
      pagination: { total: 2, page: 1 },
    })
  })
})

describe("addToFlatListInQueries", () => {
  it("prepends into matching flat list queries under a key prefix", () => {
    const queryClient = new QueryClient()
    const listKey = ["listing", "owner", "ACTIVE"] as const
    const otherKey = ["listing", "owner", "PENDING"] as const
    const detailKey = ["listing", "detail", "listing-1"] as const
    const item = { _id: "listing-1", rent: 10000 }

    queryClient.setQueryData(listKey, {
      data: [{ _id: "listing-2", rent: 20000 }],
      pagination: { total: 1 },
    })
    queryClient.setQueryData(otherKey, {
      data: [{ _id: "listing-3", rent: 30000 }],
      pagination: { total: 1 },
    })
    queryClient.setQueryData(detailKey, { _id: "listing-1", rent: 10000 })

    addToFlatListInQueries(
      queryClient,
      [["listing", "owner"]],
      item,
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(listKey)).toEqual({
      data: [item, { _id: "listing-2", rent: 20000 }],
      pagination: { total: 2 },
    })
    expect(queryClient.getQueryData(otherKey)).toEqual({
      data: [item, { _id: "listing-3", rent: 30000 }],
      pagination: { total: 2 },
    })
    expect(queryClient.getQueryData(detailKey)).toEqual({
      _id: "listing-1",
      rent: 10000,
    })
  })

  it("updates bare-array caches under the prefix", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "bare"] as const
    queryClient.setQueryData(key, [{ _id: "listing-2" }])

    addToFlatListInQueries(
      queryClient,
      [["listing"]],
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(key)).toEqual([
      { _id: "listing-1" },
      { _id: "listing-2" },
    ])
  })

  it("does not modify infinite, detail, or non-matching shapes", () => {
    const queryClient = new QueryClient()
    const infiniteKey = ["listing", "infinite"] as const
    const detailKey = ["listing", "detail"] as const
    const wrongShapeKey = ["listing", "items-shape"] as const
    const infinite = {
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    const detail = { _id: "listing-1", rent: 10000 }
    const wrongShape = { items: [{ _id: "listing-2" }] }

    queryClient.setQueryData(infiniteKey, infinite)
    queryClient.setQueryData(detailKey, detail)
    queryClient.setQueryData(wrongShapeKey, wrongShape)

    addToFlatListInQueries(
      queryClient,
      [["listing"]],
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(infiniteKey)).toBe(infinite)
    expect(queryClient.getQueryData(detailKey)).toBe(detail)
    expect(queryClient.getQueryData(wrongShapeKey)).toBe(wrongShape)
  })

  it("skips duplicate inserts across cached flat lists", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "owner"] as const
    const existing = {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: { total: 1 },
    }

    queryClient.setQueryData(key, existing)

    addToFlatListInQueries(
      queryClient,
      [["listing"]],
      { _id: "listing-1", rent: 99999 },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(key)).toBe(existing)
  })

  it("is a no-op for invalid item, matcher, client, or keys", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "owner"] as const
    const current = { data: [{ _id: "listing-2" }], pagination: { total: 1 } }
    queryClient.setQueryData(key, current)

    addToFlatListInQueries(queryClient, [["listing"]], null as never, byId("x"))
    addToFlatListInQueries(
      queryClient,
      [["listing"]],
      { _id: "listing-1" },
      null as never,
    )
    addToFlatListInQueries(
      null as never,
      [["listing"]],
      { _id: "listing-1" },
      byId("listing-1"),
    )
    addToFlatListInQueries(
      queryClient,
      null as never,
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("dedupes overlapping key prefixes to a single write", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "owner"] as const
    queryClient.setQueryData(key, {
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
    })

    addToFlatListInQueries(
      queryClient,
      [
        ["listing"],
        ["listing", "owner"],
      ],
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(key)).toEqual({
      data: [{ _id: "listing-1" }, { _id: "listing-2" }],
      pagination: { total: 2 },
    })
  })

  it("continues updating other queries when one setQueryData throws", () => {
    const firstKey = ["listing", "a"] as const
    const secondKey = ["listing", "b"] as const
    const store = new Map<string, unknown>([
      [
        JSON.stringify(firstKey),
        { data: [{ _id: "listing-2" }], pagination: { total: 1 } },
      ],
      [
        JSON.stringify(secondKey),
        { data: [{ _id: "listing-3" }], pagination: { total: 1 } },
      ],
    ])

    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [
          { queryHash: "a", queryKey: firstKey },
          { queryHash: "b", queryKey: secondKey },
        ],
      }),
      setQueryData: (key: unknown, updater: (current: unknown) => unknown) => {
        const hash = JSON.stringify(key)
        if (hash === JSON.stringify(firstKey)) {
          throw new Error("set failed")
        }
        store.set(hash, updater(store.get(hash)))
      },
    } as unknown as QueryClient

    expect(() =>
      addToFlatListInQueries(
        queryClient,
        [["listing"]],
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).not.toThrow()

    expect(store.get(JSON.stringify(firstKey))).toEqual({
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
    })
    expect(store.get(JSON.stringify(secondKey))).toEqual({
      data: [{ _id: "listing-1" }, { _id: "listing-3" }],
      pagination: { total: 2 },
    })
  })

  it("skips queries with invalid query keys and continues", () => {
    const validKey = ["listing", "valid"] as const
    const store = new Map<string, unknown>([
      [
        JSON.stringify(validKey),
        { data: [{ _id: "listing-2" }], pagination: { total: 1 } },
      ],
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
        ],
      }),
      setQueryData,
    } as unknown as QueryClient

    expect(() =>
      addToFlatListInQueries(
        queryClient,
        [["listing"]],
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).not.toThrow()

    expect(setQueryData).toHaveBeenCalledTimes(1)
    expect(store.get(JSON.stringify(validKey))).toEqual({
      data: [{ _id: "listing-1" }, { _id: "listing-2" }],
      pagination: { total: 2 },
    })
  })

  it("never throws for malformed query clients", () => {
    const queryClient = {
      getQueryCache: () => ({
        findAll: () => {
          throw new Error("cache failed")
        },
      }),
      setQueryData: vi.fn(),
    } as unknown as QueryClient

    expect(() =>
      addToFlatListInQueries(
        queryClient,
        [["listing"]],
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).not.toThrow()
  })

  it("is a no-op when the cached query has no data yet", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "empty"] as const
    // Ensure the query exists without usable flat data.
    queryClient.setQueryData(key, undefined)

    addToFlatListInQueries(
      queryClient,
      [["listing"]],
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(key)).toBeUndefined()
  })
})
