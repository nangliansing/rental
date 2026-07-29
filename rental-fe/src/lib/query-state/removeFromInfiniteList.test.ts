import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import {
  removeFromInfiniteList,
  removeFromInfiniteListInQueries,
} from "./removeFromInfiniteList"

const byId =
  (id: string) =>
  (value: Record<string, unknown>) =>
    value._id === id

describe("removeFromInfiniteList", () => {
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
    { data: [{ _id: "listing-1" }] },
    { pages: null },
    { pages: "bad" },
    { pages: [{}] },
    { pages: [{ data: null }] },
    {
      pages: [{ data: { listings: [{ _id: "listing-1" }] } }],
      pageParams: [1],
    },
  ])("returns unsupported current unchanged: %s", (current) => {
    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
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
      pages: [
        { data: [{ _id: "listing-1" }], pagination: { total: 1 } },
      ],
      pageParams: [1],
    }
    expect(removeFromInfiniteList(current, match as never)).toBe(current)
  })

  it.each([
    {
      label: "first page",
      pages: [
        {
          data: [
            { _id: "listing-1" },
            { _id: "listing-2" },
          ],
          pagination: { total: 3 },
        },
        {
          data: [{ _id: "listing-3" }],
          pagination: { total: 3 },
        },
      ],
      matchId: "listing-1",
      expected: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 2 },
        },
        {
          data: [{ _id: "listing-3" }],
          pagination: { total: 2 },
        },
      ],
    },
    {
      label: "later page",
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 2 },
        },
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 2 },
        },
      ],
      matchId: "listing-2",
      expected: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 1 },
        },
        {
          data: [],
          pagination: { total: 1 },
        },
      ],
    },
  ])("removes a matching item on $label and drops every page total", ({
    pages,
    matchId,
    expected,
  }) => {
    const pageParams = [1, 2]
    const current = { pages, pageParams, meta: { source: "owner" } }

    const next = removeFromInfiniteList(current, byId(matchId))

    expect(next).toEqual({
      pages: expected,
      pageParams,
      meta: { source: "owner" },
    })
    expect(next.pageParams).toBe(pageParams)
  })

  it("removes matching items across multiple pages and drops totals by count", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { page: 1, total: 2 },
        },
        {
          data: [{ _id: "listing-1", rent: 15000 }],
          pagination: { page: 2, total: 2 },
        },
      ],
      pageParams: [1, 2],
    }

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next).toEqual({
      pages: [
        {
          data: [],
          pagination: { page: 1, total: 0 },
        },
        {
          data: [],
          pagination: { page: 2, total: 0 },
        },
      ],
      pageParams: [1, 2],
    })
  })

  it("removes from bare-array pages without inventing wrapper fields", () => {
    const second = [{ _id: "listing-3" }]
    const current = {
      pages: [
        [{ _id: "listing-1" }, { _id: "listing-2" }],
        second,
      ],
      pageParams: [1, 2],
    }

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next).toEqual({
      pages: [[{ _id: "listing-2" }], second],
      pageParams: [1, 2],
    })
    expect(next.pages[1]).toBe(second)
  })

  it("supports mixed flat and bare-array pages", () => {
    const second = [{ _id: "listing-1" }]
    const current = {
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 2 },
        },
        second,
      ],
      pageParams: [1, 2],
    }

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next.pages[0]).toEqual({
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
    })
    expect(next.pages[1]).toEqual([])
  })

  it("returns the same reference when nothing matches", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    const empty = { pages: [], pageParams: [] }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
    expect(removeFromInfiniteList(empty, byId("listing-1"))).toBe(empty)
  })

  it("returns the same reference for empty page payloads with no matches", () => {
    const current = {
      pages: [{ data: [], pagination: { total: 0 } }, []],
      pageParams: [1, 2],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it("removes every matching record on a page and drops totals by removed count", () => {
    const current = {
      pages: [
        {
          data: [
            { _id: "listing-1" },
            { _id: "listing-2" },
            { _id: "listing-1" },
          ],
          pagination: { total: 3 },
        },
        {
          data: [{ _id: "listing-3" }],
          pagination: { total: 3 },
        },
      ],
      pageParams: [1, 2],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toEqual({
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
        {
          data: [{ _id: "listing-3" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1, 2],
    })
  })

  it("removes all records when matcher always matches and clamps totals at 0", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "a" }, { _id: "b" }],
          pagination: { total: 3 },
        },
        {
          data: [{ _id: "c" }],
          pagination: { total: 3 },
        },
      ],
      pageParams: [1, 2],
    }

    expect(removeFromInfiniteList(current, () => true)).toEqual({
      pages: [
        {
          data: [],
          pagination: { total: 0 },
        },
        {
          data: [],
          pagination: { total: 0 },
        },
      ],
      pageParams: [1, 2],
    })
  })

  it("can empty a bare-array page when the only item matches", () => {
    const current = {
      pages: [[{ _id: "listing-1" }]],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toEqual({
      pages: [[]],
      pageParams: [1],
    })
  })

  it("clamps totals at 0 when removing more rows than total", () => {
    expect(
      removeFromInfiniteList(
        {
          pages: [
            {
              data: [{ _id: "listing-1" }, { _id: "listing-1" }],
              pagination: { total: 1 },
            },
          ],
          pageParams: [1],
        },
        byId("listing-1"),
      ),
    ).toEqual({
      pages: [
        {
          data: [],
          pagination: { total: 0 },
        },
      ],
      pageParams: [1],
    })
  })

  it("clamps negative totals at 0 after a drop", () => {
    expect(
      removeFromInfiniteList(
        {
          pages: [
            {
              data: [{ _id: "listing-1" }],
              pagination: { total: -3 },
            },
          ],
          pageParams: [1],
        },
        byId("listing-1"),
      ),
    ).toEqual({
      pages: [
        {
          data: [],
          pagination: { total: 0 },
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
    "leaves non-finite/non-number pagination.total unchanged: %j",
    (pagination, expectedPagination) => {
      const current = {
        pages: [{ data: [{ _id: "listing-1" }], pagination }],
        pageParams: [1],
      }
      const next = removeFromInfiniteList(current, byId("listing-1"))
      expect(next.pages[0].pagination).toEqual(expectedPagination)
      expect(next.pages[0].data).toEqual([])
    },
  )

  it("preserves null / missing pagination and works without pageParams", () => {
    const withNull = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: null,
        },
      ],
      pageParams: [1],
    }
    const nextNull = removeFromInfiniteList(withNull, byId("listing-1"))
    expect(nextNull).toEqual({
      pages: [
        {
          data: [],
          pagination: null,
        },
      ],
      pageParams: [1],
    })

    const withoutPagination = {
      pages: [{ data: [{ _id: "listing-1" }], success: true }],
    }
    expect(
      removeFromInfiniteList(withoutPagination, byId("listing-1")),
    ).toEqual({
      pages: [{ data: [], success: true }],
    })
  })

  it("keeps non-record entries and only removes matching records", () => {
    const date = new Date("2026-01-01")
    const current = {
      pages: [
        {
          data: [null, "x", { _id: "listing-1" }, 42, date],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toEqual({
      pages: [
        {
          data: [null, "x", 42, date],
          pagination: { total: 0 },
        },
      ],
      pageParams: [1],
    })
  })

  it("does not treat class instances as removable records", () => {
    class Row {
      _id = "listing-1"
    }
    const instance = new Row()
    const current = {
      pages: [
        {
          data: [instance, { _id: "listing-2" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it("does not match nested ids inside a list row", () => {
    const current = {
      pages: [
        {
          data: [{ nested: { _id: "listing-1" }, rent: 10000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it("supports null-prototype records for collection rows", () => {
    const row = Object.assign(Object.create(null), {
      _id: "listing-1",
    }) as Record<string, unknown>
    const other = Object.assign(Object.create(null), {
      _id: "listing-2",
    }) as Record<string, unknown>
    const page = Object.assign(Object.create(null), {
      data: [row, other],
      pagination: { total: 2 },
    })
    const current = Object.assign(Object.create(null), {
      pages: [page],
      pageParams: [1],
    })

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next.pages[0].data).toEqual([other])
    expect(next.pages[0].data[0]).toBe(other)
    expect(next.pages[0].pagination).toEqual({ total: 1 })
  })

  it("leaves current unchanged when matcher throw / non-boolean / thenable", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(
      removeFromInfiniteList(current, () => {
        throw new Error("match failed")
      }),
    ).toBe(current)
    expect(removeFromInfiniteList(current, (() => 1) as never)).toBe(current)
    expect(removeFromInfiniteList(current, (() => "yes") as never)).toBe(
      current,
    )
    expect(removeFromInfiniteList(current, (() => false) as never)).toBe(
      current,
    )
    expect(
      removeFromInfiniteList(
        current,
        (() => Promise.resolve(true)) as never,
      ),
    ).toBe(current)
  })

  it("never mutates frozen list / pagination inputs", () => {
    const row1 = Object.freeze({ _id: "listing-1" })
    const row2 = Object.freeze({ _id: "listing-2" })
    const pagination = Object.freeze({ page: 1, total: 2 })
    const page = Object.freeze({
      data: Object.freeze([row1, row2]) as unknown as Record<string, unknown>[],
      pagination,
    })
    const current = Object.freeze({
      pages: Object.freeze([page]) as unknown as typeof page[],
      pageParams: Object.freeze([1]) as unknown as number[],
    })

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next.pages[0]).toEqual({
      data: [row2],
      pagination: { page: 1, total: 1 },
    })
    expect(current.pages[0].data).toHaveLength(2)
    expect(pagination.total).toBe(2)
  })

  it("leaves current unchanged when a page cannot be inspected safely", () => {
    const data = new Proxy(
      [{ _id: "listing-1" }] as Record<string, unknown>[],
      {
        get(target, prop, receiver) {
          if (prop === "length") throw new Error("cannot read length")
          return Reflect.get(target, prop, receiver)
        },
      },
    )
    const current = {
      pages: [{ data, pagination: { total: 1 } }],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it.each([
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    1.5,
    -1,
  ])("leaves current unchanged for unusable item length: %s", (length) => {
    const data = new Proxy([{ _id: "listing-1" }], {
      get(target, prop, receiver) {
        if (prop === "length") return length
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = {
      pages: [{ data, pagination: { total: 1 } }],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it("leaves current unchanged when a later page fails after an earlier removal", () => {
    const laterData = new Proxy([{ _id: "listing-2" }], {
      get(target, prop, receiver) {
        if (prop === "0") throw new Error("later item failed")
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 2 },
        },
        {
          data: laterData,
          pagination: { total: 2 },
        },
      ],
      pageParams: [1, 2],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it("leaves current unchanged when index access throws mid-scan", () => {
    const data = [{ _id: "listing-1" }, { _id: "listing-2" }]
    const throwingData = new Proxy(data, {
      get(target, prop, receiver) {
        if (prop === "1") throw new Error("index failed")
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = {
      pages: [{ data: throwingData, pagination: { total: 2 } }],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
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
    const current = {
      pages: [{ data: throwingData, pagination: { total: 2 } }],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it("leaves current unchanged when push throws after copy-on-write starts", () => {
    const data = [{ _id: "listing-1" }, { _id: "listing-2" }]
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
    const current = {
      pages: [{ data: throwingData, pagination: { total: 2 } }],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
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
      pages: [
        {
          data: [{ _id: "listing-1" }, { _id: "listing-2" }],
          pagination,
          success: true,
        },
      ],
      pageParams: [1],
    }

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next).toEqual({
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination,
          success: true,
        },
      ],
      pageParams: [1],
    })
    expect(next.pages[0].pagination).toBe(pagination)
  })

  it("leaves current unchanged when pages shape flips after the guard", () => {
    let reads = 0
    const current = new Proxy(
      {
        pages: [{ data: [{ _id: "listing-1" }] }],
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

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it("handles revoked proxies without throwing", () => {
    const revoked = Proxy.revocable(
      {
        pages: [{ data: [{ _id: "listing-1" }] }],
        pageParams: [1],
      },
      {},
    )
    revoked.revoke()

    expect(() =>
      removeFromInfiniteList(revoked.proxy, byId("listing-1")),
    ).not.toThrow()
    expect(removeFromInfiniteList(revoked.proxy, byId("listing-1"))).toBe(
      revoked.proxy,
    )
  })

  it("preserves unchanged bare page identity and remaining row identity", () => {
    const keep = { _id: "listing-2" }
    const laterBare = [{ _id: "listing-3" }]
    const current = {
      success: true,
      pages: [
        {
          data: [{ _id: "listing-1" }, keep],
          pagination: { total: 3 },
        },
        laterBare,
      ],
      pageParams: [1, 2],
    }

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next.pages[0].data[0]).toBe(keep)
    expect(next.pages[1]).toBe(laterBare)
    expect(next.pages[0].pagination).toEqual({ total: 2 })
  })

  it("drops totals on untouched flat pages when another page removes", () => {
    const keepPage = {
      data: [{ _id: "listing-2" }],
      pagination: { total: 2 },
    }
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 2 },
        },
        keepPage,
      ],
      pageParams: [1, 2],
    }

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next.pages[0]).toEqual({
      data: [],
      pagination: { total: 1 },
    })
    expect(next.pages[1]).toEqual({
      data: [{ _id: "listing-2" }],
      pagination: { total: 1 },
    })
    expect(next.pages[1].data).toBe(keepPage.data)
    expect(next.pages[1]).not.toBe(keepPage)
  })

  it("uses captured page items when page.data flips after the filter pass", () => {
    const stableData = [{ _id: "listing-2" }]
    let dataReads = 0
    const keepPage = {
      pagination: { total: 2 },
    }
    Object.defineProperty(keepPage, "data", {
      enumerable: true,
      configurable: true,
      get() {
        dataReads += 1
        // Guard + filter each read once; later rebuild must use the capture.
        return dataReads <= 2 ? stableData : null
      },
    })

    const current = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 2 },
        },
        keepPage,
      ],
      pageParams: [1, 2],
    }

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next).not.toBe(current)
    expect(next.pages[0]).toEqual({
      data: [],
      pagination: { total: 1 },
    })
    expect(next.pages[1].data).toBe(stableData)
    expect(next.pages[1].pagination).toEqual({ total: 1 })
  })

  it.each([
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    1.5,
    -1,
  ])("leaves current unchanged for unusable pages length: %s", (length) => {
    const pages = new Proxy([{ data: [{ _id: "listing-1" }] }], {
      get(target, prop, receiver) {
        if (prop === "length") return length
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = { pages, pageParams: [1] }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it("leaves current unchanged when reading a page throws mid-walk", () => {
    const pages = [
      {
        data: [{ _id: "listing-1" }],
        pagination: { total: 2 },
      },
      {
        data: [{ _id: "listing-2" }],
        pagination: { total: 2 },
      },
    ]
    const throwingPages = new Proxy(pages, {
      get(target, prop, receiver) {
        if (prop === "1") throw new Error("page access failed")
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = { pages: throwingPages, pageParams: [1, 2] }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it("leaves current unchanged when page data getter throws", () => {
    const page = {
      pagination: { total: 1 },
    }
    Object.defineProperty(page, "data", {
      enumerable: true,
      get() {
        throw new Error("data getter failed")
      },
    })
    const current = { pages: [page], pageParams: [1] }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it("leaves current unchanged when spreading an updated page throws", () => {
    const page = {
      data: [{ _id: "listing-1" }],
      pagination: { total: 1 },
    }
    const hostilePage = new Proxy(page, {
      ownKeys() {
        throw new Error("ownKeys failed")
      },
      getPrototypeOf() {
        return Object.prototype
      },
    })
    const current = { pages: [hostilePage], pageParams: [1] }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })

  it("skips sparse holes and only removes defined matching records", () => {
    const data: Record<string, unknown>[] = []
    data[0] = { _id: "listing-1" }
    data[2] = { _id: "listing-2" }

    const current = {
      pages: [{ data, pagination: { total: 2 } }],
      pageParams: [1],
    }

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next).not.toBe(current)
    expect(next.pages[0].data[0]).toBeUndefined()
    expect(next.pages[0].data[1]).toEqual({ _id: "listing-2" })
    expect(next.pages[0].pagination).toEqual({ total: 1 })
  })

  it.each([
    {
      label: "first",
      data: [{ _id: "a" }, { _id: "b" }, { _id: "c" }],
      matchId: "a",
      expected: [{ _id: "b" }, { _id: "c" }],
    },
    {
      label: "middle",
      data: [{ _id: "a" }, { _id: "b" }, { _id: "c" }],
      matchId: "b",
      expected: [{ _id: "a" }, { _id: "c" }],
    },
    {
      label: "last",
      data: [{ _id: "a" }, { _id: "b" }, { _id: "c" }],
      matchId: "c",
      expected: [{ _id: "a" }, { _id: "b" }],
    },
  ])("removes a matching item in $label position within a page", ({
    data,
    matchId,
    expected,
  }) => {
    const current = {
      pages: [{ data, pagination: { total: 3 } }],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId(matchId))).toEqual({
      pages: [{ data: expected, pagination: { total: 2 } }],
      pageParams: [1],
    })
  })

  it("removes from the middle page of three and drops every page total", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 3 },
        },
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 3 },
        },
        {
          data: [{ _id: "listing-3" }],
          pagination: { total: 3 },
        },
      ],
      pageParams: [1, 2, 3],
    }

    expect(removeFromInfiniteList(current, byId("listing-2"))).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 2 },
        },
        {
          data: [],
          pagination: { total: 2 },
        },
        {
          data: [{ _id: "listing-3" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1, 2, 3],
    })
  })

  it("drops totals by the combined removed count across pages", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1" }, { _id: "keep-a" }],
          pagination: { total: 4 },
        },
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 4 },
        },
      ],
      pageParams: [1, 2],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toEqual({
      pages: [
        {
          data: [{ _id: "keep-a" }],
          pagination: { total: 2 },
        },
        {
          data: [],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1, 2],
    })
  })

  it("preserves non-record pagination without inventing totals", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: "bad" as never,
          success: true,
        },
      ],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toEqual({
      pages: [
        {
          data: [],
          pagination: "bad",
          success: true,
        },
      ],
      pageParams: [1],
    })
  })

  it("preserves extra top-level collection fields", () => {
    const current = {
      success: true,
      meta: { source: "owner" },
      pages: [
        {
          data: [{ _id: "listing-1" }, { _id: "listing-2" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    }

    expect(removeFromInfiniteList(current, byId("listing-1"))).toEqual({
      success: true,
      meta: { source: "owner" },
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })
  })

  it("treats matcher thenables after a successful match as non-matches", () => {
    let calls = 0
    const current = {
      pages: [
        {
          data: [
            { _id: "listing-1" },
            { _id: "listing-2" },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    }

    const next = removeFromInfiniteList(current, (item) => {
      calls += 1
      if (item._id === "listing-1") return true
      return Promise.resolve(true) as never
    })

    expect(calls).toBe(2)
    expect(next).toEqual({
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })
  })

  it("keeps earlier removals when a later matcher call throws", () => {
    let calls = 0
    const current = {
      pages: [
        {
          data: [
            { _id: "listing-1" },
            { _id: "listing-2" },
            { _id: "listing-1" },
          ],
          pagination: { total: 3 },
        },
      ],
      pageParams: [1],
    }

    const next = removeFromInfiniteList(current, (item) => {
      calls += 1
      if (item._id !== "listing-1") return false
      if (calls === 1) return true
      throw new Error("second match failed")
    })

    expect(next).toEqual({
      pages: [
        {
          data: [{ _id: "listing-2" }, { _id: "listing-1" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
  })

  it("rolls back atomically when a later page push fails after an earlier removal", () => {
    const laterData = [
      { _id: "listing-2" },
      { _id: "listing-3" },
    ]
    const throwingLater = new Proxy(laterData, {
      get(target, prop, receiver) {
        if (prop === "slice") {
          return (...args: unknown[]) => {
            const copied = Array.prototype.slice.apply(target, args as never)
            return new Proxy(copied, {
              get(copyTarget, copyProp, copyReceiver) {
                if (copyProp === "push") {
                  return () => {
                    throw new Error("later push failed")
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
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 3 },
        },
        {
          data: throwingLater,
          pagination: { total: 3 },
        },
      ],
      pageParams: [1, 2],
    }

    expect(
      removeFromInfiniteList(
        current,
        (item) => item._id === "listing-1" || item._id === "listing-2",
      ),
    ).toBe(current)
  })

  it("still drops other page totals when one page's pagination.total throws", () => {
    const badPagination = new Proxy(
      { page: 2, total: 2 },
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
          data: [{ _id: "listing-1" }],
          pagination: { page: 1, total: 2 },
        },
        {
          data: [{ _id: "listing-2" }],
          pagination: badPagination,
        },
      ],
      pageParams: [1, 2],
    }

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next.pages[0]).toEqual({
      data: [],
      pagination: { page: 1, total: 1 },
    })
    expect(next.pages[1].data).toEqual([{ _id: "listing-2" }])
    expect(next.pages[1].pagination).toBe(badPagination)
  })

  it("leaves untouched bare pages by reference when only totals on flat pages change", () => {
    const bare = [{ _id: "listing-3" }]
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 2 },
        },
        bare,
      ],
      pageParams: [1, 2],
    }

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next.pages[0]).toEqual({
      data: [],
      pagination: { total: 1 },
    })
    expect(next.pages[1]).toBe(bare)
  })

  it("removes the only flat-page item and clamps total at 0", () => {
    expect(
      removeFromInfiniteList(
        {
          pages: [
            {
              data: [{ _id: "listing-1" }],
              pagination: { total: 1 },
            },
          ],
          pageParams: [1],
        },
        byId("listing-1"),
      ),
    ).toEqual({
      pages: [
        {
          data: [],
          pagination: { total: 0 },
        },
      ],
      pageParams: [1],
    })
  })

  it("leaves current unchanged when pages array length getter throws mid-walk", () => {
    let lengthReads = 0
    const pages = [
      {
        data: [{ _id: "listing-1" }],
        pagination: { total: 1 },
      },
    ]
    const throwingPages = new Proxy(pages, {
      get(target, prop, receiver) {
        if (prop === "length") {
          lengthReads += 1
          if (lengthReads > 2) throw new Error("length failed")
          return target.length
        }
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = { pages: throwingPages, pageParams: [1] }

    expect(() =>
      removeFromInfiniteList(current, byId("listing-1")),
    ).not.toThrow()
  })

  it("uses the page object captured in pass 1 when pages index flips later", () => {
    const flatPage = {
      data: [{ _id: "listing-1" }],
      pagination: { total: 1 },
    }
    let pageReads = 0
    const hostilePages = new Proxy([flatPage], {
      get(target, prop, receiver) {
        if (prop === "0") {
          pageReads += 1
          return pageReads <= 2 ? flatPage : { pages: [], pageParams: [] }
        }
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = { pages: hostilePages, pageParams: [1] }

    const next = removeFromInfiniteList(current, byId("listing-1"))

    expect(next).not.toBe(current)
    expect(next.pages[0]).toEqual({
      data: [],
      pagination: { total: 0 },
    })
  })

  it("aborts when a captured flat page becomes infinite-shaped during rebuild", () => {
    let pagesReads = 0
    const flatPage = {
      data: [{ _id: "listing-1" }],
      pagination: { total: 1 },
    }
    const hostilePage = new Proxy(flatPage, {
      get(target, prop, receiver) {
        if (prop === "pages") {
          pagesReads += 1
          // After pass-1 validation, claim to be an infinite collection.
          return pagesReads > 0 ? [] : undefined
        }
        return Reflect.get(target, prop, receiver)
      },
      getPrototypeOf() {
        return Object.prototype
      },
    })
    const current = { pages: [hostilePage], pageParams: [1] }

    // Pass 1: readPageItems rejects infinite-looking pages → abort.
    expect(removeFromInfiniteList(current, byId("listing-1"))).toBe(current)
  })
})

describe("removeFromInfiniteListInQueries", () => {
  it("removes matching infinite-list queries under a key prefix", () => {
    const queryClient = new QueryClient()
    const firstKey = ["listing", "infinite", "ACTIVE"] as const
    const secondKey = ["listing", "infinite", "PENDING"] as const
    const flatKey = ["listing", "flat"] as const

    queryClient.setQueryData(firstKey, {
      pages: [
        {
          data: [
            { _id: "listing-1" },
            { _id: "listing-2" },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
    queryClient.setQueryData(secondKey, {
      pages: [
        {
          data: [
            { _id: "listing-1" },
            { _id: "listing-3" },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
    const flat = {
      data: [{ _id: "listing-1" }],
      pagination: { total: 1 },
    }
    queryClient.setQueryData(flatKey, flat)

    removeFromInfiniteListInQueries(
      queryClient,
      [["listing", "infinite"]],
      byId("listing-1"),
    )

    expect(queryClient.getQueryData(firstKey)).toEqual({
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })
    expect(queryClient.getQueryData(secondKey)).toEqual({
      pages: [
        {
          data: [{ _id: "listing-3" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })
    expect(queryClient.getQueryData(flatKey)).toBe(flat)
  })

  it("removes from bare-array infinite caches under the prefix", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "bare-infinite"] as const
    queryClient.setQueryData(key, {
      pages: [[{ _id: "listing-1" }, { _id: "listing-2" }]],
      pageParams: [1],
    })

    removeFromInfiniteListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(key)).toEqual({
      pages: [[{ _id: "listing-2" }]],
      pageParams: [1],
    })
  })

  it("keeps the same reference when the item is absent", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "absent"] as const
    const current = {
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    queryClient.setQueryData(key, current)

    removeFromInfiniteListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("only updates lists that contain the match", () => {
    const queryClient = new QueryClient()
    const hitKey = ["listing", "hit"] as const
    const missKey = ["listing", "miss"] as const
    const miss = {
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    queryClient.setQueryData(hitKey, {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })
    queryClient.setQueryData(missKey, miss)

    removeFromInfiniteListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(hitKey)).toEqual({
      pages: [
        {
          data: [],
          pagination: { total: 0 },
        },
      ],
      pageParams: [1],
    })
    expect(queryClient.getQueryData(missKey)).toBe(miss)
  })

  it("does not modify detail or wrong-shaped caches under the same prefix", () => {
    const queryClient = new QueryClient()
    const infiniteKey = ["listing", "owner"] as const
    const detailKey = ["listing", "detail", "listing-1"] as const
    const detail = { _id: "listing-1", rent: 10000 }

    queryClient.setQueryData(infiniteKey, {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })
    queryClient.setQueryData(detailKey, detail)

    removeFromInfiniteListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(infiniteKey)).toEqual({
      pages: [
        {
          data: [],
          pagination: { total: 0 },
        },
      ],
      pageParams: [1],
    })
    expect(queryClient.getQueryData(detailKey)).toBe(detail)
  })

  it("is a no-op for invalid matcher, client, or keys", () => {
    const queryClient = new QueryClient()
    const key = ["listing"] as const
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    queryClient.setQueryData(key, current)

    expect(() =>
      removeFromInfiniteListInQueries(queryClient, [["listing"]], null as never),
    ).not.toThrow()
    expect(queryClient.getQueryData(key)).toBe(current)

    expect(() =>
      removeFromInfiniteListInQueries(
        null as never,
        [["listing"]],
        byId("listing-1"),
      ),
    ).not.toThrow()

    expect(() =>
      removeFromInfiniteListInQueries(
        queryClient,
        null as never,
        byId("listing-1"),
      ),
    ).not.toThrow()
  })

  it("dedupes overlapping key prefixes to a single write", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "infinite", "ACTIVE"] as const
    queryClient.setQueryData(key, {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })

    const setQueryData = vi.spyOn(queryClient, "setQueryData")

    removeFromInfiniteListInQueries(
      queryClient,
      [
        ["listing"],
        ["listing", "infinite"],
      ],
      byId("listing-1"),
    )

    expect(setQueryData).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(key)).toEqual({
      pages: [
        {
          data: [],
          pagination: { total: 0 },
        },
      ],
      pageParams: [1],
    })
  })

  it("continues updating other queries when one setQueryData throws", () => {
    const goodKey = ["listing", "good"] as const
    const badKey = ["listing", "bad"] as const
    const store = new Map<string, unknown>([
      [
        JSON.stringify(goodKey),
        {
          pages: [
            {
              data: [{ _id: "listing-1" }],
              pagination: { total: 1 },
            },
          ],
          pageParams: [1],
        },
      ],
      [
        JSON.stringify(badKey),
        {
          pages: [
            {
              data: [{ _id: "listing-1" }],
              pagination: { total: 1 },
            },
          ],
          pageParams: [1],
        },
      ],
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
      removeFromInfiniteListInQueries(
        queryClient,
        [["listing"]],
        byId("listing-1"),
      ),
    ).not.toThrow()

    expect(store.get(JSON.stringify(goodKey))).toEqual({
      pages: [
        {
          data: [],
          pagination: { total: 0 },
        },
      ],
      pageParams: [1],
    })
  })

  it("skips queries with invalid query keys and continues", () => {
    const validKey = ["listing", "valid"] as const
    const store = new Map<string, unknown>([
      [
        JSON.stringify(validKey),
        {
          pages: [
            {
              data: [{ _id: "listing-1" }],
              pagination: { total: 1 },
            },
          ],
          pageParams: [1],
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
      removeFromInfiniteListInQueries(
        queryClient,
        [["listing"]],
        byId("listing-1"),
      ),
    ).not.toThrow()

    expect(setQueryData).toHaveBeenCalledTimes(1)
    expect(store.get(JSON.stringify(validKey))).toEqual({
      pages: [
        {
          data: [],
          pagination: { total: 0 },
        },
      ],
      pageParams: [1],
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
      removeFromInfiniteListInQueries(
        queryClient,
        [["listing"]],
        byId("listing-1"),
      ),
    ).not.toThrow()
  })

  it("is a no-op when the cached query has no data yet", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "empty"] as const
    queryClient.setQueryData(key, undefined)

    removeFromInfiniteListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(key)).toBeUndefined()
  })

  it("removes matches across multiple loaded pages in cache", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "multi-page"] as const
    queryClient.setQueryData(key, {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 2 },
        },
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1, 2],
    })

    removeFromInfiniteListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(key)).toEqual({
      pages: [
        {
          data: [],
          pagination: { total: 0 },
        },
        {
          data: [],
          pagination: { total: 0 },
        },
      ],
      pageParams: [1, 2],
    })
  })

  it("leaves empty-pages caches unchanged", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "no-pages"] as const
    const empty = { pages: [], pageParams: [] }
    queryClient.setQueryData(key, empty)

    removeFromInfiniteListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(key)).toBe(empty)
  })

  it("removes from mixed flat and bare-array caches", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "mixed"] as const
    queryClient.setQueryData(key, {
      pages: [
        {
          data: [{ _id: "listing-1" }, { _id: "listing-2" }],
          pagination: { total: 3 },
        },
        [{ _id: "listing-1" }],
      ],
      pageParams: [1, 2],
    })

    removeFromInfiniteListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(key)).toEqual({
      pages: [
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
        [],
      ],
      pageParams: [1, 2],
    })
  })

  it("is a no-op for an empty queryKeys list", () => {
    const queryClient = new QueryClient()
    const key = ["listing"] as const
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    queryClient.setQueryData(key, current)

    removeFromInfiniteListInQueries(queryClient, [], byId("listing-1"))

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("drops totals across all loaded pages in cache", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "totals"] as const
    queryClient.setQueryData(key, {
      pages: [
        {
          data: [{ _id: "listing-1" }],
          pagination: { total: 2 },
        },
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1, 2],
    })

    removeFromInfiniteListInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(key)).toEqual({
      pages: [
        {
          data: [],
          pagination: { total: 1 },
        },
        {
          data: [{ _id: "listing-2" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1, 2],
    })
  })
})
