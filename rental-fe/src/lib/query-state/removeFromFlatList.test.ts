import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import {
  removeFromFlatList,
  removeFromFlatListInQueries,
} from "./removeFromFlatList"

const byId =
  (id: string) =>
  (value: Record<string, unknown>) =>
    value._id === id

describe("removeFromFlatList", () => {
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
    expect(removeFromFlatList(current, byId("listing-1"))).toBe(current)
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
    const current = {
      data: [{ _id: "listing-1" }],
      pagination: { total: 1 },
    }
    expect(removeFromFlatList(current, match as never)).toBe(current)
  })

  it.each([
    {
      label: "first",
      data: [
        { _id: "listing-1" },
        { _id: "listing-2" },
        { _id: "listing-3" },
      ],
      matchId: "listing-1",
      expected: [{ _id: "listing-2" }, { _id: "listing-3" }],
    },
    {
      label: "middle",
      data: [
        { _id: "listing-1" },
        { _id: "listing-2" },
        { _id: "listing-3" },
      ],
      matchId: "listing-2",
      expected: [{ _id: "listing-1" }, { _id: "listing-3" }],
    },
    {
      label: "last",
      data: [
        { _id: "listing-1" },
        { _id: "listing-2" },
        { _id: "listing-3" },
      ],
      matchId: "listing-3",
      expected: [{ _id: "listing-1" }, { _id: "listing-2" }],
    },
  ])("removes a matching item in $label position", ({ data, matchId, expected }) => {
    const current = { data, pagination: { total: 3 } }
    expect(removeFromFlatList(current, byId(matchId))).toEqual({
      data: expected,
      pagination: { total: 2 },
    })
  })

  it("removes a matching item from { data, pagination } and drops total", () => {
    const current = {
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { page: 1, limit: 20, total: 2 },
      success: true,
    }

    const next = removeFromFlatList(current, byId("listing-1"))

    expect(next).toEqual({
      data: [{ _id: "listing-2", rent: 20000 }],
      pagination: { page: 1, limit: 20, total: 1 },
      success: true,
    })
    expect(next).not.toBe(current)
    expect(current.data).toHaveLength(2)
    expect(current.pagination.total).toBe(2)
  })

  it("removes from a bare array without inventing wrapper fields", () => {
    const current = [{ _id: "listing-1" }, { _id: "listing-2" }]
    const next = removeFromFlatList(current, byId("listing-1"))

    expect(next).toEqual([{ _id: "listing-2" }])
    expect(current).toHaveLength(2)
  })

  it("can empty a bare array when the only item matches", () => {
    const current = [{ _id: "listing-1" }]
    expect(removeFromFlatList(current, byId("listing-1"))).toEqual([])
  })

  it("returns the same reference when nothing matches", () => {
    const current = {
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
    }
    const bare = [{ _id: "listing-2" }]
    const empty: Record<string, unknown>[] = []

    expect(removeFromFlatList(current, byId("listing-1"))).toBe(current)
    expect(removeFromFlatList(bare, byId("listing-1"))).toBe(bare)
    expect(removeFromFlatList(empty, byId("listing-1"))).toBe(empty)
    expect(
      removeFromFlatList({ data: [], pagination: { total: 0 } }, byId("x")),
    ).toEqual({ data: [], pagination: { total: 0 } })
  })

  it("removes every matching record and drops total by removed count", () => {
    const current = {
      data: [
        { _id: "listing-1", rent: 1 },
        { _id: "listing-2", rent: 2 },
        { _id: "listing-1", rent: 3 },
      ],
      pagination: { total: 3 },
    }

    expect(removeFromFlatList(current, byId("listing-1"))).toEqual({
      data: [{ _id: "listing-2", rent: 2 }],
      pagination: { total: 1 },
    })
  })

  it("removes all records when matcher always matches", () => {
    const current = {
      data: [{ _id: "a" }, { _id: "b" }, { _id: "c" }],
      pagination: { total: 3 },
    }

    expect(removeFromFlatList(current, () => true)).toEqual({
      data: [],
      pagination: { total: 0 },
    })
  })

  it("removes the only item and clamps total at 0", () => {
    expect(
      removeFromFlatList(
        { data: [{ _id: "listing-1" }], pagination: { total: 1 } },
        byId("listing-1"),
      ),
    ).toEqual({
      data: [],
      pagination: { total: 0 },
    })

    expect(
      removeFromFlatList(
        { data: [{ _id: "listing-1" }], pagination: { total: 0 } },
        byId("listing-1"),
      ),
    ).toEqual({
      data: [],
      pagination: { total: 0 },
    })

    // Removing more rows than total still clamps at 0.
    expect(
      removeFromFlatList(
        {
          data: [{ _id: "listing-1" }, { _id: "listing-1" }],
          pagination: { total: 1 },
        },
        byId("listing-1"),
      ),
    ).toEqual({
      data: [],
      pagination: { total: 0 },
    })
  })

  it("clamps negative totals at 0 after a drop", () => {
    expect(
      removeFromFlatList(
        { data: [{ _id: "listing-1" }], pagination: { total: -3 } },
        byId("listing-1"),
      ),
    ).toEqual({
      data: [],
      pagination: { total: 0 },
    })
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
        data: [{ _id: "listing-1" }],
        pagination,
      }
      const next = removeFromFlatList(current, byId("listing-1"))
      expect(next.pagination).toEqual(expectedPagination)
      expect(next.data).toEqual([])
    },
  )

  it("preserves missing and non-record pagination without inventing totals", () => {
    expect(
      removeFromFlatList(
        { data: [{ _id: "listing-1" }], success: true },
        byId("listing-1"),
      ),
    ).toEqual({
      data: [],
      success: true,
    })

    expect(
      removeFromFlatList(
        { data: [{ _id: "listing-1" }], pagination: null },
        byId("listing-1"),
      ),
    ).toEqual({
      data: [],
      pagination: null,
    })

    expect(
      removeFromFlatList(
        {
          data: [{ _id: "listing-1" }],
          pagination: "bad" as never,
        },
        byId("listing-1"),
      ),
    ).toEqual({
      data: [],
      pagination: "bad",
    })
  })

  it("keeps non-record entries and only removes matching records", () => {
    const date = new Date("2026-01-01")
    const map = new Map()
    const current = {
      data: [null, "x", { _id: "listing-1" }, 42, date, map, { _id: "listing-2" }],
      pagination: { total: 2 },
    }

    expect(removeFromFlatList(current, byId("listing-1"))).toEqual({
      data: [null, "x", 42, date, map, { _id: "listing-2" }],
      pagination: { total: 1 },
    })
  })

  it("does not treat class instances as removable records", () => {
    class Row {
      _id = "listing-1"
    }
    const instance = new Row()
    const current = {
      data: [instance, { _id: "listing-2" }],
      pagination: { total: 2 },
    }

    expect(removeFromFlatList(current, byId("listing-1"))).toBe(current)
  })

  it("supports null-prototype records for collection rows", () => {
    const row = Object.assign(Object.create(null), {
      _id: "listing-1",
    }) as Record<string, unknown>
    const other = Object.assign(Object.create(null), {
      _id: "listing-2",
    }) as Record<string, unknown>
    const current = Object.assign(Object.create(null), {
      data: [row, other],
      pagination: Object.assign(Object.create(null), { total: 2 }),
    }) as {
      data: Record<string, unknown>[]
      pagination: Record<string, unknown>
    }

    const next = removeFromFlatList(current, byId("listing-1"))

    expect(next).toMatchObject({
      data: [other],
      pagination: { total: 1 },
    })
    expect(next.data[0]).toBe(other)
  })

  it("leaves current unchanged when matcher throw / non-boolean / thenable", () => {
    const current = {
      data: [{ _id: "listing-1" }],
      pagination: { total: 1 },
    }

    expect(
      removeFromFlatList(current, () => {
        throw new Error("match failed")
      }),
    ).toBe(current)

    expect(removeFromFlatList(current, (() => 1) as never)).toBe(current)
    expect(removeFromFlatList(current, (() => "yes") as never)).toBe(current)
    expect(removeFromFlatList(current, (() => ({}) as never))).toBe(current)
    expect(
      removeFromFlatList(current, (() => Promise.resolve(true)) as never),
    ).toBe(current)
    expect(removeFromFlatList(current, (() => false) as never)).toBe(current)
  })

  it("never mutates frozen list / pagination inputs", () => {
    const row1 = Object.freeze({ _id: "listing-1" })
    const row2 = Object.freeze({ _id: "listing-2" })
    const pagination = Object.freeze({ page: 1, total: 2 })
    const current = Object.freeze({
      data: Object.freeze([row1, row2]) as unknown as Record<string, unknown>[],
      pagination,
    })

    const next = removeFromFlatList(current, byId("listing-1"))

    expect(next).toEqual({
      data: [row2],
      pagination: { page: 1, total: 1 },
    })
    expect(current.data).toHaveLength(2)
    expect(pagination.total).toBe(2)
  })

  it("leaves current unchanged when the list cannot be inspected safely", () => {
    const throwingList = {
      data: new Proxy([{ _id: "listing-1" }] as Record<string, unknown>[], {
        get(target, prop, receiver) {
          if (prop === "length") {
            throw new Error("cannot read length")
          }
          return Reflect.get(target, prop, receiver)
        },
      }),
      pagination: { total: 1 },
    }

    expect(removeFromFlatList(throwingList, byId("listing-1"))).toBe(
      throwingList,
    )
  })

  it("leaves current unchanged when index access throws mid-scan", () => {
    const data = [{ _id: "listing-1" }, { _id: "listing-2" }]
    const throwingData = new Proxy(data, {
      get(target, prop, receiver) {
        if (prop === "1") throw new Error("index failed")
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = { data: throwingData, pagination: { total: 2 } }

    expect(removeFromFlatList(current, byId("listing-1"))).toBe(current)
  })

  it("leaves current unchanged when slice throws during copy-on-write", () => {
    const data = [{ _id: "listing-1" }, { _id: "listing-2" }]
    const throwingData = new Proxy(data, {
      get(target, prop, receiver) {
        if (prop === "slice") {
          return () => {
            throw new Error("slice failed")
          }
        }
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = { data: throwingData, pagination: { total: 2 } }

    expect(removeFromFlatList(current, byId("listing-1"))).toBe(current)
  })

  it("still removes rows when pagination.total access throws", () => {
    const pagination = new Proxy(
      { page: 1, total: 2 },
      {
        get(target, prop, receiver) {
          if (prop === "total") throw new Error("total failed")
          return Reflect.get(target, prop, receiver)
        },
        getPrototypeOf() {
          return Object.prototype
        },
      },
    )
    const current = {
      data: [{ _id: "listing-1" }, { _id: "listing-2" }],
      pagination,
      success: true,
    }

    const next = removeFromFlatList(current, byId("listing-1"))

    expect(next).toEqual({
      data: [{ _id: "listing-2" }],
      pagination,
      success: true,
    })
    expect(next).not.toBe(current)
  })

  it("leaves current unchanged when data shape flips after the flat-list guard", () => {
    let reads = 0
    const current = new Proxy(
      { data: [{ _id: "listing-1" }], pagination: { total: 1 } },
      {
        get(target, prop, receiver) {
          if (prop === "data") {
            reads += 1
            // First read (isFlatListCollection) returns an array; later read does not.
            return reads === 1 ? target.data : null
          }
          return Reflect.get(target, prop, receiver)
        },
        getPrototypeOf() {
          return Object.prototype
        },
      },
    )

    expect(removeFromFlatList(current, byId("listing-1"))).toBe(current)
  })

  it("handles revoked proxies without throwing", () => {
    const listProxy = Proxy.revocable(
      { data: [{ _id: "listing-1" }], pagination: { total: 1 } },
      {},
    )
    listProxy.revoke()

    expect(() =>
      removeFromFlatList(listProxy.proxy, byId("listing-1")),
    ).not.toThrow()
    expect(removeFromFlatList(listProxy.proxy, byId("listing-1"))).toBe(
      listProxy.proxy,
    )
  })

  it("preserves extra top-level fields on the collection", () => {
    const current = {
      success: true,
      meta: { source: "owner" },
      data: [{ _id: "listing-1" }, { _id: "listing-2" }],
      pagination: { total: 2, page: 1 },
    }

    expect(removeFromFlatList(current, byId("listing-1"))).toEqual({
      success: true,
      meta: { source: "owner" },
      data: [{ _id: "listing-2" }],
      pagination: { total: 1, page: 1 },
    })
  })

  it("preserves remaining row object identity after copy-on-write", () => {
    const keep = { _id: "listing-2", rent: 20000 }
    const current = {
      data: [{ _id: "listing-1" }, keep, { _id: "listing-3" }],
      pagination: { total: 3 },
    }

    const next = removeFromFlatList(current, byId("listing-1"))
    expect(next.data[0]).toBe(keep)
    expect(next.data[1]).toEqual({ _id: "listing-3" })
  })
})

describe("removeFromFlatListInQueries", () => {
  it("removes from matching flat list queries under a key prefix", () => {
    const queryClient = new QueryClient()
    const listKey = ["listing", "owner", "ACTIVE"] as const
    const otherKey = ["listing", "owner", "PENDING"] as const
    const detailKey = ["listing", "detail", "listing-1"] as const

    queryClient.setQueryData(listKey, {
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { total: 2 },
    })
    queryClient.setQueryData(otherKey, {
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-3", rent: 30000 },
      ],
      pagination: { total: 2 },
    })
    queryClient.setQueryData(detailKey, { _id: "listing-1", rent: 10000 })

    removeFromFlatListInQueries(
      queryClient,
      [["listing", "owner"]],
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(listKey)).toEqual({
      data: [{ _id: "listing-2", rent: 20000 }],
      pagination: { total: 1 },
    })
    expect(queryClient.getQueryData(otherKey)).toEqual({
      data: [{ _id: "listing-3", rent: 30000 }],
      pagination: { total: 1 },
    })
    expect(queryClient.getQueryData(detailKey)).toEqual({
      _id: "listing-1",
      rent: 10000,
    })
  })

  it("updates bare-array caches under the prefix", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "bare"] as const
    queryClient.setQueryData(key, [
      { _id: "listing-1" },
      { _id: "listing-2" },
    ])

    removeFromFlatListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(key)).toEqual([{ _id: "listing-2" }])
  })

  it("does not modify infinite, detail, or non-matching shapes", () => {
    const queryClient = new QueryClient()
    const infiniteKey = ["listing", "infinite"] as const
    const detailKey = ["listing", "detail"] as const
    const wrongShapeKey = ["listing", "items-shape"] as const
    const infinite = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    const detail = { _id: "listing-1", rent: 10000 }
    const wrongShape = { items: [{ _id: "listing-1" }] }

    queryClient.setQueryData(infiniteKey, infinite)
    queryClient.setQueryData(detailKey, detail)
    queryClient.setQueryData(wrongShapeKey, wrongShape)

    removeFromFlatListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(infiniteKey)).toBe(infinite)
    expect(queryClient.getQueryData(detailKey)).toBe(detail)
    expect(queryClient.getQueryData(wrongShapeKey)).toBe(wrongShape)
  })

  it("keeps the same reference when the item is absent", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "owner"] as const
    const existing = {
      data: [{ _id: "listing-2", rent: 20000 }],
      pagination: { total: 1 },
    }

    queryClient.setQueryData(key, existing)

    removeFromFlatListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(key)).toBe(existing)
  })

  it("only removes from lists that contain the match", () => {
    const queryClient = new QueryClient()
    const withMatch = ["listing", "with"] as const
    const withoutMatch = ["listing", "without"] as const
    const untouched = {
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
    }

    queryClient.setQueryData(withMatch, {
      data: [{ _id: "listing-1" }, { _id: "listing-2" }],
      pagination: { total: 2 },
    })
    queryClient.setQueryData(withoutMatch, untouched)

    removeFromFlatListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(withMatch)).toEqual({
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
    })
    expect(queryClient.getQueryData(withoutMatch)).toBe(untouched)
  })

  it("is a no-op for invalid matcher, client, or keys", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "owner"] as const
    const current = {
      data: [{ _id: "listing-1" }],
      pagination: { total: 1 },
    }
    queryClient.setQueryData(key, current)

    removeFromFlatListInQueries(queryClient, [["listing"]], null as never)
    removeFromFlatListInQueries(null as never, [["listing"]], byId("listing-1"))
    removeFromFlatListInQueries(queryClient, null as never, byId("listing-1"))
    removeFromFlatListInQueries(
      queryClient,
      [["listing"]],
      undefined as never,
    )

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("dedupes overlapping key prefixes to a single write", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "owner"] as const
    queryClient.setQueryData(key, {
      data: [{ _id: "listing-1" }, { _id: "listing-2" }],
      pagination: { total: 2 },
    })

    removeFromFlatListInQueries(
      queryClient,
      [
        ["listing"],
        ["listing", "owner"],
      ],
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(key)).toEqual({
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
    })
  })

  it("continues updating other queries when one setQueryData throws", () => {
    const firstKey = ["listing", "a"] as const
    const secondKey = ["listing", "b"] as const
    const store = new Map<string, unknown>([
      [
        JSON.stringify(firstKey),
        {
          data: [{ _id: "listing-1" }, { _id: "listing-2" }],
          pagination: { total: 2 },
        },
      ],
      [
        JSON.stringify(secondKey),
        {
          data: [{ _id: "listing-1" }, { _id: "listing-3" }],
          pagination: { total: 2 },
        },
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
      removeFromFlatListInQueries(queryClient, [["listing"]], byId("listing-1")),
    ).not.toThrow()

    expect(store.get(JSON.stringify(firstKey))).toEqual({
      data: [{ _id: "listing-1" }, { _id: "listing-2" }],
      pagination: { total: 2 },
    })
    expect(store.get(JSON.stringify(secondKey))).toEqual({
      data: [{ _id: "listing-3" }],
      pagination: { total: 1 },
    })
  })

  it("skips queries with invalid query keys and continues", () => {
    const validKey = ["listing", "valid"] as const
    const store = new Map<string, unknown>([
      [
        JSON.stringify(validKey),
        {
          data: [{ _id: "listing-1" }, { _id: "listing-2" }],
          pagination: { total: 2 },
        },
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
      removeFromFlatListInQueries(queryClient, [["listing"]], byId("listing-1")),
    ).not.toThrow()

    expect(setQueryData).toHaveBeenCalledTimes(1)
    expect(store.get(JSON.stringify(validKey))).toEqual({
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
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
      removeFromFlatListInQueries(queryClient, [["listing"]], byId("listing-1")),
    ).not.toThrow()
  })

  it("is a no-op when the cached query has no data yet", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "empty"] as const
    queryClient.setQueryData(key, undefined)

    removeFromFlatListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(key)).toBeUndefined()
  })
})
