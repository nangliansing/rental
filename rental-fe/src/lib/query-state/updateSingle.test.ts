import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { isQueryStateRecord } from "./shared"
import { updateSingle, updateSingleInQueries } from "./updateSingle"

const byId =
  (id: string) =>
  (value: Record<string, unknown>) =>
    value._id === id

describe("isQueryStateRecord", () => {
  it("accepts plain objects only", () => {
    expect(isQueryStateRecord({ _id: "1" })).toBe(true)
    expect(isQueryStateRecord(Object.create(null))).toBe(true)

    expect(isQueryStateRecord(null)).toBe(false)
    expect(isQueryStateRecord(undefined)).toBe(false)
    expect(isQueryStateRecord([{ _id: "1" }])).toBe(false)
    expect(isQueryStateRecord(new Date())).toBe(false)
    expect(isQueryStateRecord(new Map())).toBe(false)
  })
})

describe("updateSingle", () => {
  it.each([
    undefined,
    null,
    true,
    false,
    0,
    1,
    "",
    "entity",
    1n,
    Symbol("entity"),
    () => undefined,
    [],
    new Date(),
    new Map(),
    new Set(),
  ])("returns unsupported input unchanged: %s", (current) => {
    expect(updateSingle(current, () => true, (entity) => entity)).toBe(current)
  })

  it("updates a matching top-level entity", () => {
    const current = { _id: "listing-1", rent: 10000, title: "A" }

    expect(
      updateSingle(current, byId("listing-1"), (entity) => ({
        ...entity,
        rent: 12000,
      })),
    ).toEqual({ _id: "listing-1", rent: 12000, title: "A" })
  })

  it("returns the same reference when the entity does not match", () => {
    const current = { _id: "listing-1", rent: 10000 }

    expect(
      updateSingle(current, byId("listing-2"), (entity) => ({
        ...entity,
        rent: 1,
      })),
    ).toBe(current)
  })

  it("returns the same reference when the updater returns the same object", () => {
    const current = { _id: "listing-1", rent: 10000 }

    expect(updateSingle(current, byId("listing-1"), (entity) => entity)).toBe(
      current,
    )
  })

  it("does not mutate the current entity during an immutable update", () => {
    const current = Object.freeze({ _id: "listing-1", rent: 10000 })

    const next = updateSingle(current, byId("listing-1"), (entity) => ({
      ...entity,
      rent: 12000,
    }))

    expect(current).toEqual({ _id: "listing-1", rent: 10000 })
    expect(next).toEqual({ _id: "listing-1", rent: 12000 })
    expect(next).not.toBe(current)
  })

  it("supports records with a null prototype", () => {
    const current = Object.assign(Object.create(null), {
      _id: "listing-1",
      rent: 10000,
    }) as Record<string, unknown>

    const next = updateSingle(current, byId("listing-1"), (entity) =>
      Object.assign(Object.create(null), entity, { rent: 12000 }),
    )

    expect(next).not.toBe(current)
    expect(next).toMatchObject({ _id: "listing-1", rent: 12000 })
    expect(Object.getPrototypeOf(next)).toBeNull()
  })

  it("leaves nested values alone", () => {
    const date = new Date("2026-01-01")
    expect(updateSingle(date, byId("x"), (entity) => entity)).toBe(date)

    const nested = { listing: { _id: "listing-1", rent: 1 } }
    expect(
      updateSingle(nested, byId("listing-1"), (entity) => ({
        ...entity,
        rent: 2,
      })),
    ).toBe(nested)
  })

  it("does not call the updater when current is invalid or does not match", () => {
    let updates = 0
    const update = (entity: Record<string, unknown>) => {
      updates += 1
      return entity
    }

    updateSingle(null, () => true, update)
    updateSingle({ _id: "1" }, () => false, update)

    expect(updates).toBe(0)
  })

  it("treats non-boolean matcher results as no match", () => {
    const current = { _id: "listing-1", rent: 10000 }

    expect(
      updateSingle(current, () => "yes" as never, (entity) => ({
        ...entity,
        rent: 1,
      })),
    ).toBe(current)
  })

  it("never throws on bad matchers, updaters, or updater results", () => {
    const current = { _id: "listing-1", rent: 10000 }

    expect(
      updateSingle(
        current,
        null as never,
        (entity) => ({ ...entity, rent: 1 }),
      ),
    ).toBe(current)
    expect(updateSingle(current, byId("listing-1"), null as never)).toBe(
      current,
    )
    expect(
      updateSingle(
        current,
        () => {
          throw new Error("match boom")
        },
        (entity) => ({ ...entity, rent: 1 }),
      ),
    ).toBe(current)
    expect(
      updateSingle(current, byId("listing-1"), () => {
        throw new Error("update boom")
      }),
    ).toBe(current)
    expect(
      updateSingle(current, byId("listing-1"), () => null as never),
    ).toBe(current)
    expect(
      updateSingle(current, byId("listing-1"), () => [1, 2] as never),
    ).toBe(current)
    expect(
      updateSingle(current, byId("listing-1"), () => "nope" as never),
    ).toBe(current)
    expect(
      updateSingle(current, byId("listing-1"), () => new Date() as never),
    ).toBe(current)
  })

  it("rejects async matcher and updater results without unhandled rejection", async () => {
    const current = { _id: "listing-1", rent: 10000 }

    expect(
      updateSingle(
        current,
        (() => Promise.resolve(true)) as never,
        (entity) => ({ ...entity, rent: 1 }),
      ),
    ).toBe(current)
    expect(
      updateSingle(
        current,
        (() => Promise.reject(new Error("async match"))) as never,
        (entity) => ({ ...entity, rent: 1 }),
      ),
    ).toBe(current)
    expect(
      updateSingle(
        current,
        byId("listing-1"),
        (() => Promise.resolve({ ...current, rent: 1 })) as never,
      ),
    ).toBe(current)
    expect(
      updateSingle(
        current,
        byId("listing-1"),
        (() => Promise.reject(new Error("async update"))) as never,
      ),
    ).toBe(current)

    await Promise.resolve()
  })

  it("never throws for revoked proxies", () => {
    const currentProxy = Proxy.revocable({ _id: "listing-1" }, {})
    currentProxy.revoke()

    expect(() =>
      updateSingle(currentProxy.proxy, () => true, (entity) => entity),
    ).not.toThrow()

    const resultProxy = Proxy.revocable({ _id: "listing-1" }, {})
    resultProxy.revoke()
    const current = { _id: "listing-1" }

    expect(
      updateSingle(
        current,
        byId("listing-1"),
        () => resultProxy.proxy as never,
      ),
    ).toBe(current)
  })
})

describe("updateSingleInQueries", () => {
  it("updates only matching single-resource query entries", () => {
    const queryClient = new QueryClient()
    const detailKey = ["listing", "listing-1"] as const
    const otherKey = ["listing", "listing-2"] as const

    queryClient.setQueryData(detailKey, {
      _id: "listing-1",
      rent: 10000,
    })
    queryClient.setQueryData(otherKey, {
      _id: "listing-2",
      rent: 20000,
    })

    updateSingleInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      (entity) => ({
        ...entity,
        rent: 15000,
      }),
    )

    expect(queryClient.getQueryData(detailKey)).toEqual({
      _id: "listing-1",
      rent: 15000,
    })
    expect(queryClient.getQueryData(otherKey)).toEqual({
      _id: "listing-2",
      rent: 20000,
    })
  })

  it("dedupes overlapping key prefixes", () => {
    const queryClient = new QueryClient()
    const detailKey = ["listing", "listing-1"] as const
    let updates = 0

    queryClient.setQueryData(detailKey, { _id: "listing-1", rent: 10000 })

    updateSingleInQueries(
      queryClient,
      [["listing"], ["listing", "listing-1"]],
      byId("listing-1"),
      (entity) => {
        updates += 1
        return { ...entity, rent: entity.rent === 10000 ? 11000 : entity.rent }
      },
    )

    expect(updates).toBe(1)
    expect(queryClient.getQueryData(detailKey)).toEqual({
      _id: "listing-1",
      rent: 11000,
    })
  })

  it("leaves flat and infinite collection cache shapes untouched", () => {
    const queryClient = new QueryClient()
    const flatKey = ["listing-search", "flat"] as const
    const infiniteKey = ["listing-search", "infinite"] as const
    const flat = { data: [{ _id: "listing-1" }], pagination: { total: 1 } }
    const infinite = {
      pages: [flat],
      pageParams: [1],
    }

    queryClient.setQueryData(flatKey, flat)
    queryClient.setQueryData(infiniteKey, infinite)

    updateSingleInQueries(
      queryClient,
      [["listing-search"]],
      byId("listing-1"),
      (entity) => ({ ...entity, rent: 1 }),
    )

    expect(queryClient.getQueryData(flatKey)).toBe(flat)
    expect(queryClient.getQueryData(infiniteKey)).toBe(infinite)
  })

  it("continues updating other queries when one updater call fails", () => {
    const queryClient = new QueryClient()
    const firstKey = ["listing", "listing-1"] as const
    const secondKey = ["listing", "listing-2"] as const

    queryClient.setQueryData(firstKey, { _id: "listing-1", rent: 10000 })
    queryClient.setQueryData(secondKey, { _id: "listing-2", rent: 20000 })

    updateSingleInQueries(
      queryClient,
      [["listing"]],
      () => true,
      (entity) => {
        if (entity._id === "listing-1") throw new Error("one bad cache entry")
        return { ...entity, rent: 25000 }
      },
    )

    expect(queryClient.getQueryData(firstKey)).toEqual({
      _id: "listing-1",
      rent: 10000,
    })
    expect(queryClient.getQueryData(secondKey)).toEqual({
      _id: "listing-2",
      rent: 25000,
    })
  })

  it("is a no-op for empty keys, missing cache data, or invalid callbacks", () => {
    const queryClient = new QueryClient()
    const existingKey = ["listing", "listing-1"] as const
    const existing = { _id: "listing-1", rent: 10000 }
    queryClient.setQueryData(existingKey, existing)

    updateSingleInQueries(queryClient, [], byId("listing-1"), (entity) => ({
      ...entity,
      rent: 1,
    }))
    updateSingleInQueries(
      queryClient,
      [["missing"]],
      byId("listing-1"),
      (entity) => ({ ...entity, rent: 1 }),
    )
    updateSingleInQueries(
      queryClient,
      [["listing"]],
      null as never,
      (entity) => entity,
    )
    updateSingleInQueries(
      queryClient,
      [["listing"]],
      byId("listing-1"),
      null as never,
    )

    expect(queryClient.getQueryData(existingKey)).toBe(existing)
    expect(queryClient.getQueryData(["missing"])).toBeUndefined()
  })

  it("is a no-op for invalid client or keys and never throws", () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(["listing", "listing-1"], {
      _id: "listing-1",
      rent: 10000,
    })

    expect(() =>
      updateSingleInQueries(
        null as never,
        [["listing"]],
        byId("listing-1"),
        (e) => e,
      ),
    ).not.toThrow()
    expect(() =>
      updateSingleInQueries(
        queryClient,
        null as never,
        byId("listing-1"),
        (e) => e,
      ),
    ).not.toThrow()
    expect(() =>
      updateSingleInQueries(
        queryClient,
        [null as never, "listing" as never, ["listing"]],
        byId("listing-1"),
        (e) => ({
          ...e,
          rent: 1,
        }),
      ),
    ).not.toThrow()

    expect(queryClient.getQueryData(["listing", "listing-1"])).toEqual({
      _id: "listing-1",
      rent: 1,
    })
  })

  it("never throws for revoked client or query-key proxies", () => {
    const clientProxy = Proxy.revocable(new QueryClient(), {})
    clientProxy.revoke()
    expect(() =>
      updateSingleInQueries(
        clientProxy.proxy,
        [["listing"]],
        byId("listing-1"),
        (entity) => entity,
      ),
    ).not.toThrow()

    const keysProxy = Proxy.revocable([["listing"]], {})
    keysProxy.revoke()
    expect(() =>
      updateSingleInQueries(
        new QueryClient(),
        keysProxy.proxy,
        byId("listing-1"),
        (entity) => entity,
      ),
    ).not.toThrow()
  })
})
