import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import {
  addToInfiniteList,
  addToInfiniteListInQueries,
} from "./addToInfiniteList"
import { isInfiniteListCollection } from "./shared"

const byId =
  (id: string) =>
  (value: Record<string, unknown>) =>
    value._id === id

describe("isInfiniteListCollection", () => {
  it("accepts flat-page, bare-page, mixed, and empty infinite lists", () => {
    expect(
      isInfiniteListCollection({
        pages: [{ data: [], pagination: { total: 0 } }],
        pageParams: [1],
      }),
    ).toBe(true)
    expect(isInfiniteListCollection({ pages: [[{ _id: "1" }]] })).toBe(true)
    expect(
      isInfiniteListCollection({
        pages: [{ data: [] }, [{ _id: "1" }]],
      }),
    ).toBe(true)
    expect(isInfiniteListCollection({ pages: [], pageParams: [] })).toBe(true)
  })

  it.each([
    undefined,
    null,
    true,
    1,
    "infinite",
    [],
    { data: [] },
    { pages: null },
    { pages: "bad" },
    { pages: [{}] },
    { pages: [{ data: null }] },
    { pages: [{ data: {} }] },
    { pages: [new Date()] },
    { pages: [{ pages: [], data: [] }] },
  ])("rejects malformed infinite-list shape: %s", (current) => {
    expect(isInfiniteListCollection(current)).toBe(false)
  })

  it("returns false for throwing and revoked page surfaces", () => {
    const throwing = new Proxy(
      { pages: [] },
      {
        get(target, prop, receiver) {
          if (prop === "pages") throw new Error("pages failed")
          return Reflect.get(target, prop, receiver)
        },
        getPrototypeOf() {
          return Object.prototype
        },
      },
    )
    const revoked = Proxy.revocable({ pages: [] }, {})
    revoked.revoke()

    expect(isInfiniteListCollection(throwing)).toBe(false)
    expect(isInfiniteListCollection(revoked.proxy)).toBe(false)
  })

  it.each([
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    1.5,
    -1,
  ])("rejects unusable pages length: %s", (length) => {
    const pages = new Proxy([], {
      get(target, prop, receiver) {
        if (prop === "length") return length
        return Reflect.get(target, prop, receiver)
      },
    })

    expect(isInfiniteListCollection({ pages, pageParams: [] })).toBe(false)
  })
})

describe("addToInfiniteList", () => {
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
    [],
    new Date(),
    new Map(),
    new Set(),
    { data: [{ _id: "listing-2" }] },
    { pages: null },
    { pages: "bad" },
    { pages: [{}] },
    { pages: [{ data: null }] },
    {
      pages: [{ data: { listings: [{ _id: "listing-2" }] } }],
      pageParams: [1],
    },
  ])("returns unsupported current unchanged: %s", (current) => {
    expect(
      addToInfiniteList(
        current,
        { _id: "listing-1" },
        byId("listing-1"),
      ),
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
    new Date(),
    new Map(),
    new Set(),
  ])("returns current unchanged for invalid item: %s", (item) => {
    const current = {
      pages: [{ data: [{ _id: "listing-2" }], pagination: { total: 1 } }],
      pageParams: [1],
    }

    expect(
      addToInfiniteList(current, item as never, byId("listing-1")),
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
      pages: [{ data: [{ _id: "listing-2" }], pagination: { total: 1 } }],
      pageParams: [1],
    }

    expect(
      addToInfiniteList(current, { _id: "listing-1" }, match as never),
    ).toBe(current)
  })

  it("prepends to the first flat page and bumps every finite global total", () => {
    const firstItems = [{ _id: "listing-2", rent: 20000 }]
    const secondItems = [{ _id: "listing-3", rent: 30000 }]
    const pageParams = [1, 2]
    const item = { _id: "listing-1", rent: 10000 }
    const current = {
      pages: [
        {
          success: true,
          data: firstItems,
          pagination: { page: 1, limit: 1, total: 2 },
        },
        {
          success: true,
          data: secondItems,
          pagination: { page: 2, limit: 1, total: 2 },
        },
      ],
      pageParams,
      meta: { source: "owner" },
    }

    const next = addToInfiniteList(current, item, byId("listing-1"))

    expect(next).toEqual({
      pages: [
        {
          success: true,
          data: [item, { _id: "listing-2", rent: 20000 }],
          pagination: { page: 1, limit: 1, total: 3 },
        },
        {
          success: true,
          data: [{ _id: "listing-3", rent: 30000 }],
          pagination: { page: 2, limit: 1, total: 3 },
        },
      ],
      pageParams,
      meta: { source: "owner" },
    })
    expect(next).not.toBe(current)
    expect(next.pages).not.toBe(current.pages)
    expect(next.pages[0].data[0]).toBe(item)
    expect(next.pages[1].data).toBe(secondItems)
    expect(next.pageParams).toBe(pageParams)
    expect(firstItems).toHaveLength(1)
  })

  it("prepends to the first bare-array page and preserves later pages", () => {
    const first = [{ _id: "listing-2" }]
    const second = [{ _id: "listing-3" }]
    const item = { _id: "listing-1" }
    const current = { pages: [first, second], pageParams: [1, 2] }

    const next = addToInfiniteList(current, item, byId("listing-1"))

    expect(next).toEqual({
      pages: [[item, { _id: "listing-2" }], second],
      pageParams: [1, 2],
    })
    expect(next.pages[0][0]).toBe(item)
    expect(next.pages[1]).toBe(second)
  })

  it("supports mixed flat and bare-array pages", () => {
    const second = [{ _id: "listing-3" }]
    const current = {
      pages: [
        { data: [{ _id: "listing-2" }], pagination: { total: 2 } },
        second,
      ],
      pageParams: [1, 2],
    }

    expect(
      addToInfiniteList(
        current,
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1" }, { _id: "listing-2" }],
          pagination: { total: 3 },
        },
        second,
      ],
      pageParams: [1, 2],
    })
  })

  it("does not synthesize page metadata when pages is empty", () => {
    const current = { pages: [], pageParams: [], meta: { source: "owner" } }

    expect(
      addToInfiniteList(
        current,
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).toBe(current)
  })

  it.each([
    {
      label: "first page",
      pages: [
        { data: [{ _id: "listing-1" }], pagination: { total: 2 } },
        { data: [{ _id: "listing-2" }], pagination: { total: 2 } },
      ],
    },
    {
      label: "later page",
      pages: [
        { data: [{ _id: "listing-2" }], pagination: { total: 2 } },
        { data: [{ _id: "listing-1" }], pagination: { total: 2 } },
      ],
    },
    {
      label: "later bare page",
      pages: [
        { data: [{ _id: "listing-2" }], pagination: { total: 2 } },
        [{ _id: "listing-1" }],
      ],
    },
  ])("returns the same reference for duplicate in $label", ({ pages }) => {
    const current = { pages, pageParams: [1, 2] }

    expect(
      addToInfiniteList(
        current,
        { _id: "listing-1", rent: 99999 },
        byId("listing-1"),
      ),
    ).toBe(current)
  })

  it("skips non-record entries while checking duplicates", () => {
    const date = new Date("2026-01-01")
    const current = {
      pages: [
        {
          data: [null, "x", 42, date, { _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(
      addToInfiniteList(
        current,
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).toEqual({
      pages: [
        {
          data: [
            { _id: "listing-1" },
            null,
            "x",
            42,
            date,
            { _id: "listing-2" },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
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
    "leaves unusable pagination.total unchanged: %j",
    (pagination, expectedPagination) => {
      const current = {
        pages: [{ data: [{ _id: "listing-2" }], pagination }],
        pageParams: [1],
      }

      const next = addToInfiniteList(
        current,
        { _id: "listing-1" },
        byId("listing-1"),
      )

      expect(next.pages[0].pagination).toEqual(expectedPagination)
      expect(next.pages[0].data).toEqual([
        { _id: "listing-1" },
        { _id: "listing-2" },
      ])
    },
  )

  it("preserves missing and non-record pagination", () => {
    const without = {
      pages: [{ data: [{ _id: "listing-2" }], success: true }],
      pageParams: [1],
    }
    expect(
      addToInfiniteList(without, { _id: "listing-1" }, byId("listing-1")),
    ).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1" }, { _id: "listing-2" }],
          success: true,
        },
      ],
      pageParams: [1],
    })

    const withNull = {
      pages: [{ data: [{ _id: "listing-2" }], pagination: null }],
      pageParams: [1],
    }
    expect(
      addToInfiniteList(withNull, { _id: "listing-1" }, byId("listing-1")),
    ).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1" }, { _id: "listing-2" }],
          pagination: null,
        },
      ],
      pageParams: [1],
    })
  })

  it("uses the item as-is without inventing an id", () => {
    const item = { _id: "temp-optimistic-1", title: "New" }
    const current = {
      pages: [{ data: [], pagination: { total: 0 } }],
      pageParams: [1],
    }

    const next = addToInfiniteList(
      current,
      item,
      byId("temp-optimistic-1"),
    )

    expect(next.pages[0].data[0]).toBe(item)
    expect(next.pages[0].data[0]).toEqual(item)
  })

  it("treats matcher throw, non-boolean, and thenable as no duplicate", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    const item = { _id: "listing-1" }

    expect(
      addToInfiniteList(current, item, () => {
        throw new Error("match failed")
      }),
    ).toEqual({
      pages: [
        {
          data: [item, { _id: "listing-2" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
    expect(
      addToInfiniteList(current, item, (() => 1) as never),
    ).not.toBe(current)
    expect(
      addToInfiniteList(
        current,
        item,
        (() => Promise.resolve(true)) as never,
      ),
    ).not.toBe(current)
  })

  it("does not mutate frozen input pages or rows", () => {
    const row = Object.freeze({ _id: "listing-2" })
    const pagination = Object.freeze({ total: 1 })
    const page = Object.freeze({
      data: Object.freeze([row]) as unknown as Record<string, unknown>[],
      pagination,
    })
    const current = Object.freeze({
      pages: Object.freeze([page]) as unknown as typeof page[],
      pageParams: Object.freeze([1]) as unknown as number[],
    })
    const item = Object.freeze({ _id: "listing-1" })

    const next = addToInfiniteList(current, item, byId("listing-1"))

    expect(next.pages[0]).toEqual({
      data: [item, row],
      pagination: { total: 2 },
    })
    expect(current.pages[0].data).toHaveLength(1)
    expect(pagination.total).toBe(1)
  })

  it("supports null-prototype item, pages, and collection records", () => {
    const item = Object.assign(Object.create(null), {
      _id: "listing-1",
    }) as Record<string, unknown>
    const page = Object.assign(Object.create(null), {
      data: [{ _id: "listing-2" }],
      pagination: Object.assign(Object.create(null), { total: 1 }),
    })
    const current = Object.assign(Object.create(null), {
      pages: [page],
      pageParams: [1],
    })

    const next = addToInfiniteList(current, item, byId("listing-1"))

    expect(next.pages[0].data[0]).toBe(item)
    expect(next.pages[0].pagination.total).toBe(2)
  })

  it("leaves current unchanged when page scanning fails", () => {
    const pages = new Proxy(
      [{ data: [{ _id: "listing-2" }], pagination: { total: 1 } }],
      {
        get(target, prop, receiver) {
          if (prop === "0") throw new Error("page failed")
          return Reflect.get(target, prop, receiver)
        },
      },
    )
    const current = { pages, pageParams: [1] }

    expect(
      addToInfiniteList(
        current,
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).toBe(current)
  })

  it("leaves current unchanged when page item scanning fails", () => {
    const data = new Proxy([{ _id: "listing-2" }], {
      get(target, prop, receiver) {
        if (prop === "0") throw new Error("item failed")
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = {
      pages: [{ data, pagination: { total: 1 } }],
      pageParams: [1],
    }

    expect(
      addToInfiniteList(
        current,
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).toBe(current)
  })

  it("leaves current unchanged when pages shape flips after the guard", () => {
    let reads = 0
    const current = new Proxy(
      {
        pages: [{ data: [{ _id: "listing-2" }] }],
        pageParams: [1],
      },
      {
        get(target, prop, receiver) {
          if (prop === "pages") {
            reads += 1
            return reads === 1 ? target.pages : null
          }
          return Reflect.get(target, prop, receiver)
        },
        getPrototypeOf() {
          return Object.prototype
        },
      },
    )

    expect(
      addToInfiniteList(
        current,
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).toBe(current)
  })

  it("still prepends when pagination.total access throws", () => {
    const pagination = new Proxy(
      { page: 1, total: 1 },
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
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination,
          success: true,
        },
      ],
      pageParams: [1],
    }

    const next = addToInfiniteList(
      current,
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(next).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1" }, { _id: "listing-2" }],
          pagination,
          success: true,
        },
      ],
      pageParams: [1],
    })
    expect(next).not.toBe(current)
  })

  it("leaves current unchanged when first-page prepend throws", () => {
    const data = new Proxy([{ _id: "listing-2" }] as Record<string, unknown>[], {
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
    })
    const current = {
      pages: [{ data, pagination: { total: 1 } }],
      pageParams: [1],
    }

    expect(
      addToInfiniteList(
        current,
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).toBe(current)
  })

  it("preserves later page object identity when totals do not change", () => {
    const laterPage = {
      data: [{ _id: "listing-3" }],
      pagination: { page: 2 },
    }
    const current = {
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { page: 1, total: 1 },
        },
        laterPage,
      ],
      pageParams: [1, 2],
    }

    const next = addToInfiniteList(
      current,
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(next.pages[1]).toBe(laterPage)
    expect(next.pages[0].pagination).toEqual({ page: 1, total: 2 })
  })

  it("handles revoked proxies without throwing", () => {
    const revoked = Proxy.revocable(
      {
        pages: [{ data: [{ _id: "listing-2" }] }],
        pageParams: [1],
      },
      {},
    )
    revoked.revoke()

    expect(() =>
      addToInfiniteList(
        revoked.proxy,
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).not.toThrow()
    expect(
      addToInfiniteList(
        revoked.proxy,
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).toBe(revoked.proxy)
  })

  it("prepends into an empty first page and bumps zero totals", () => {
    const current = {
      pages: [
        { data: [] as Record<string, unknown>[], pagination: { total: 0 } },
        { data: [] as Record<string, unknown>[], pagination: { total: 0 } },
      ],
      pageParams: [1, 2],
    }

    expect(
      addToInfiniteList(current, { _id: "listing-1" }, byId("listing-1")),
    ).toEqual({
      pages: [
        { data: [{ _id: "listing-1" }], pagination: { total: 1 } },
        { data: [], pagination: { total: 1 } },
      ],
      pageParams: [1, 2],
    })
  })

  it("bumps finite negative totals by +1", () => {
    const current = {
      pages: [{ data: [], pagination: { total: -2 } }],
      pageParams: [1],
    }

    expect(
      addToInfiniteList(current, { _id: "listing-1" }, byId("listing-1")),
    ).toEqual({
      pages: [{ data: [{ _id: "listing-1" }], pagination: { total: -1 } }],
      pageParams: [1],
    })
  })

  it("does not treat class instances as duplicate matches", () => {
    class Row {
      _id = "listing-1"
    }
    const instance = new Row()
    const current = {
      pages: [
        {
          data: [instance, { _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    const next = addToInfiniteList(
      current,
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(next).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1" }, instance, { _id: "listing-2" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
    expect(next.pages[0].data[1]).toBe(instance)
  })

  it("does not treat nested ids as duplicates", () => {
    const current = {
      pages: [
        {
          data: [{ nested: { _id: "listing-1" }, rent: 1 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(
      addToInfiniteList(current, { _id: "listing-1" }, byId("listing-1")),
    ).toEqual({
      pages: [
        {
          data: [
            { _id: "listing-1" },
            { nested: { _id: "listing-1" }, rent: 1 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
  })

  it("returns the same reference for duplicate in a first bare page", () => {
    const current = {
      pages: [[{ _id: "listing-1" }], [{ _id: "listing-2" }]],
      pageParams: [1, 2],
    }

    expect(
      addToInfiniteList(
        current,
        { _id: "listing-1", rent: 1 },
        byId("listing-1"),
      ),
    ).toBe(current)
  })

  it.each([
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    1.5,
    -1,
  ])("leaves current unchanged for unusable page item length: %s", (length) => {
    const data = new Proxy([{ _id: "listing-2" }], {
      get(target, prop, receiver) {
        if (prop === "length") return length
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = {
      pages: [{ data, pagination: { total: 1 } }],
      pageParams: [1],
    }

    expect(
      addToInfiniteList(current, { _id: "listing-1" }, byId("listing-1")),
    ).toBe(current)
  })

  it("leaves current unchanged when a later page cannot be inspected", () => {
    const laterData = new Proxy([{ _id: "listing-3" }], {
      get(target, prop, receiver) {
        if (prop === "0") throw new Error("later item failed")
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = {
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 2 },
        },
        {
          data: laterData,
          pagination: { total: 2 },
        },
      ],
      pageParams: [1, 2],
    }

    expect(
      addToInfiniteList(current, { _id: "listing-1" }, byId("listing-1")),
    ).toBe(current)
  })

  it("leaves matcher false / string / object results as no duplicate", () => {
    const current = {
      pages: [{ data: [{ _id: "listing-2" }], pagination: { total: 1 } }],
      pageParams: [1],
    }
    const item = { _id: "listing-1" }

    expect(
      addToInfiniteList(current, item, (() => false) as never),
    ).toEqual({
      pages: [
        { data: [item, { _id: "listing-2" }], pagination: { total: 2 } },
      ],
      pageParams: [1],
    })
    expect(
      addToInfiniteList(current, item, (() => "yes") as never),
    ).toEqual({
      pages: [
        { data: [item, { _id: "listing-2" }], pagination: { total: 2 } },
      ],
      pageParams: [1],
    })
    expect(
      addToInfiniteList(current, item, (() => ({}) as never)),
    ).toEqual({
      pages: [
        { data: [item, { _id: "listing-2" }], pagination: { total: 2 } },
      ],
      pageParams: [1],
    })
  })
})

describe("addToInfiniteListInQueries", () => {
  it("updates matching infinite-list queries under a key prefix", () => {
    const queryClient = new QueryClient()
    const firstKey = ["listing", "infinite", "ACTIVE"] as const
    const secondKey = ["listing", "infinite", "PENDING"] as const
    const flatKey = ["listing", "flat"] as const
    const item = { _id: "listing-1" }

    queryClient.setQueryData(firstKey, {
      pages: [
        { data: [{ _id: "listing-2" }], pagination: { total: 1 } },
      ],
      pageParams: [1],
    })
    queryClient.setQueryData(secondKey, {
      pages: [
        { data: [{ _id: "listing-3" }], pagination: { total: 1 } },
      ],
      pageParams: [1],
    })
    const flat = {
      data: [{ _id: "listing-4" }],
      pagination: { total: 1 },
    }
    queryClient.setQueryData(flatKey, flat)

    addToInfiniteListInQueries(
      queryClient,
      [["listing", "infinite"]],
      item,
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(firstKey)).toEqual({
      pages: [
        {
          data: [item, { _id: "listing-2" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
    expect(queryClient.getQueryData(secondKey)).toEqual({
      pages: [
        {
          data: [item, { _id: "listing-3" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
    expect(queryClient.getQueryData(flatKey)).toBe(flat)
  })

  it("keeps duplicate and empty-page caches unchanged", () => {
    const queryClient = new QueryClient()
    const duplicateKey = ["listing", "duplicate"] as const
    const emptyKey = ["listing", "empty"] as const
    const duplicate = {
      pages: [
        { data: [{ _id: "listing-1" }], pagination: { total: 1 } },
      ],
      pageParams: [1],
    }
    const empty = { pages: [], pageParams: [] }
    queryClient.setQueryData(duplicateKey, duplicate)
    queryClient.setQueryData(emptyKey, empty)

    addToInfiniteListInQueries(
      queryClient,
      [["listing"]],
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(duplicateKey)).toBe(duplicate)
    expect(queryClient.getQueryData(emptyKey)).toBe(empty)
  })

  it("is a no-op for invalid item, matcher, client, or keys", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "infinite"] as const
    const current = {
      pages: [{ data: [{ _id: "listing-2" }] }],
      pageParams: [1],
    }
    queryClient.setQueryData(key, current)

    addToInfiniteListInQueries(
      queryClient,
      [["listing"]],
      null as never,
      byId("listing-1"),
    )
    addToInfiniteListInQueries(
      queryClient,
      [["listing"]],
      { _id: "listing-1" },
      null as never,
    )
    addToInfiniteListInQueries(
      null as never,
      [["listing"]],
      { _id: "listing-1" },
      byId("listing-1"),
    )
    addToInfiniteListInQueries(
      queryClient,
      null as never,
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("dedupes overlapping key prefixes", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "infinite"] as const
    queryClient.setQueryData(key, {
      pages: [
        { data: [{ _id: "listing-2" }], pagination: { total: 1 } },
      ],
      pageParams: [1],
    })

    addToInfiniteListInQueries(
      queryClient,
      [["listing"], ["listing", "infinite"]],
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(key)).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1" }, { _id: "listing-2" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
  })

  it("continues when one setQueryData call throws", () => {
    const firstKey = ["listing", "a"] as const
    const secondKey = ["listing", "b"] as const
    const store = new Map<string, unknown>([
      [
        JSON.stringify(firstKey),
        { pages: [{ data: [{ _id: "listing-2" }] }], pageParams: [1] },
      ],
      [
        JSON.stringify(secondKey),
        { pages: [{ data: [{ _id: "listing-3" }] }], pageParams: [1] },
      ],
    ])
    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [
          { queryHash: "a", queryKey: firstKey },
          { queryHash: "b", queryKey: secondKey },
        ],
      }),
      setQueryData: (key: unknown, updater: (value: unknown) => unknown) => {
        const hash = JSON.stringify(key)
        if (hash === JSON.stringify(firstKey)) throw new Error("set failed")
        store.set(hash, updater(store.get(hash)))
      },
    } as unknown as QueryClient

    expect(() =>
      addToInfiniteListInQueries(
        queryClient,
        [["listing"]],
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).not.toThrow()

    expect(store.get(JSON.stringify(firstKey))).toEqual({
      pages: [{ data: [{ _id: "listing-2" }] }],
      pageParams: [1],
    })
    expect(store.get(JSON.stringify(secondKey))).toEqual({
      pages: [
        { data: [{ _id: "listing-1" }, { _id: "listing-3" }] },
      ],
      pageParams: [1],
    })
  })

  it("skips invalid query keys and malformed clients", () => {
    const validKey = ["listing", "valid"] as const
    const store = new Map<string, unknown>([
      [
        JSON.stringify(validKey),
        { pages: [{ data: [{ _id: "listing-2" }] }], pageParams: [1] },
      ],
    ])
    const setQueryData = vi.fn(
      (key: unknown, updater: (value: unknown) => unknown) => {
        store.set(JSON.stringify(key), updater(store.get(JSON.stringify(key))))
      },
    )
    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [
          { queryHash: "bad", queryKey: "not-an-array" },
          { queryHash: "valid", queryKey: validKey },
        ],
      }),
      setQueryData,
    } as unknown as QueryClient

    expect(() =>
      addToInfiniteListInQueries(
        queryClient,
        [["listing"]],
        { _id: "listing-1" },
        byId("listing-1"),
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
      addToInfiniteListInQueries(
        throwingClient,
        [["listing"]],
        { _id: "listing-1" },
        byId("listing-1"),
      ),
    ).not.toThrow()
  })

  it("updates bare-array infinite caches under the prefix", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "bare-infinite"] as const
    queryClient.setQueryData(key, {
      pages: [[{ _id: "listing-2" }], [{ _id: "listing-3" }]],
      pageParams: [1, 2],
    })

    addToInfiniteListInQueries(
      queryClient,
      [["listing"]],
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(key)).toEqual({
      pages: [
        [{ _id: "listing-1" }, { _id: "listing-2" }],
        [{ _id: "listing-3" }],
      ],
      pageParams: [1, 2],
    })
  })

  it("only inserts into caches that do not already contain the match", () => {
    const queryClient = new QueryClient()
    const withMatch = ["listing", "with"] as const
    const withoutMatch = ["listing", "without"] as const
    const untouched = {
      pages: [
        { data: [{ _id: "listing-1" }], pagination: { total: 1 } },
      ],
      pageParams: [1],
    }

    queryClient.setQueryData(withMatch, untouched)
    queryClient.setQueryData(withoutMatch, {
      pages: [
        { data: [{ _id: "listing-2" }], pagination: { total: 1 } },
      ],
      pageParams: [1],
    })

    addToInfiniteListInQueries(
      queryClient,
      [["listing"]],
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(withMatch)).toBe(untouched)
    expect(queryClient.getQueryData(withoutMatch)).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1" }, { _id: "listing-2" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
  })

  it("does not modify detail or wrong-shaped caches under the same prefix", () => {
    const queryClient = new QueryClient()
    const detailKey = ["listing", "detail"] as const
    const wrongShapeKey = ["listing", "items-shape"] as const
    const detail = { _id: "listing-1", rent: 10000 }
    const wrongShape = { items: [{ _id: "listing-2" }] }

    queryClient.setQueryData(detailKey, detail)
    queryClient.setQueryData(wrongShapeKey, wrongShape)

    addToInfiniteListInQueries(
      queryClient,
      [["listing"]],
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(detailKey)).toBe(detail)
    expect(queryClient.getQueryData(wrongShapeKey)).toBe(wrongShape)
  })

  it("is a no-op when the cached query has no data yet", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "empty-data"] as const
    queryClient.setQueryData(key, undefined)

    addToInfiniteListInQueries(
      queryClient,
      [["listing"]],
      { _id: "listing-1" },
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(key)).toBeUndefined()
  })
})
