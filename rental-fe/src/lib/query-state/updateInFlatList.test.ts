import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import {
  updateInFlatList,
  updateInFlatListInQueries,
} from "./updateInFlatList"

const byId =
  (id: string) =>
  (value: Record<string, unknown>) =>
    value._id === id

const bumpRent = (entity: Record<string, unknown>) => ({
  ...entity,
  rent: Number(entity.rent ?? 0) + 1000,
})

describe("updateInFlatList", () => {
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
    { items: [{ _id: "listing-1", rent: 1 }] },
    { pagination: { total: 1 } },
    { data: "not-array" },
    { data: null },
    { data: { _id: "listing-1", rent: 1 } },
    {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 1 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    },
    {
      data: [{ _id: "listing-1", rent: 1 }],
      pages: [{ data: [{ _id: "listing-1", rent: 1 }] }],
      pageParams: [1],
    },
  ])("returns unsupported current unchanged: %s", (current) => {
    expect(
      updateInFlatList(current, byId("listing-1"), bumpRent),
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
    "match",
    [],
    {},
  ])("returns current unchanged for invalid matcher: %s", (match) => {
    const current = {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: { total: 1 },
    }
    expect(updateInFlatList(current, match as never, bumpRent)).toBe(current)
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
    const current = {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: { total: 1 },
    }
    expect(
      updateInFlatList(current, byId("listing-1"), update as never),
    ).toBe(current)
  })

  it.each([
    {
      label: "first",
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
        { _id: "listing-3", rent: 30000 },
      ],
      matchId: "listing-1",
      expected: [
        { _id: "listing-1", rent: 11000 },
        { _id: "listing-2", rent: 20000 },
        { _id: "listing-3", rent: 30000 },
      ],
    },
    {
      label: "middle",
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
        { _id: "listing-3", rent: 30000 },
      ],
      matchId: "listing-2",
      expected: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 21000 },
        { _id: "listing-3", rent: 30000 },
      ],
    },
    {
      label: "last",
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
        { _id: "listing-3", rent: 30000 },
      ],
      matchId: "listing-3",
      expected: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
        { _id: "listing-3", rent: 31000 },
      ],
    },
  ])("updates a matching item in $label position", ({ data, matchId, expected }) => {
    const current = { data, pagination: { total: 3 } }
    expect(updateInFlatList(current, byId(matchId), bumpRent)).toEqual({
      data: expected,
      pagination: { total: 3 },
    })
  })

  it("updates a matching item and leaves pagination untouched", () => {
    const current = {
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { page: 1, limit: 20, total: 2 },
      success: true,
    }

    const next = updateInFlatList(current, byId("listing-1"), bumpRent)

    expect(next).toEqual({
      data: [
        { _id: "listing-1", rent: 11000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { page: 1, limit: 20, total: 2 },
      success: true,
    })
    expect(next).not.toBe(current)
    expect(next.pagination).toBe(current.pagination)
    expect(current.data[0]).toEqual({ _id: "listing-1", rent: 10000 })
  })

  it("updates items in a bare array without inventing wrapper fields", () => {
    const current = [
      { _id: "listing-1", rent: 10000 },
      { _id: "listing-2", rent: 20000 },
    ]

    expect(updateInFlatList(current, byId("listing-1"), bumpRent)).toEqual([
      { _id: "listing-1", rent: 11000 },
      { _id: "listing-2", rent: 20000 },
    ])
    expect(current[0]).toEqual({ _id: "listing-1", rent: 10000 })
  })

  it("returns the same reference when nothing matches", () => {
    const current = {
      data: [{ _id: "listing-2", rent: 20000 }],
      pagination: { total: 1 },
    }
    const bare = [{ _id: "listing-2", rent: 20000 }]
    const empty: Record<string, unknown>[] = []

    expect(updateInFlatList(current, byId("listing-1"), bumpRent)).toBe(current)
    expect(updateInFlatList(bare, byId("listing-1"), bumpRent)).toBe(bare)
    expect(updateInFlatList(empty, byId("listing-1"), bumpRent)).toBe(empty)
  })

  it("updates every matching record", () => {
    const current = {
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
        { _id: "listing-1", rent: 15000 },
      ],
      pagination: { total: 3 },
    }

    expect(updateInFlatList(current, byId("listing-1"), bumpRent)).toEqual({
      data: [
        { _id: "listing-1", rent: 11000 },
        { _id: "listing-2", rent: 20000 },
        { _id: "listing-1", rent: 16000 },
      ],
      pagination: { total: 3 },
    })
  })

  it("returns the same reference when updater returns the same object", () => {
    const current = {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: { total: 1 },
    }

    expect(
      updateInFlatList(current, byId("listing-1"), (entity) => entity),
    ).toBe(current)
  })

  it("leaves the matched item unchanged when updater returns a non-record", () => {
    const current = {
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { total: 2 },
    }

    expect(
      updateInFlatList(current, byId("listing-1"), (() => null) as never),
    ).toBe(current)
    expect(
      updateInFlatList(current, byId("listing-1"), (() => [
        { _id: "listing-1" },
      ]) as never),
    ).toBe(current)
    expect(
      updateInFlatList(current, byId("listing-1"), (() => "x") as never),
    ).toBe(current)
  })

  it("skips a failed updater for one match and still updates later matches", () => {
    let calls = 0
    const current = {
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-1", rent: 15000 },
      ],
      pagination: { total: 2 },
    }

    const next = updateInFlatList(current, byId("listing-1"), (entity) => {
      calls += 1
      if (calls === 1) return null as never
      return { ...entity, rent: 99999 }
    })

    expect(next).toEqual({
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-1", rent: 99999 },
      ],
      pagination: { total: 2 },
    })
  })

  it("keeps non-record entries and only updates matching records", () => {
    const date = new Date("2026-01-01")
    const current = {
      data: [null, "x", { _id: "listing-1", rent: 10000 }, 42, date],
      pagination: { total: 1 },
    }

    expect(updateInFlatList(current, byId("listing-1"), bumpRent)).toEqual({
      data: [null, "x", { _id: "listing-1", rent: 11000 }, 42, date],
      pagination: { total: 1 },
    })
  })

  it("does not treat class instances as updatable records", () => {
    class Row {
      _id = "listing-1"
      rent = 10000
    }
    const instance = new Row()
    const current = {
      data: [instance, { _id: "listing-2", rent: 20000 }],
      pagination: { total: 2 },
    }

    expect(updateInFlatList(current, byId("listing-1"), bumpRent)).toBe(current)
  })

  it("supports null-prototype records for collection rows", () => {
    const row = Object.assign(Object.create(null), {
      _id: "listing-1",
      rent: 10000,
    }) as Record<string, unknown>
    const other = Object.assign(Object.create(null), {
      _id: "listing-2",
      rent: 20000,
    }) as Record<string, unknown>
    const current = Object.assign(Object.create(null), {
      data: [row, other],
      pagination: { total: 2 },
    }) as {
      data: Record<string, unknown>[]
      pagination: Record<string, unknown>
    }

    const next = updateInFlatList(current, byId("listing-1"), (entity) =>
      Object.assign(Object.create(null), entity, { rent: 11000 }),
    )

    expect(next.data[0]).toMatchObject({ _id: "listing-1", rent: 11000 })
    expect(next.data[1]).toBe(other)
    expect(Object.getPrototypeOf(next.data[0])).toBeNull()
  })

  it("leaves current unchanged when matcher throw / non-boolean / thenable", () => {
    const current = {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: { total: 1 },
    }

    expect(
      updateInFlatList(
        current,
        () => {
          throw new Error("match failed")
        },
        bumpRent,
      ),
    ).toBe(current)

    expect(
      updateInFlatList(current, (() => 1) as never, bumpRent),
    ).toBe(current)
    expect(
      updateInFlatList(current, (() => "yes") as never, bumpRent),
    ).toBe(current)
    expect(
      updateInFlatList(current, (() => ({}) as never), bumpRent),
    ).toBe(current)
    expect(
      updateInFlatList(current, (() => false) as never, bumpRent),
    ).toBe(current)
    expect(
      updateInFlatList(current, (() => Promise.resolve(true)) as never, bumpRent),
    ).toBe(current)
  })

  it("leaves current unchanged when updater throws or returns a thenable", () => {
    const current = {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: { total: 1 },
    }

    expect(
      updateInFlatList(current, byId("listing-1"), () => {
        throw new Error("update failed")
      }),
    ).toBe(current)

    expect(
      updateInFlatList(
        current,
        byId("listing-1"),
        (() => Promise.resolve({ _id: "listing-1", rent: 1 })) as never,
      ),
    ).toBe(current)
  })

  it("never mutates frozen list / pagination inputs", () => {
    const row1 = Object.freeze({ _id: "listing-1", rent: 10000 })
    const row2 = Object.freeze({ _id: "listing-2", rent: 20000 })
    const pagination = Object.freeze({ page: 1, total: 2 })
    const current = Object.freeze({
      data: Object.freeze([row1, row2]) as unknown as Record<string, unknown>[],
      pagination,
    })

    const next = updateInFlatList(current, byId("listing-1"), bumpRent)

    expect(next).toEqual({
      data: [
        { _id: "listing-1", rent: 11000 },
        row2,
      ],
      pagination,
    })
    expect(current.data[0]).toEqual({ _id: "listing-1", rent: 10000 })
    expect(pagination.total).toBe(2)
  })

  it("leaves current unchanged when the list cannot be inspected safely", () => {
    const throwingList = {
      data: new Proxy(
        [{ _id: "listing-1", rent: 10000 }] as Record<string, unknown>[],
        {
          get(target, prop, receiver) {
            if (prop === "length") throw new Error("cannot read length")
            return Reflect.get(target, prop, receiver)
          },
        },
      ),
      pagination: { total: 1 },
    }

    expect(
      updateInFlatList(throwingList, byId("listing-1"), bumpRent),
    ).toBe(throwingList)
  })

  it.each([
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    1.5,
    -1,
  ])("leaves current unchanged for unusable array length: %s", (length) => {
    const data = new Proxy(
      [{ _id: "listing-1", rent: 10000 }] as Record<string, unknown>[],
      {
        get(target, prop, receiver) {
          if (prop === "length") return length
          return Reflect.get(target, prop, receiver)
        },
      },
    )
    const current = { data, pagination: { total: 1 } }

    expect(
      updateInFlatList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("leaves current unchanged when index access throws mid-scan", () => {
    const data = [
      { _id: "listing-1", rent: 10000 },
      { _id: "listing-2", rent: 20000 },
    ]
    const throwingData = new Proxy(data, {
      get(target, prop, receiver) {
        if (prop === "1") throw new Error("index failed")
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = { data: throwingData, pagination: { total: 2 } }

    expect(
      updateInFlatList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("leaves current unchanged when slice throws during copy-on-write", () => {
    const data = [
      { _id: "listing-1", rent: 10000 },
      { _id: "listing-2", rent: 20000 },
    ]
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

    expect(
      updateInFlatList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("leaves current unchanged when data shape flips after the flat-list guard", () => {
    let reads = 0
    const current = new Proxy(
      {
        data: [{ _id: "listing-1", rent: 10000 }],
        pagination: { total: 1 },
      },
      {
        get(target, prop, receiver) {
          if (prop === "data") {
            reads += 1
            return reads === 1 ? target.data : null
          }
          return Reflect.get(target, prop, receiver)
        },
        getPrototypeOf() {
          return Object.prototype
        },
      },
    )

    expect(
      updateInFlatList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("handles revoked proxies without throwing", () => {
    const listProxy = Proxy.revocable(
      {
        data: [{ _id: "listing-1", rent: 10000 }],
        pagination: { total: 1 },
      },
      {},
    )
    listProxy.revoke()

    expect(() =>
      updateInFlatList(listProxy.proxy, byId("listing-1"), bumpRent),
    ).not.toThrow()
    expect(
      updateInFlatList(listProxy.proxy, byId("listing-1"), bumpRent),
    ).toBe(listProxy.proxy)
  })

  it("preserves extra top-level fields and remaining row identity", () => {
    const keep = { _id: "listing-2", rent: 20000 }
    const current = {
      success: true,
      meta: { source: "owner" },
      data: [{ _id: "listing-1", rent: 10000 }, keep],
      pagination: { total: 2, page: 1 },
    }

    const next = updateInFlatList(current, byId("listing-1"), bumpRent)

    expect(next).toEqual({
      success: true,
      meta: { source: "owner" },
      data: [{ _id: "listing-1", rent: 11000 }, keep],
      pagination: { total: 2, page: 1 },
    })
    expect(next.data[1]).toBe(keep)
    expect(next.pagination).toBe(current.pagination)
  })

  it("updates every record when matcher always matches", () => {
    const current = {
      data: [
        { _id: "a", rent: 1 },
        { _id: "b", rent: 2 },
      ],
      pagination: { total: 2 },
    }

    expect(updateInFlatList(current, () => true, bumpRent)).toEqual({
      data: [
        { _id: "a", rent: 1001 },
        { _id: "b", rent: 1002 },
      ],
      pagination: { total: 2 },
    })
  })

  it("updates a single-item bare array", () => {
    const current = [{ _id: "listing-1", rent: 10000 }]
    expect(updateInFlatList(current, byId("listing-1"), bumpRent)).toEqual([
      { _id: "listing-1", rent: 11000 },
    ])
  })

  it("preserves null / missing pagination by reference semantics", () => {
    const withNull = {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: null,
    }
    const nextNull = updateInFlatList(withNull, byId("listing-1"), bumpRent)
    expect(nextNull).toEqual({
      data: [{ _id: "listing-1", rent: 11000 }],
      pagination: null,
    })

    const without = {
      data: [{ _id: "listing-1", rent: 10000 }],
      success: true,
    }
    expect(updateInFlatList(without, byId("listing-1"), bumpRent)).toEqual({
      data: [{ _id: "listing-1", rent: 11000 }],
      success: true,
    })
  })

  it("does not match nested ids inside a list row", () => {
    const current = {
      data: [{ nested: { _id: "listing-1" }, rent: 10000 }],
      pagination: { total: 1 },
    }

    expect(
      updateInFlatList(current, byId("listing-1"), bumpRent),
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
    "entity",
    new Date(),
    new Map(),
    Promise.resolve({ _id: "listing-1", rent: 1 }),
  ])("ignores updater result that is not a plain record: %s", (result) => {
    const current = {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: { total: 1 },
    }

    expect(
      updateInFlatList(current, byId("listing-1"), (() => result) as never),
    ).toBe(current)
  })

  it("leaves current unchanged when push throws after copy-on-write starts", () => {
    const data = [
      { _id: "listing-1", rent: 10000 },
      { _id: "listing-2", rent: 20000 },
    ]
    const throwingData = new Proxy(data, {
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
    })
    const current = { data: throwingData, pagination: { total: 2 } }

    expect(
      updateInFlatList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("allows updater to replace the matched entity identity fields", () => {
    const current = {
      data: [{ _id: "listing-1", rent: 10000, title: "Old" }],
      pagination: { total: 1 },
    }

    expect(
      updateInFlatList(current, byId("listing-1"), () => ({
        _id: "listing-1",
        rent: 12000,
        title: "New",
        status: "ACTIVE",
      })),
    ).toEqual({
      data: [
        {
          _id: "listing-1",
          rent: 12000,
          title: "New",
          status: "ACTIVE",
        },
      ],
      pagination: { total: 1 },
    })
  })
})

describe("updateInFlatListInQueries", () => {
  it("updates matching flat list queries under a key prefix", () => {
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

    updateInFlatListInQueries(
      queryClient,
      [["listing", "owner"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(listKey)).toEqual({
      data: [
        { _id: "listing-1", rent: 11000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { total: 2 },
    })
    expect(queryClient.getQueryData(otherKey)).toEqual({
      data: [
        { _id: "listing-1", rent: 11000 },
        { _id: "listing-3", rent: 30000 },
      ],
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
    queryClient.setQueryData(key, [
      { _id: "listing-1", rent: 10000 },
      { _id: "listing-2", rent: 20000 },
    ])

    updateInFlatListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(key)).toEqual([
      { _id: "listing-1", rent: 11000 },
      { _id: "listing-2", rent: 20000 },
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
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    const detail = { _id: "listing-1", rent: 10000 }
    const wrongShape = { items: [{ _id: "listing-1", rent: 10000 }] }

    queryClient.setQueryData(infiniteKey, infinite)
    queryClient.setQueryData(detailKey, detail)
    queryClient.setQueryData(wrongShapeKey, wrongShape)

    updateInFlatListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )

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

    updateInFlatListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(key)).toBe(existing)
  })

  it("only updates lists that contain the match", () => {
    const queryClient = new QueryClient()
    const withMatch = ["listing", "with"] as const
    const withoutMatch = ["listing", "without"] as const
    const untouched = {
      data: [{ _id: "listing-2", rent: 20000 }],
      pagination: { total: 1 },
    }

    queryClient.setQueryData(withMatch, {
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { total: 2 },
    })
    queryClient.setQueryData(withoutMatch, untouched)

    updateInFlatListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(withMatch)).toEqual({
      data: [
        { _id: "listing-1", rent: 11000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { total: 2 },
    })
    expect(queryClient.getQueryData(withoutMatch)).toBe(untouched)
  })

  it("is a no-op for invalid matcher, updater, client, or keys", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "owner"] as const
    const current = {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: { total: 1 },
    }
    queryClient.setQueryData(key, current)

    updateInFlatListInQueries(
      queryClient,
      [["listing"]],
      null as never,
      bumpRent,
    )
    updateInFlatListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      null as never,
    )
    updateInFlatListInQueries(
      null as never,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )
    updateInFlatListInQueries(
      queryClient,
      null as never,
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("dedupes overlapping key prefixes to a single write", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "owner"] as const
    queryClient.setQueryData(key, {
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { total: 2 },
    })

    updateInFlatListInQueries(
      queryClient,
      [
        ["listing"],
        ["listing", "owner"],
      ],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(key)).toEqual({
      data: [
        { _id: "listing-1", rent: 11000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { total: 2 },
    })
  })

  it("continues updating other queries when one setQueryData throws", () => {
    const firstKey = ["listing", "a"] as const
    const secondKey = ["listing", "b"] as const
    const store = new Map<string, unknown>([
      [
        JSON.stringify(firstKey),
        {
          data: [
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-2", rent: 20000 },
          ],
          pagination: { total: 2 },
        },
      ],
      [
        JSON.stringify(secondKey),
        {
          data: [
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-3", rent: 30000 },
          ],
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
      updateInFlatListInQueries(
        queryClient,
        [["listing"]],
        byId("listing-1"),
        bumpRent,
      ),
    ).not.toThrow()

    expect(store.get(JSON.stringify(firstKey))).toEqual({
      data: [
        { _id: "listing-1", rent: 10000 },
        { _id: "listing-2", rent: 20000 },
      ],
      pagination: { total: 2 },
    })
    expect(store.get(JSON.stringify(secondKey))).toEqual({
      data: [
        { _id: "listing-1", rent: 11000 },
        { _id: "listing-3", rent: 30000 },
      ],
      pagination: { total: 2 },
    })
  })

  it("skips queries with invalid query keys and continues", () => {
    const validKey = ["listing", "valid"] as const
    const store = new Map<string, unknown>([
      [
        JSON.stringify(validKey),
        {
          data: [
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-2", rent: 20000 },
          ],
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
      updateInFlatListInQueries(
        queryClient,
        [["listing"]],
        byId("listing-1"),
        bumpRent,
      ),
    ).not.toThrow()

    expect(setQueryData).toHaveBeenCalledTimes(1)
    expect(store.get(JSON.stringify(validKey))).toEqual({
      data: [
        { _id: "listing-1", rent: 11000 },
        { _id: "listing-2", rent: 20000 },
      ],
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
      updateInFlatListInQueries(
        queryClient,
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

    updateInFlatListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(key)).toBeUndefined()
  })

  it("keeps the same reference when updater returns the same object in cache", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "owner"] as const
    const existing = {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: { total: 1 },
    }
    queryClient.setQueryData(key, existing)

    updateInFlatListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      (entity) => entity,
    )

    expect(queryClient.getQueryData(key)).toBe(existing)
  })
})
