import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import {
  updateInInfiniteList,
  updateInInfiniteListInQueries,
} from "./updateInInfiniteList"

const byId =
  (id: string) =>
  (value: Record<string, unknown>) =>
    value._id === id

const bumpRent = (entity: Record<string, unknown>) => ({
  ...entity,
  rent: Number(entity.rent ?? 0) + 1000,
})

describe("updateInInfiniteList", () => {
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
    { data: [{ _id: "listing-1", rent: 1 }] },
    { pages: null },
    { pages: "bad" },
    { pages: [{}] },
    { pages: [{ data: null }] },
    {
      pages: [{ data: { listings: [{ _id: "listing-1", rent: 1 }] } }],
      pageParams: [1],
    },
  ])("returns unsupported current unchanged: %s", (current) => {
    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
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
      pages: [
        { data: [{ _id: "listing-1", rent: 10000 }], pagination: { total: 1 } },
      ],
      pageParams: [1],
    }
    expect(
      updateInInfiniteList(current, match as never, bumpRent),
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
    "update",
    [],
    {},
  ])("returns current unchanged for invalid updater: %s", (update) => {
    const current = {
      pages: [
        { data: [{ _id: "listing-1", rent: 10000 }], pagination: { total: 1 } },
      ],
      pageParams: [1],
    }
    expect(
      updateInInfiniteList(current, byId("listing-1"), update as never),
    ).toBe(current)
  })

  it.each([
    {
      label: "first page",
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-2", rent: 20000 },
          ],
          pagination: { total: 3 },
        },
        {
          data: [{ _id: "listing-3", rent: 30000 }],
          pagination: { total: 3 },
        },
      ],
      matchId: "listing-1",
      expected: [
        {
          data: [
            { _id: "listing-1", rent: 11000 },
            { _id: "listing-2", rent: 20000 },
          ],
          pagination: { total: 3 },
        },
        {
          data: [{ _id: "listing-3", rent: 30000 }],
          pagination: { total: 3 },
        },
      ],
    },
    {
      label: "later page",
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 2 },
        },
        {
          data: [{ _id: "listing-2", rent: 20000 }],
          pagination: { total: 2 },
        },
      ],
      matchId: "listing-2",
      expected: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 2 },
        },
        {
          data: [{ _id: "listing-2", rent: 21000 }],
          pagination: { total: 2 },
        },
      ],
    },
  ])("updates a matching item on $label", ({ pages, matchId, expected }) => {
    const pageParams = [1, 2]
    const current = { pages, pageParams, meta: { source: "owner" } }

    const next = updateInInfiniteList(current, byId(matchId), bumpRent)

    expect(next).toEqual({
      pages: expected,
      pageParams,
      meta: { source: "owner" },
    })
    expect(next.pageParams).toBe(pageParams)
  })

  it("updates matching items across multiple pages and leaves pagination untouched", () => {
    const laterPage = {
      data: [{ _id: "listing-1", rent: 15000 }],
      pagination: { page: 2, total: 2 },
    }
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { page: 1, total: 2 },
        },
        laterPage,
      ],
      pageParams: [1, 2],
    }

    const next = updateInInfiniteList(current, byId("listing-1"), bumpRent)

    expect(next).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1", rent: 11000 }],
          pagination: { page: 1, total: 2 },
        },
        {
          data: [{ _id: "listing-1", rent: 16000 }],
          pagination: { page: 2, total: 2 },
        },
      ],
      pageParams: [1, 2],
    })
    expect(next.pages[0].pagination).toBe(current.pages[0].pagination)
    expect(next.pages[1].pagination).toBe(laterPage.pagination)
  })

  it("updates bare-array pages without inventing wrapper fields", () => {
    const second = [{ _id: "listing-3", rent: 30000 }]
    const current = {
      pages: [
        [
          { _id: "listing-1", rent: 10000 },
          { _id: "listing-2", rent: 20000 },
        ],
        second,
      ],
      pageParams: [1, 2],
    }

    const next = updateInInfiniteList(current, byId("listing-1"), bumpRent)

    expect(next).toEqual({
      pages: [
        [
          { _id: "listing-1", rent: 11000 },
          { _id: "listing-2", rent: 20000 },
        ],
        second,
      ],
      pageParams: [1, 2],
    })
    expect(next.pages[1]).toBe(second)
  })

  it("supports mixed flat and bare-array pages", () => {
    const second = [{ _id: "listing-1", rent: 15000 }]
    const current = {
      pages: [
        {
          data: [{ _id: "listing-2", rent: 20000 }],
          pagination: { total: 2 },
        },
        second,
      ],
      pageParams: [1, 2],
    }

    const next = updateInInfiniteList(current, byId("listing-1"), bumpRent)

    expect(next.pages[0]).toBe(current.pages[0])
    expect(next.pages[1]).toEqual([{ _id: "listing-1", rent: 16000 }])
  })

  it("returns the same reference when nothing matches", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-2", rent: 20000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    const empty = { pages: [], pageParams: [] }

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
    expect(updateInInfiniteList(empty, byId("listing-1"), bumpRent)).toBe(empty)
  })

  it("returns the same reference when updater returns the same object", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), (entity) => entity),
    ).toBe(current)
  })

  it("updates every matching record on a page", () => {
    const current = {
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-2", rent: 20000 },
            { _id: "listing-1", rent: 15000 },
          ],
          pagination: { total: 3 },
        },
      ],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toEqual({
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 11000 },
            { _id: "listing-2", rent: 20000 },
            { _id: "listing-1", rent: 16000 },
          ],
          pagination: { total: 3 },
        },
      ],
      pageParams: [1],
    })
  })

  it("skips a failed updater for one match and still updates later matches", () => {
    let calls = 0
    const current = {
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-1", rent: 15000 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), (entity) => {
        calls += 1
        if (calls === 1) return null as never
        return { ...entity, rent: 99999 }
      }),
    ).toEqual({
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-1", rent: 99999 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
  })

  it("keeps non-record entries and only updates matching records", () => {
    const date = new Date("2026-01-01")
    const current = {
      pages: [
        {
          data: [null, "x", { _id: "listing-1", rent: 10000 }, 42, date],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toEqual({
      pages: [
        {
          data: [null, "x", { _id: "listing-1", rent: 11000 }, 42, date],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })
  })

  it("does not treat class instances as updatable records", () => {
    class Row {
      _id = "listing-1"
      rent = 10000
    }
    const instance = new Row()
    const current = {
      pages: [
        {
          data: [instance, { _id: "listing-2", rent: 20000 }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
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

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
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
    const page = Object.assign(Object.create(null), {
      data: [row, other],
      pagination: { total: 2 },
    })
    const current = Object.assign(Object.create(null), {
      pages: [page],
      pageParams: [1],
    })

    const next = updateInInfiniteList(current, byId("listing-1"), (entity) =>
      Object.assign(Object.create(null), entity, { rent: 11000 }),
    )

    expect(next.pages[0].data[0]).toMatchObject({
      _id: "listing-1",
      rent: 11000,
    })
    expect(next.pages[0].data[1]).toBe(other)
    expect(Object.getPrototypeOf(next.pages[0].data[0])).toBeNull()
  })

  it("leaves current unchanged when matcher throw / non-boolean / thenable", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(
        current,
        () => {
          throw new Error("match failed")
        },
        bumpRent,
      ),
    ).toBe(current)
    expect(
      updateInInfiniteList(current, (() => 1) as never, bumpRent),
    ).toBe(current)
    expect(
      updateInInfiniteList(current, (() => "yes") as never, bumpRent),
    ).toBe(current)
    expect(
      updateInInfiniteList(current, (() => false) as never, bumpRent),
    ).toBe(current)
    expect(
      updateInInfiniteList(
        current,
        (() => Promise.resolve(true)) as never,
        bumpRent,
      ),
    ).toBe(current)
  })

  it("leaves current unchanged when updater throws or returns unsafe values", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), () => {
        throw new Error("update failed")
      }),
    ).toBe(current)
    expect(
      updateInInfiniteList(current, byId("listing-1"), (() => null) as never),
    ).toBe(current)
    expect(
      updateInInfiniteList(
        current,
        byId("listing-1"),
        (() => [{ _id: "listing-1" }]) as never,
      ),
    ).toBe(current)
    expect(
      updateInInfiniteList(
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
    const page = Object.freeze({
      data: Object.freeze([row1, row2]) as unknown as Record<string, unknown>[],
      pagination,
    })
    const current = Object.freeze({
      pages: Object.freeze([page]) as unknown as typeof page[],
      pageParams: Object.freeze([1]) as unknown as number[],
    })

    const next = updateInInfiniteList(current, byId("listing-1"), bumpRent)

    expect(next.pages[0]).toEqual({
      data: [{ _id: "listing-1", rent: 11000 }, row2],
      pagination,
    })
    expect(current.pages[0].data[0]).toEqual({
      _id: "listing-1",
      rent: 10000,
    })
    expect(pagination.total).toBe(2)
  })

  it("leaves current unchanged when a page cannot be inspected safely", () => {
    const data = new Proxy(
      [{ _id: "listing-1", rent: 10000 }] as Record<string, unknown>[],
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

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it.each([
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    1.5,
    -1,
  ])("leaves current unchanged for unusable item length: %s", (length) => {
    const data = new Proxy([{ _id: "listing-1", rent: 10000 }], {
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
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("leaves current unchanged when a later page fails after an earlier update", () => {
    const laterData = new Proxy([{ _id: "listing-2", rent: 20000 }], {
      get(target, prop, receiver) {
        if (prop === "0") throw new Error("later item failed")
        return Reflect.get(target, prop, receiver)
      },
    })
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
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
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
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
    const current = {
      pages: [{ data: throwingData, pagination: { total: 2 } }],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
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
    const current = {
      pages: [{ data: throwingData, pagination: { total: 2 } }],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("leaves current unchanged when pages shape flips after the guard", () => {
    let reads = 0
    const current = new Proxy(
      {
        pages: [{ data: [{ _id: "listing-1", rent: 10000 }] }],
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
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("handles revoked proxies without throwing", () => {
    const revoked = Proxy.revocable(
      {
        pages: [{ data: [{ _id: "listing-1", rent: 10000 }] }],
        pageParams: [1],
      },
      {},
    )
    revoked.revoke()

    expect(() =>
      updateInInfiniteList(revoked.proxy, byId("listing-1"), bumpRent),
    ).not.toThrow()
    expect(
      updateInInfiniteList(revoked.proxy, byId("listing-1"), bumpRent),
    ).toBe(revoked.proxy)
  })

  it("preserves unchanged page object identity and remaining row identity", () => {
    const keep = { _id: "listing-2", rent: 20000 }
    const laterPage = {
      data: [{ _id: "listing-3", rent: 30000 }],
      pagination: { total: 3 },
    }
    const current = {
      success: true,
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }, keep],
          pagination: { total: 3 },
        },
        laterPage,
      ],
      pageParams: [1, 2],
    }

    const next = updateInInfiniteList(current, byId("listing-1"), bumpRent)

    expect(next.pages[0].data[1]).toBe(keep)
    expect(next.pages[1]).toBe(laterPage)
    expect(next.pages[0].pagination).toBe(current.pages[0].pagination)
  })

  it("updates every record when matcher always matches", () => {
    const current = {
      pages: [
        {
          data: [
            { _id: "a", rent: 1 },
            { _id: "b", rent: 2 },
          ],
          pagination: { total: 2 },
        },
        [{ _id: "c", rent: 3 }],
      ],
      pageParams: [1, 2],
    }

    expect(updateInInfiniteList(current, () => true, bumpRent)).toEqual({
      pages: [
        {
          data: [
            { _id: "a", rent: 1001 },
            { _id: "b", rent: 1002 },
          ],
          pagination: { total: 2 },
        },
        [{ _id: "c", rent: 1003 }],
      ],
      pageParams: [1, 2],
    })
  })

  it("updates a single-item bare-array page", () => {
    const current = {
      pages: [[{ _id: "listing-1", rent: 10000 }]],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toEqual({
      pages: [[{ _id: "listing-1", rent: 11000 }]],
      pageParams: [1],
    })
  })

  it("preserves null / missing pagination and works without pageParams", () => {
    const withNull = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: null,
        },
      ],
      pageParams: [1],
    }
    const nextNull = updateInInfiniteList(withNull, byId("listing-1"), bumpRent)
    expect(nextNull).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1", rent: 11000 }],
          pagination: null,
        },
      ],
      pageParams: [1],
    })
    expect(nextNull.pages[0].pagination).toBeNull()

    const withoutPagination = {
      pages: [{ data: [{ _id: "listing-1", rent: 10000 }], success: true }],
    }
    expect(
      updateInInfiniteList(withoutPagination, byId("listing-1"), bumpRent),
    ).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1", rent: 11000 }],
          success: true,
        },
      ],
    })
  })

  it("returns the same reference for empty page payloads with no matches", () => {
    const current = {
      pages: [{ data: [], pagination: { total: 0 } }, []],
      pageParams: [1, 2],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
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
    new Set(),
    Promise.resolve({ _id: "listing-1", rent: 1 }),
  ])("ignores updater result that is not a plain record: %s", (result) => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(
        current,
        byId("listing-1"),
        (() => result) as never,
      ),
    ).toBe(current)
  })

  it("ignores class-instance updater results", () => {
    class Row {
      _id = "listing-1"
      rent = 999
    }
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), () => new Row() as never),
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
    const current = {
      pages: [{ data: throwingData, pagination: { total: 2 } }],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("rolls back atomically when a later page push fails after an earlier update", () => {
    const laterData = [
      { _id: "listing-2", rent: 20000 },
      { _id: "listing-3", rent: 30000 },
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
          data: [{ _id: "listing-1", rent: 10000 }],
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
      updateInInfiniteList(
        current,
        (item) => item._id === "listing-1" || item._id === "listing-2",
        bumpRent,
      ),
    ).toBe(current)
  })

  it("allows updater to replace matched entity fields", () => {
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000, title: "Old" }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    expect(
      updateInInfiniteList(current, byId("listing-1"), () => ({
        _id: "listing-1",
        rent: 12000,
        title: "New",
        status: "ACTIVE",
      })),
    ).toEqual({
      pages: [
        {
          data: [
            {
              _id: "listing-1",
              rent: 12000,
              title: "New",
              status: "ACTIVE",
            },
          ],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })
  })

  it("skips sparse holes and only updates defined matching records", () => {
    const data: Record<string, unknown>[] = []
    data[0] = { _id: "listing-1", rent: 10000 }
    data[2] = { _id: "listing-2", rent: 20000 }

    const current = {
      pages: [{ data, pagination: { total: 2 } }],
      pageParams: [1],
    }

    const next = updateInInfiniteList(current, byId("listing-1"), bumpRent)

    expect(next).not.toBe(current)
    expect(next.pages[0].data[0]).toEqual({ _id: "listing-1", rent: 11000 })
    expect(next.pages[0].data[1]).toBeUndefined()
    expect(next.pages[0].data[2]).toEqual({ _id: "listing-2", rent: 20000 })
  })

  it.each([
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    1.5,
    -1,
  ])("leaves current unchanged for unusable pages length: %s", (length) => {
    const pages = new Proxy(
      [{ data: [{ _id: "listing-1", rent: 10000 }] }],
      {
        get(target, prop, receiver) {
          if (prop === "length") return length
          return Reflect.get(target, prop, receiver)
        },
      },
    )
    const current = { pages, pageParams: [1] }

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("leaves current unchanged when reading a page throws mid-walk", () => {
    const pages = [
      {
        data: [{ _id: "listing-1", rent: 10000 }],
        pagination: { total: 2 },
      },
      {
        data: [{ _id: "listing-2", rent: 20000 }],
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

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
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

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("leaves current unchanged when spreading an updated page throws", () => {
    const page = {
      data: [{ _id: "listing-1", rent: 10000 }],
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

    expect(
      updateInInfiniteList(current, byId("listing-1"), bumpRent),
    ).toBe(current)
  })

  it("treats matcher thenables after a successful match as non-matches", () => {
    let calls = 0
    const current = {
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-2", rent: 20000 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    }

    const next = updateInInfiniteList(
      current,
      (item) => {
        calls += 1
        if (item._id === "listing-1") return true
        return Promise.resolve(true) as never
      },
      bumpRent,
    )

    expect(calls).toBe(2)
    expect(next).toEqual({
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 11000 },
            { _id: "listing-2", rent: 20000 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
  })
})

describe("updateInInfiniteListInQueries", () => {
  it("updates matching infinite-list queries under a key prefix", () => {
    const queryClient = new QueryClient()
    const firstKey = ["listing", "infinite", "ACTIVE"] as const
    const secondKey = ["listing", "infinite", "PENDING"] as const
    const flatKey = ["listing", "flat"] as const

    queryClient.setQueryData(firstKey, {
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-2", rent: 20000 },
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
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-3", rent: 30000 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
    const flat = {
      data: [{ _id: "listing-1", rent: 10000 }],
      pagination: { total: 1 },
    }
    queryClient.setQueryData(flatKey, flat)

    updateInInfiniteListInQueries(
      queryClient,
      [["listing", "infinite"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(firstKey)).toEqual({
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 11000 },
            { _id: "listing-2", rent: 20000 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
    expect(queryClient.getQueryData(secondKey)).toEqual({
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 11000 },
            { _id: "listing-3", rent: 30000 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
    expect(queryClient.getQueryData(flatKey)).toBe(flat)
  })

  it("updates bare-array infinite caches under the prefix", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "bare-infinite"] as const
    queryClient.setQueryData(key, {
      pages: [
        [
          { _id: "listing-1", rent: 10000 },
          { _id: "listing-2", rent: 20000 },
        ],
      ],
      pageParams: [1],
    })

    updateInInfiniteListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(key)).toEqual({
      pages: [
        [
          { _id: "listing-1", rent: 11000 },
          { _id: "listing-2", rent: 20000 },
        ],
      ],
      pageParams: [1],
    })
  })

  it("keeps the same reference when the item is absent", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "infinite"] as const
    const existing = {
      pages: [
        {
          data: [{ _id: "listing-2", rent: 20000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    queryClient.setQueryData(key, existing)

    updateInInfiniteListInQueries(
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
      pages: [
        {
          data: [{ _id: "listing-2", rent: 20000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }

    queryClient.setQueryData(withMatch, {
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-2", rent: 20000 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
    queryClient.setQueryData(withoutMatch, untouched)

    updateInInfiniteListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(withMatch)).toEqual({
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 11000 },
            { _id: "listing-2", rent: 20000 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
    expect(queryClient.getQueryData(withoutMatch)).toBe(untouched)
  })

  it("does not modify detail or wrong-shaped caches under the same prefix", () => {
    const queryClient = new QueryClient()
    const detailKey = ["listing", "detail"] as const
    const wrongShapeKey = ["listing", "items-shape"] as const
    const detail = { _id: "listing-1", rent: 10000 }
    const wrongShape = { items: [{ _id: "listing-1", rent: 10000 }] }

    queryClient.setQueryData(detailKey, detail)
    queryClient.setQueryData(wrongShapeKey, wrongShape)

    updateInInfiniteListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(detailKey)).toBe(detail)
    expect(queryClient.getQueryData(wrongShapeKey)).toBe(wrongShape)
  })

  it("is a no-op for invalid matcher, updater, client, or keys", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "infinite"] as const
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    queryClient.setQueryData(key, current)

    updateInInfiniteListInQueries(
      queryClient,
      [["listing"]],
      null as never,
      bumpRent,
    )
    updateInInfiniteListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      null as never,
    )
    updateInInfiniteListInQueries(
      null as never,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )
    updateInInfiniteListInQueries(
      queryClient,
      null as never,
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("dedupes overlapping key prefixes to a single write", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "infinite"] as const
    queryClient.setQueryData(key, {
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 10000 },
            { _id: "listing-2", rent: 20000 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })

    updateInInfiniteListInQueries(
      queryClient,
      [["listing"], ["listing", "infinite"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(key)).toEqual({
      pages: [
        {
          data: [
            { _id: "listing-1", rent: 11000 },
            { _id: "listing-2", rent: 20000 },
          ],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1],
    })
  })

  it("continues updating other queries when one setQueryData throws", () => {
    const firstKey = ["listing", "a"] as const
    const secondKey = ["listing", "b"] as const
    const store = new Map<string, unknown>([
      [
        JSON.stringify(firstKey),
        {
          pages: [
            {
              data: [{ _id: "listing-1", rent: 10000 }],
              pagination: { total: 1 },
            },
          ],
          pageParams: [1],
        },
      ],
      [
        JSON.stringify(secondKey),
        {
          pages: [
            {
              data: [{ _id: "listing-1", rent: 10000 }],
              pagination: { total: 1 },
            },
          ],
          pageParams: [1],
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
      updateInInfiniteListInQueries(
        queryClient,
        [["listing"]],
        byId("listing-1"),
        bumpRent,
      ),
    ).not.toThrow()

    expect(store.get(JSON.stringify(firstKey))).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    })
    expect(store.get(JSON.stringify(secondKey))).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1", rent: 11000 }],
          pagination: { total: 1 },
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
              data: [{ _id: "listing-1", rent: 10000 }],
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
      updateInInfiniteListInQueries(
        queryClient,
        [["listing"]],
        byId("listing-1"),
        bumpRent,
      ),
    ).not.toThrow()

    expect(setQueryData).toHaveBeenCalledTimes(1)
    expect(store.get(JSON.stringify(validKey))).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1", rent: 11000 }],
          pagination: { total: 1 },
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
      updateInInfiniteListInQueries(
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

    updateInInfiniteListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(key)).toBeUndefined()
  })

  it("keeps the same reference when updater returns the same object in cache", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "same"] as const
    const current = {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 1 },
        },
      ],
      pageParams: [1],
    }
    queryClient.setQueryData(key, current)

    updateInInfiniteListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      (entity) => entity,
    )

    expect(queryClient.getQueryData(key)).toBe(current)
  })

  it("updates matches across multiple loaded pages in cache", () => {
    const queryClient = new QueryClient()
    const key = ["listing", "multi-page"] as const
    queryClient.setQueryData(key, {
      pages: [
        {
          data: [{ _id: "listing-1", rent: 10000 }],
          pagination: { total: 2 },
        },
        {
          data: [{ _id: "listing-1", rent: 15000 }],
          pagination: { total: 2 },
        },
      ],
      pageParams: [1, 2],
    })

    updateInInfiniteListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(key)).toEqual({
      pages: [
        {
          data: [{ _id: "listing-1", rent: 11000 }],
          pagination: { total: 2 },
        },
        {
          data: [{ _id: "listing-1", rent: 16000 }],
          pagination: { total: 2 },
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

    updateInInfiniteListInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      bumpRent,
    )

    expect(queryClient.getQueryData(key)).toBe(empty)
  })
})
