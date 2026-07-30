import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { updateDeep, updateDeepInQueries } from "./updateDeep"

const byId =
  (id: string) =>
  (value: Record<string, unknown>) =>
    value._id === id

const bumpRent = (entity: Record<string, unknown>) => ({
  ...entity,
  rent: Number(entity.rent ?? 0) + 1000,
})

describe("updateDeep", () => {
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
    expect(updateDeep(current, byId("listing-1"), bumpRent)).toBe(current)
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
    const current = { _id: "listing-1", rent: 10000 }
    expect(updateDeep(current, match as never, bumpRent)).toBe(current)
  })

  it.each([
    undefined,
    null,
    true,
    false,
    0,
    1,
    "",
    "update",
    [],
    {},
  ])("returns current unchanged for invalid updater: %s", (update) => {
    const current = { _id: "listing-1", rent: 10000 }
    expect(updateDeep(current, byId("listing-1"), update as never)).toBe(
      current,
    )
  })

  it("updates a matching top-level record", () => {
    const current = { _id: "listing-1", rent: 10000 }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toEqual({
      _id: "listing-1",
      rent: 11000,
    })
  })

  it("updates matches nested in records, arrays, and arrays of arrays", () => {
    const current = {
      data: {
        listing: { _id: "listing-1", rent: 10000 },
        groups: [
          [{ _id: "listing-1", rent: 20000 }],
          [{ _id: "listing-2", rent: 30000 }],
        ],
      },
    }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toEqual({
      data: {
        listing: { _id: "listing-1", rent: 11000 },
        groups: [
          [{ _id: "listing-1", rent: 21000 }],
          [{ _id: "listing-2", rent: 30000 }],
        ],
      },
    })
  })

  it("updates every matching record at different depths", () => {
    const current = {
      _id: "listing-1",
      rent: 1,
      related: [{ _id: "listing-1", rent: 2 }],
    }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toEqual({
      _id: "listing-1",
      rent: 1001,
      related: [{ _id: "listing-1", rent: 1002 }],
    })
  })

  it("walks the replacement's children for further matches", () => {
    const current = {
      wrapper: { _id: "outer", inner: null },
    }

    const next = updateDeep(
      current,
      (value) => value._id === "outer" || value._id === "inner",
      (value) => {
        if (value._id === "outer") {
          return { _id: "outer", inner: { _id: "inner", patched: false } }
        }
        return { ...value, patched: true }
      },
    ) as Record<string, Record<string, unknown>>

    expect(next.wrapper).toEqual({
      _id: "outer",
      inner: { _id: "inner", patched: true },
    })
  })

  it("returns the same reference when nothing matches", () => {
    const current = {
      data: [{ _id: "listing-2", rent: 20000 }],
      pagination: { total: 1 },
    }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toBe(current)
  })

  it("returns the same reference when updater returns the same object", () => {
    const current = { data: [{ _id: "listing-1", rent: 10000 }] }

    expect(
      updateDeep(current, byId("listing-1"), (entity) => entity),
    ).toBe(current)
  })

  it("preserves untouched sibling references (copy-on-write)", () => {
    const keepRow = { _id: "listing-2", rent: 20000 }
    const keepBranch = { meta: { source: "owner" } }
    const current = {
      data: [{ _id: "listing-1", rent: 10000 }, keepRow],
      other: keepBranch,
    }

    const next = updateDeep(current, byId("listing-1"), bumpRent) as {
      data: unknown[]
      other: unknown
    }

    expect(next).not.toBe(current)
    expect(next.data[0]).toEqual({ _id: "listing-1", rent: 11000 })
    expect(next.data[1]).toBe(keepRow)
    expect(next.other).toBe(keepBranch)
  })

  it("patches shared references at every occurrence without aborting", () => {
    const shared = { _id: "review-1", rating: 5 }
    const current = {
      data: {
        myReview: shared,
        reviews: [shared, { _id: "review-2", rating: 3 }],
      },
    }

    const next = updateDeep(current, byId("review-1"), (entity) => ({
      ...entity,
      rating: 4,
    })) as { data: { myReview: unknown; reviews: unknown[] } }

    expect(next.data.myReview).toEqual({ _id: "review-1", rating: 4 })
    expect(next.data.reviews[0]).toEqual({ _id: "review-1", rating: 4 })
    expect(next.data.reviews[1]).toEqual({ _id: "review-2", rating: 3 })
    expect(shared.rating).toBe(5)
  })

  it("aborts on record cycles and returns the original reference", () => {
    const node: Record<string, unknown> = { _id: "listing-1", rent: 10000 }
    node.self = node

    expect(updateDeep(node, byId("listing-1"), bumpRent)).toBe(node)
  })

  it("aborts on array cycles and returns the original reference", () => {
    const items: unknown[] = [{ _id: "listing-1", rent: 10000 }]
    items.push(items)
    const current = { data: items }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toBe(current)
  })

  it("aborts on over-deep trees and returns the original reference", () => {
    let leaf: Record<string, unknown> = { _id: "listing-1", rent: 10000 }
    for (let index = 0; index < 100; index += 1) {
      leaf = { child: leaf }
    }

    expect(updateDeep(leaf, byId("listing-1"), bumpRent)).toBe(leaf)
  })

  it("does not enter class instances, Dates, or Maps", () => {
    class Row {
      _id = "listing-1"
      rent = 10000
    }
    const current = {
      instance: new Row(),
      date: new Date("2026-01-01"),
      map: new Map([["_id", "listing-1"]]),
      row: { _id: "listing-1", rent: 10000 },
    }

    const next = updateDeep(current, byId("listing-1"), bumpRent) as Record<
      string,
      unknown
    >

    expect(next.instance).toBe(current.instance)
    expect(next.date).toBe(current.date)
    expect(next.map).toBe(current.map)
    expect(next.row).toEqual({ _id: "listing-1", rent: 11000 })
  })

  it("supports null-prototype records", () => {
    const row = Object.assign(Object.create(null), {
      _id: "listing-1",
      rent: 10000,
    }) as Record<string, unknown>
    const current = Object.assign(Object.create(null), { data: [row] })

    const next = updateDeep(current, byId("listing-1"), bumpRent) as {
      data: Record<string, unknown>[]
    }

    expect(next.data[0]).toEqual({ _id: "listing-1", rent: 11000 })
  })

  it("leaves current unchanged when matcher throws / non-boolean / thenable", () => {
    const current = { data: [{ _id: "listing-1", rent: 10000 }] }

    expect(
      updateDeep(
        current,
        () => {
          throw new Error("match failed")
        },
        bumpRent,
      ),
    ).toBe(current)
    expect(updateDeep(current, (() => 1) as never, bumpRent)).toBe(current)
    expect(
      updateDeep(current, (() => Promise.resolve(true)) as never, bumpRent),
    ).toBe(current)
  })

  it("keeps the previous node when updater throws or returns unsafe values", () => {
    const current = { data: [{ _id: "listing-1", rent: 10000 }] }

    expect(
      updateDeep(current, byId("listing-1"), () => {
        throw new Error("update failed")
      }),
    ).toBe(current)
    expect(
      updateDeep(current, byId("listing-1"), (() => null) as never),
    ).toBe(current)
    expect(
      updateDeep(
        current,
        byId("listing-1"),
        (() => Promise.resolve({ _id: "listing-1" })) as never,
      ),
    ).toBe(current)
    expect(
      updateDeep(current, byId("listing-1"), (() => new Date()) as never),
    ).toBe(current)
  })

  it("skips a failed updater on one match and still updates later matches", () => {
    let calls = 0
    const current = {
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-1", rent: 15000 },
      ],
    }

    expect(
      updateDeep(current, byId("listing-1"), (entity) => {
        calls += 1
        if (calls === 1) return null as never
        return { ...entity, rent: 99999 }
      }),
    ).toEqual({
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-1", rent: 99999 },
      ],
    })
  })

  it("never mutates frozen inputs", () => {
    const row = Object.freeze({ _id: "listing-1", rent: 10000 })
    const current = Object.freeze({
      data: Object.freeze([row]) as unknown as Record<string, unknown>[],
    })

    const next = updateDeep(current, byId("listing-1"), bumpRent) as {
      data: Record<string, unknown>[]
    }

    expect(next.data[0]).toEqual({ _id: "listing-1", rent: 11000 })
    expect(row.rent).toBe(10000)
  })

  it("leaves current unchanged when a nested array cannot be inspected safely", () => {
    const data = new Proxy([{ _id: "listing-1", rent: 10000 }], {
      get(target, prop, receiver) {
        if (prop === "length") throw new Error("length failed")
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = { data }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toBe(current)
  })

  it("leaves current unchanged when index access throws mid-scan", () => {
    const data = new Proxy(
      [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
      ],
      {
        get(target, prop, receiver) {
          if (prop === "1") throw new Error("index failed")
          return Reflect.get(target, prop, receiver)
        },
      },
    )
    const current = { data }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toBe(current)
  })

  it("leaves current unchanged when entries enumeration throws", () => {
    const hostile = new Proxy(
      { _id: "listing-1", rent: 10000 },
      {
        ownKeys() {
          throw new Error("ownKeys failed")
        },
        getPrototypeOf() {
          return Object.prototype
        },
      },
    )
    const current = { data: [hostile] }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toBe(current)
  })

  it("aborts atomically when a later branch fails after an earlier match", () => {
    const laterHostile = new Proxy(
      { _id: "listing-2", rent: 20000 },
      {
        ownKeys() {
          throw new Error("later branch failed")
        },
        getPrototypeOf() {
          return Object.prototype
        },
      },
    )
    const current = {
      first: { _id: "listing-1", rent: 10000 },
      second: laterHostile,
    }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toBe(current)
  })

  it("handles revoked proxies without throwing", () => {
    const revoked = Proxy.revocable({ data: [{ _id: "listing-1" }] }, {})
    revoked.revoke()

    expect(() =>
      updateDeep(revoked.proxy, byId("listing-1"), bumpRent),
    ).not.toThrow()
    expect(updateDeep(revoked.proxy, byId("listing-1"), bumpRent)).toBe(
      revoked.proxy,
    )
  })

  it("updates matches inside a top-level array cache value", () => {
    const current = [
      { _id: "listing-1", rent: 10000 },
      { _id: "listing-2", rent: 20000 },
    ]

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toEqual([
      { _id: "listing-1", rent: 11000 },
      { _id: "listing-2", rent: 20000 },
    ])
  })

  it("does not skip non-record entries mixed into arrays", () => {
    const date = new Date("2026-01-01")
    const current = {
      data: [null, "x", { _id: "listing-1", rent: 10000 }, 42, date],
    }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toEqual({
      data: [null, "x", { _id: "listing-1", rent: 11000 }, 42, date],
    })
  })

  it("does not pollute prototypes when payloads carry own __proto__ keys", () => {
    const current = JSON.parse(
      '{"__proto__": {"row": {"_id": "listing-1", "rent": 10000}}, "safe": true}',
    ) as Record<string, unknown>

    const next = updateDeep(current, byId("listing-1"), bumpRent) as Record<
      string,
      unknown
    >

    expect(next).not.toBe(current)
    expect(Object.getPrototypeOf(next)).toBe(Object.prototype)
    expect(
      (Object.getOwnPropertyDescriptor(next, "__proto__")?.value as {
        row: unknown
      }).row,
    ).toEqual({ _id: "listing-1", rent: 11000 })
    // Global prototype must never gain properties from the payload.
    expect(({} as { row?: unknown }).row).toBeUndefined()
  })

  it("preserves symbol-keyed properties when copying a record", () => {
    const marker = Symbol("marker")
    const current = {
      [marker]: "kept",
      row: { _id: "listing-1", rent: 10000 },
    }

    const next = updateDeep(current, byId("listing-1"), bumpRent) as Record<
      string | symbol,
      unknown
    >

    expect(next[marker]).toBe("kept")
    expect(next.row).toEqual({ _id: "listing-1", rent: 11000 })
  })

  it("handles sparse array holes without failing", () => {
    const data: Record<string, unknown>[] = []
    data[0] = { _id: "listing-1", rent: 10000 }
    data[2] = { _id: "listing-2", rent: 20000 }
    const current = { data }

    const next = updateDeep(current, byId("listing-1"), bumpRent) as {
      data: Record<string, unknown>[]
    }

    expect(next.data[0]).toEqual({ _id: "listing-1", rent: 11000 })
    expect(next.data[1]).toBeUndefined()
    expect(next.data[2]).toEqual({ _id: "listing-2", rent: 20000 })
  })

  it.each([
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    1.5,
    -1,
  ])("leaves current unchanged for unusable nested array length: %s", (length) => {
    const data = new Proxy([{ _id: "listing-1", rent: 10000 }], {
      get(target, prop, receiver) {
        if (prop === "length") return length
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = { data }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toBe(current)
  })

  it("leaves current unchanged when slice throws during copy-on-write", () => {
    const data = new Proxy(
      [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
      ],
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
    const current = { data }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toBe(current)
  })

  it("leaves current unchanged when push throws after copy-on-write starts", () => {
    const data = new Proxy(
      [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
      ],
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

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toBe(current)
  })

  it("leaves current unchanged when a record property getter throws", () => {
    const hostile: Record<string, unknown> = { _id: "other" }
    Object.defineProperty(hostile, "child", {
      enumerable: true,
      get() {
        throw new Error("getter failed")
      },
    })
    const current = {
      first: { _id: "listing-1", rent: 10000 },
      second: hostile,
    }

    expect(updateDeep(current, byId("listing-1"), bumpRent)).toBe(current)
  })

  it("patches at the maximum supported depth and aborts just past it", () => {
    const buildChain = (wrapperCount: number) => {
      let node: Record<string, unknown> = { _id: "listing-1", rent: 10000 }
      for (let index = 0; index < wrapperCount; index += 1) {
        node = { child: node }
      }
      return node
    }

    const atLimit = buildChain(64)
    const next = updateDeep(atLimit, byId("listing-1"), bumpRent)
    expect(next).not.toBe(atLimit)

    const pastLimit = buildChain(65)
    expect(updateDeep(pastLimit, byId("listing-1"), bumpRent)).toBe(pastLimit)
  })

  it("gives each occurrence of a shared reference its own patched object", () => {
    const shared = { _id: "listing-1", rent: 10000 }
    const current = { a: shared, b: shared }

    const next = updateDeep(current, byId("listing-1"), bumpRent) as {
      a: Record<string, unknown>
      b: Record<string, unknown>
    }

    expect(next.a).toEqual({ _id: "listing-1", rent: 11000 })
    expect(next.b).toEqual({ _id: "listing-1", rent: 11000 })
    expect(next.a).not.toBe(shared)
    expect(next.b).not.toBe(shared)
  })

  it("passes only plain records to the matcher", () => {
    const seen: unknown[] = []
    const row = { _id: "listing-1", rent: 1 }
    const nested = { flag: true }
    const current = {
      data: [null, "x", 42, new Date(), row],
      nested,
    }

    updateDeep(
      current,
      (value) => {
        seen.push(value)
        return false
      },
      bumpRent,
    )

    expect(seen).toEqual([current, row, nested])
  })

  it("supports infinite-list shapes with nested item arrays", () => {
    const current = {
      pageParams: [1],
      pages: [
        {
          success: true,
          data: {
            myReview: { _id: "review-1", rating: 5 },
            reviews: [
              { _id: "review-1", rating: 5 },
              { _id: "review-2", rating: 3 },
            ],
          },
          pagination: { total: 2 },
        },
      ],
    }

    const next = updateDeep(current, byId("review-1"), (entity) => ({
      ...entity,
      rating: 4,
    }))

    expect(next).toEqual({
      pageParams: [1],
      pages: [
        {
          success: true,
          data: {
            myReview: { _id: "review-1", rating: 4 },
            reviews: [
              { _id: "review-1", rating: 4 },
              { _id: "review-2", rating: 3 },
            ],
          },
          pagination: { total: 2 },
        },
      ],
    })
  })
})

describe("updateDeepInQueries", () => {
  it("patches matching records nested anywhere under the key prefixes", () => {
    const queryClient = new QueryClient()
    const listKey = ["listing", "owner", "ACTIVE"] as const
    const nestedKey = ["saved-listing", "me"] as const
    const untouchedKey = ["profile", "detail"] as const

    queryClient.setQueryData(listKey, {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: { total: 1 },
    })
    queryClient.setQueryData(nestedKey, {
      data: {
        savedListings: [
          { listingId: "listing-1", listing: { _id: "listing-1", rent: 10000 } },
        ],
      },
    })
    const untouched = { _id: "profile-1" }
    queryClient.setQueryData(untouchedKey, untouched)

    updateDeepInQueries(
      queryClient,
      [["listing"], ["saved-listing"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(listKey)).toEqual({
      data: [{ _id: "listing-1", rent: 11000 }],
      pagination: { total: 1 },
    })
    expect(queryClient.getQueryData(nestedKey)).toEqual({
      data: {
        savedListings: [
          { listingId: "listing-1", listing: { _id: "listing-1", rent: 11000 } },
        ],
      },
    })
    expect(queryClient.getQueryData(untouchedKey)).toBe(untouched)
  })

  it("keeps the same reference when nothing matches", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "absent"] as const
    const current = { data: [{ _id: "listing-2", rent: 20000 }] }
    queryClient.setQueryData(key, current)

    updateDeepInQueries(queryClient, [["listing"]], byId("listing-1"), bumpRent)

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("dedupes overlapping key prefixes to a single write", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "owner", "ACTIVE"] as const
    queryClient.setQueryData(key, {
      data: [{ _id: "listing-1", rent: 10000 }],
    })

    const setQueryData = vi.spyOn(queryClient, "setQueryData")

    updateDeepInQueries(
      queryClient,
      [["listing"], ["listing", "owner"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(setQueryData).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(key)).toEqual({
      data: [{ _id: "listing-1", rent: 11000 }],
    })
  })

  it("is a no-op for invalid matcher, updater, client, or keys", () => {
    const queryClient = new QueryClient()
    const key = ["listing"] as const
    const current = { data: [{ _id: "listing-1", rent: 10000 }] }
    queryClient.setQueryData(key, current)

    expect(() =>
      updateDeepInQueries(queryClient, [["listing"]], null as never, bumpRent),
    ).not.toThrow()
    expect(() =>
      updateDeepInQueries(
        queryClient,
        [["listing"]],
        byId("listing-1"),
        null as never,
      ),
    ).not.toThrow()
    expect(queryClient.getQueryData(key)).toBe(current)

    expect(() =>
      updateDeepInQueries(
        null as never,
        [["listing"]],
        byId("listing-1"),
        bumpRent,
      ),
    ).not.toThrow()
    expect(() =>
      updateDeepInQueries(
        queryClient,
        null as never,
        byId("listing-1"),
        bumpRent,
      ),
    ).not.toThrow()
  })

  it("continues updating other queries when one setQueryData throws", () => {
    const goodKey = ["listing", "good"] as const
    const badKey = ["listing", "bad"] as const
    const store = new Map<string, unknown>([
      [JSON.stringify(goodKey), { data: [{ _id: "listing-1", rent: 10000 }] }],
      [JSON.stringify(badKey), { data: [{ _id: "listing-1", rent: 10000 }] }],
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
      updateDeepInQueries(
        queryClient,
        [["listing"]],
        byId("listing-1"),
        bumpRent,
      ),
    ).not.toThrow()

    expect(store.get(JSON.stringify(goodKey))).toEqual({
      data: [{ _id: "listing-1", rent: 11000 }],
    })
  })

  it("skips queries with invalid query keys and never throws for malformed clients", () => {
    const validKey = ["listing", "valid"] as const
    const store = new Map<string, unknown>([
      [JSON.stringify(validKey), { data: [{ _id: "listing-1", rent: 10000 }] }],
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
      updateDeepInQueries(
        queryClient,
        [["listing"]],
        byId("listing-1"),
        bumpRent,
      ),
    ).not.toThrow()
    expect(setQueryData).toHaveBeenCalledTimes(1)

    const throwingClient = {
      getQueryCache: () => ({
        findAll: () => {
          throw new Error("cache failed")
        },
      }),
      setQueryData: vi.fn(),
    } as unknown as QueryClient

    expect(() =>
      updateDeepInQueries(
        throwingClient,
        [["listing"]],
        byId("listing-1"),
        bumpRent,
      ),
    ).not.toThrow()
  })

  it("is a no-op when the cached query has no data yet", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "empty"] as const
    queryClient.setQueryData(key, undefined)

    updateDeepInQueries(queryClient, [["listing"]], byId("listing-1"), bumpRent)

    expect(queryClient.getQueryData(key)).toBeUndefined()
  })
})
