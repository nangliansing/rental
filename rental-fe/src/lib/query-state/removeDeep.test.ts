import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import { removeDeep, removeDeepInQueries } from "./removeDeep"

const byListingId =
  (listingId: string) =>
  (value: Record<string, unknown>) =>
    value.listingId === listingId

const byId =
  (id: string) =>
  (value: Record<string, unknown>) =>
    value._id === id

describe("removeDeep", () => {
  it.each([
    undefined,
    null,
    true,
    false,
    0,
    1,
    "",
    "value",
    1n,
    Symbol("value"),
    () => undefined,
    new Date(),
    new Map(),
    new Set(),
  ])("returns unsupported current unchanged: %s", (current) => {
    expect(removeDeep(current, byListingId("listing-1"))).toBe(current)
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
    const current = { data: [{ listingId: "listing-1" }] }
    expect(removeDeep(current, match as never)).toBe(current)
  })

  it("removes from a flat { data, pagination } collection and drops total", () => {
    const current = {
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { page: 1, limit: 20, total: 2 },
      success: true,
    }

    expect(removeDeep(current, byId("listing-1"))).toEqual({
      data: [{ _id: "listing-2", rent: 20000 }],
      pagination: { page: 1, limit: 20, total: 1 },
      success: true,
    })
  })

  it("removes from named item containers under data and drops total", () => {
    const current = {
      data: {
        savedListings: [
          { _id: "saved-1", listingId: "listing-1" },
          { _id: "saved-2", listingId: "listing-2" },
        ],
        meta: { source: "saved" },
      },
      pagination: { total: 2 },
    }

    expect(removeDeep(current, byListingId("listing-1"))).toEqual({
      data: {
        savedListings: [{ _id: "saved-2", listingId: "listing-2" }],
        meta: { source: "saved" },
      },
      pagination: { total: 1 },
    })
  })

  it("counts removals from every array directly under a data record", () => {
    const current = {
      data: {
        savedListings: [{ _id: "saved-1", listingId: "listing-1" }],
        featured: [{ _id: "saved-2", listingId: "listing-1" }],
      },
      pagination: { total: 4 },
    }

    expect(removeDeep(current, byListingId("listing-1"))).toEqual({
      data: { savedListings: [], featured: [] },
      pagination: { total: 2 },
    })
  })

  it("does not drop totals when removals happen inside surviving items", () => {
    const current = {
      data: [
        {
          _id: "building-1",
          listings: [{ _id: "listing-1" }],
        },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    }

    expect(removeDeep(current, byId("listing-1"))).toEqual({
      data: [{ _id: "building-1", listings: [] }],
      pagination: { page: 1, limit: 20, total: 1 },
    })
  })

  it("does not drop totals for arrays outside the data scope", () => {
    const current = {
      listings: [{ _id: "listing-1" }, { _id: "listing-2" }],
      pagination: { total: 2 },
    }

    expect(removeDeep(current, byId("listing-1"))).toEqual({
      listings: [{ _id: "listing-2" }],
      pagination: { total: 2 },
    })
  })

  it("removes from bare top-level arrays and nested plain arrays", () => {
    const current = [
      { _id: "listing-1" },
      { group: [{ _id: "listing-1" }, { _id: "listing-2" }] },
    ]

    expect(removeDeep(current, byId("listing-1"))).toEqual([
      { group: [{ _id: "listing-2" }] },
    ])
  })

  it("drops every infinite page total by the combined removed count", () => {
    const current = {
      pageParams: [1, 2],
      pages: [
        {
          data: {
            savedListings: [{ _id: "saved-1", listingId: "listing-1" }],
          },
          pagination: { page: 1, limit: 1, total: 2 },
        },
        {
          data: {
            savedListings: [{ _id: "saved-2", listingId: "listing-2" }],
          },
          pagination: { page: 2, limit: 1, total: 2 },
        },
      ],
    }

    expect(removeDeep(current, byListingId("listing-1"))).toEqual({
      pageParams: [1, 2],
      pages: [
        {
          data: { savedListings: [] },
          pagination: { page: 1, limit: 1, total: 1 },
        },
        {
          data: {
            savedListings: [{ _id: "saved-2", listingId: "listing-2" }],
          },
          pagination: { page: 2, limit: 1, total: 1 },
        },
      ],
    })
  })

  it("combines removals across pages, bare-array pages, and named containers", () => {
    const current = {
      pages: [
        {
          data: { savedListings: [{ _id: "saved-1", listingId: "listing-1" }] },
          pagination: { total: 3 },
        },
        [{ listingId: "listing-1" }],
        {
          data: [{ listingId: "listing-1" }, { listingId: "listing-2" }],
          pagination: { total: 3 },
        },
      ],
      pageParams: [1, 2, 3],
    }

    expect(removeDeep(current, byListingId("listing-1"))).toEqual({
      pages: [
        {
          data: { savedListings: [] },
          pagination: { total: 0 },
        },
        [],
        {
          data: [{ listingId: "listing-2" }],
          pagination: { total: 0 },
        },
      ],
      pageParams: [1, 2, 3],
    })
  })

  it("clamps totals at 0 and leaves non-finite totals unchanged", () => {
    expect(
      removeDeep(
        {
          data: [{ listingId: "listing-1" }, { listingId: "listing-1" }],
          pagination: { total: 1 },
        },
        byListingId("listing-1"),
      ),
    ).toEqual({ data: [], pagination: { total: 0 } })

    const nonFinite = {
      data: [{ listingId: "listing-1" }],
      pagination: { total: Number.NaN },
    }
    expect(removeDeep(nonFinite, byListingId("listing-1"))).toEqual({
      data: [],
      pagination: { total: Number.NaN },
    })

    const stringTotal = {
      data: [{ listingId: "listing-1" }],
      pagination: { total: "2" },
    }
    expect(removeDeep(stringTotal, byListingId("listing-1"))).toEqual({
      data: [],
      pagination: { total: "2" },
    })
  })

  it("removes items without pagination and preserves other fields", () => {
    const current = {
      data: [{ listingId: "listing-1" }],
      success: true,
    }

    expect(removeDeep(current, byListingId("listing-1"))).toEqual({
      data: [],
      success: true,
    })
  })

  it("returns the same reference when nothing matches", () => {
    const current = {
      data: [{ listingId: "listing-2" }],
      pagination: { total: 1 },
    }
    const bare = [{ listingId: "listing-2" }]
    const empty = { pages: [], pageParams: [] }

    expect(removeDeep(current, byListingId("listing-1"))).toBe(current)
    expect(removeDeep(bare, byListingId("listing-1"))).toBe(bare)
    expect(removeDeep(empty, byListingId("listing-1"))).toBe(empty)
  })

  it("removes every matching record when the matcher always matches", () => {
    const current = {
      data: [{ listingId: "a" }, { listingId: "b" }],
      pagination: { total: 2 },
    }

    expect(removeDeep(current, () => true)).toEqual({
      data: [],
      pagination: { total: 0 },
    })
  })

  it("keeps non-record entries and only removes matching records", () => {
    const date = new Date("2026-01-01")
    const current = {
      data: [null, "x", { listingId: "listing-1" }, 42, date],
      pagination: { total: 1 },
    }

    expect(removeDeep(current, byListingId("listing-1"))).toEqual({
      data: [null, "x", 42, date],
      pagination: { total: 0 },
    })
  })

  it("does not remove class instances", () => {
    class Row {
      listingId = "listing-1"
    }
    const current = { data: [new Row(), { listingId: "listing-2" }] }

    expect(removeDeep(current, byListingId("listing-1"))).toBe(current)
  })

  it("does not remove a matching record that is not an array member", () => {
    const current = {
      listing: { listingId: "listing-1", rent: 10000 },
    }

    expect(removeDeep(current, byListingId("listing-1"))).toBe(current)
  })

  it("walks children of records that match but cannot be removed", () => {
    const current = {
      saved: {
        listingId: "listing-1",
        related: [{ listingId: "listing-1" }, { listingId: "listing-2" }],
      },
    }

    expect(removeDeep(current, byListingId("listing-1"))).toEqual({
      saved: {
        listingId: "listing-1",
        related: [{ listingId: "listing-2" }],
      },
    })
  })

  it("preserves untouched sibling references (copy-on-write)", () => {
    const keepRow = { listingId: "listing-2" }
    const keepBranch = { meta: { source: "saved" } }
    const current = {
      data: [{ listingId: "listing-1" }, keepRow],
      other: keepBranch,
      pagination: { total: 2 },
    }

    const next = removeDeep(current, byListingId("listing-1")) as {
      data: unknown[]
      other: unknown
    }

    expect(next).not.toBe(current)
    expect(next.data[0]).toBe(keepRow)
    expect(next.other).toBe(keepBranch)
  })

  it("supports null-prototype records", () => {
    const row = Object.assign(Object.create(null), {
      listingId: "listing-1",
    }) as Record<string, unknown>
    const keep = Object.assign(Object.create(null), {
      listingId: "listing-2",
    }) as Record<string, unknown>
    const current = Object.assign(Object.create(null), {
      data: [row, keep],
      pagination: Object.assign(Object.create(null), { total: 2 }),
    })

    const next = removeDeep(current, byListingId("listing-1")) as {
      data: unknown[]
      pagination: Record<string, unknown>
    }

    expect(next.data).toEqual([keep])
    expect(next.pagination).toEqual({ total: 1 })
  })

  it("treats matcher throw / non-boolean / thenable as non-matches", () => {
    const current = { data: [{ listingId: "listing-1" }] }

    expect(
      removeDeep(current, () => {
        throw new Error("match failed")
      }),
    ).toBe(current)
    expect(removeDeep(current, (() => 1) as never)).toBe(current)
    expect(removeDeep(current, (() => "yes") as never)).toBe(current)
    expect(
      removeDeep(current, (() => Promise.resolve(true)) as never),
    ).toBe(current)
  })

  it("never mutates frozen inputs", () => {
    const row1 = Object.freeze({ listingId: "listing-1" })
    const row2 = Object.freeze({ listingId: "listing-2" })
    const pagination = Object.freeze({ total: 2 })
    const current = Object.freeze({
      data: Object.freeze([row1, row2]) as unknown as Record<string, unknown>[],
      pagination,
    })

    const next = removeDeep(current, byListingId("listing-1"))

    expect(next).toEqual({
      data: [row2],
      pagination: { total: 1 },
    })
    expect(current.data).toHaveLength(2)
    expect(pagination.total).toBe(2)
  })

  it("handles sparse array holes without failing", () => {
    const data: Record<string, unknown>[] = []
    data[0] = { listingId: "listing-1" }
    data[2] = { listingId: "listing-2" }
    const current = { data, pagination: { total: 2 } }

    const next = removeDeep(current, byListingId("listing-1")) as {
      data: unknown[]
      pagination: Record<string, unknown>
    }

    expect(next.data[0]).toBeUndefined()
    expect(next.data[1]).toEqual({ listingId: "listing-2" })
    expect(next.pagination).toEqual({ total: 1 })
  })

  it("aborts on cycles and returns the original reference", () => {
    const node: Record<string, unknown> = {
      data: [{ listingId: "listing-1" }],
    }
    node.self = node
    expect(removeDeep(node, byListingId("listing-1"))).toBe(node)

    const items: unknown[] = [{ listingId: "listing-1" }]
    items.push(items)
    const arrayCycle = { data: items }
    expect(removeDeep(arrayCycle, byListingId("listing-1"))).toBe(arrayCycle)
  })

  it("removes shared references from every array occurrence", () => {
    const shared = { listingId: "listing-1" }
    const current = {
      first: [shared, { listingId: "listing-2" }],
      second: [shared],
    }

    expect(removeDeep(current, byListingId("listing-1"))).toEqual({
      first: [{ listingId: "listing-2" }],
      second: [],
    })
  })

  it("removes at the maximum supported depth and aborts just past it", () => {
    const buildChain = (wrapperCount: number) => {
      let node: Record<string, unknown> = {
        items: [{ listingId: "listing-1" }],
      }
      for (let index = 0; index < wrapperCount; index += 1) {
        node = { child: node }
      }
      return node
    }

    const within = buildChain(60)
    expect(removeDeep(within, byListingId("listing-1"))).not.toBe(within)

    const beyond = buildChain(70)
    expect(removeDeep(beyond, byListingId("listing-1"))).toBe(beyond)
  })

  it("does not pollute prototypes when payloads carry own __proto__ keys", () => {
    const current = JSON.parse(
      '{"__proto__": {"rows": [{"listingId": "listing-1"}]}, "safe": true}',
    ) as Record<string, unknown>

    const next = removeDeep(current, byListingId("listing-1")) as Record<
      string,
      unknown
    >

    expect(next).not.toBe(current)
    expect(Object.getPrototypeOf(next)).toBe(Object.prototype)
    expect(
      (Object.getOwnPropertyDescriptor(next, "__proto__")?.value as {
        rows: unknown[]
      }).rows,
    ).toEqual([])
    expect(({} as { rows?: unknown }).rows).toBeUndefined()
  })

  it.each([
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    1.5,
    -1,
  ])("leaves current unchanged for unusable array length: %s", (length) => {
    const data = new Proxy([{ listingId: "listing-1" }], {
      get(target, prop, receiver) {
        if (prop === "length") return length
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = { data }

    expect(removeDeep(current, byListingId("listing-1"))).toBe(current)
  })

  it("leaves current unchanged when index access or slice throws", () => {
    const throwingIndex = new Proxy(
      [{ listingId: "listing-1" }, { listingId: "listing-2" }],
      {
        get(target, prop, receiver) {
          if (prop === "1") throw new Error("index failed")
          return Reflect.get(target, prop, receiver)
        },
      },
    )
    const withThrowingIndex = { data: throwingIndex }
    expect(removeDeep(withThrowingIndex, byListingId("listing-1"))).toBe(
      withThrowingIndex,
    )

    const throwingSlice = new Proxy(
      [{ listingId: "listing-1" }, { listingId: "listing-2" }],
      {
        get(target, prop, receiver) {
          if (prop === "slice") {
            return () => {
              throw new Error("slice failed")
            }
          }
          return Reflect.get(target, prop, receiver)
        },
      },
    )
    const current = { data: throwingSlice }
    expect(removeDeep(current, byListingId("listing-1"))).toBe(current)
  })

  it("leaves current unchanged when push throws after copy-on-write starts", () => {
    const data = new Proxy(
      [{ listingId: "listing-1" }, { listingId: "listing-2" }],
      {
        get(target, prop, receiver) {
          if (prop === "slice") {
            return (...args: unknown[]) => {
              const copied = Array.prototype.slice.apply(target, args as never)
              return new Proxy(copied, {
                get(copyTarget, copyProp, copyReceiver) {
                  if (copyProp === "push") {
                    return () => {
                      throw new Error("push failed")
                    }
                  }
                  return Reflect.get(copyTarget, copyProp, copyReceiver)
                },
              })
            }
          }
          return Reflect.get(target, prop, receiver)
        },
      },
    )
    const current = { data }

    expect(removeDeep(current, byListingId("listing-1"))).toBe(current)
  })

  it("aborts atomically when a later branch fails after an earlier removal", () => {
    const hostile: Record<string, unknown> = {}
    Object.defineProperty(hostile, "child", {
      enumerable: true,
      get() {
        throw new Error("getter failed")
      },
    })
    const current = {
      first: [{ listingId: "listing-1" }],
      second: hostile,
    }

    expect(removeDeep(current, byListingId("listing-1"))).toBe(current)
  })

  it("leaves current unchanged when entries enumeration throws", () => {
    const hostile = new Proxy(
      { data: [{ listingId: "listing-1" }] },
      {
        ownKeys() {
          throw new Error("ownKeys failed")
        },
        getPrototypeOf() {
          return Object.prototype
        },
      },
    )

    expect(removeDeep(hostile, byListingId("listing-1"))).toBe(hostile)
  })

  it("handles revoked proxies without throwing", () => {
    const revoked = Proxy.revocable({ data: [{ listingId: "listing-1" }] }, {})
    revoked.revoke()

    expect(() => removeDeep(revoked.proxy, byListingId("listing-1"))).not.toThrow()
    expect(removeDeep(revoked.proxy, byListingId("listing-1"))).toBe(revoked.proxy)
  })
})

describe("removeDeepInQueries", () => {
  it("removes matches from every cache under the key prefixes", () => {
    const queryClient = new QueryClient()
    const flatKey = ["saved-listings", 20] as const
    const infiniteKey = ["saved-listings", 1] as const
    const untouchedKey = ["profile"] as const

    queryClient.setQueryData(flatKey, {
      data: [{ listingId: "listing-1" }, { listingId: "listing-2" }],
      pagination: { total: 2 },
    })
    queryClient.setQueryData(infiniteKey, {
      pages: [
        {
          data: { savedListings: [{ listingId: "listing-1" }] },
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })
    const untouched = { _id: "profile-1" }
    queryClient.setQueryData(untouchedKey, untouched)

    removeDeepInQueries(queryClient, [["saved-listings"]], byListingId("listing-1"))

    expect(queryClient.getQueryData(flatKey)).toEqual({
      data: [{ listingId: "listing-2" }],
      pagination: { total: 1 },
    })
    expect(queryClient.getQueryData(infiniteKey)).toEqual({
      pages: [{ data: { savedListings: [] }, pagination: { total: 0 } }],
      pageParams: [1],
    })
    expect(queryClient.getQueryData(untouchedKey)).toBe(untouched)
  })

  it("keeps the same reference when the item is absent", () => {
    const queryClient = new QueryClient()
    const key = ["saved-listings", 20] as const
    const current = { data: [{ listingId: "listing-2" }] }
    queryClient.setQueryData(key, current)

    removeDeepInQueries(queryClient, [["saved-listings"]], byListingId("listing-1"))

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("dedupes overlapping key prefixes to a single write", () => {
    const queryClient = new QueryClient()
    const key = ["saved-listings", 20] as const
    queryClient.setQueryData(key, { data: [{ listingId: "listing-1" }] })

    const setQueryData = vi.spyOn(queryClient, "setQueryData")

    removeDeepInQueries(
      queryClient,
      [["saved-listings"], ["saved-listings", 20]],
      byListingId("listing-1"),
    )

    expect(setQueryData).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(key)).toEqual({ data: [] })
  })

  it("is a no-op for invalid matcher, client, or keys", () => {
    const queryClient = new QueryClient()
    const key = ["saved-listings"] as const
    const current = { data: [{ listingId: "listing-1" }] }
    queryClient.setQueryData(key, current)

    expect(() =>
      removeDeepInQueries(queryClient, [["saved-listings"]], null as never),
    ).not.toThrow()
    expect(queryClient.getQueryData(key)).toBe(current)

    expect(() =>
      removeDeepInQueries(null as never, [["saved-listings"]], byListingId("listing-1")),
    ).not.toThrow()
    expect(() =>
      removeDeepInQueries(queryClient, null as never, byListingId("listing-1")),
    ).not.toThrow()
  })

  it("continues removing from other queries when one setQueryData throws", () => {
    const goodKey = ["saved-listings", "good"] as const
    const badKey = ["saved-listings", "bad"] as const
    const store = new Map<string, unknown>([
      [JSON.stringify(goodKey), { data: [{ listingId: "listing-1" }] }],
      [JSON.stringify(badKey), { data: [{ listingId: "listing-1" }] }],
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
      removeDeepInQueries(queryClient, [["saved-listings"]], byListingId("listing-1")),
    ).not.toThrow()
    expect(store.get(JSON.stringify(goodKey))).toEqual({ data: [] })
  })

  it("is a no-op when the cached query has no data yet", () => {
    const queryClient = new QueryClient()
    const key = ["saved-listings", "empty"] as const
    queryClient.setQueryData(key, undefined)

    removeDeepInQueries(queryClient, [["saved-listings"]], byListingId("listing-1"))

    expect(queryClient.getQueryData(key)).toBeUndefined()
  })
})
