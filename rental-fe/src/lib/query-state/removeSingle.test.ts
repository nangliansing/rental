import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import { removeSingle, removeSingleInQueries } from "./removeSingle"

const byId =
  (id: string) =>
  (value: Record<string, unknown>) =>
    value._id === id

describe("removeSingle", () => {
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
    [{ _id: "listing-1" }],
    new Date(),
    new Map(),
    new Set(),
  ])("returns unsupported input unchanged: %s", (current) => {
    expect(removeSingle(current, () => true)).toBe(current)
  })

  it("returns undefined when the top-level entity matches", () => {
    const current = { _id: "listing-1", rent: 10000 }
    expect(removeSingle(current, byId("listing-1"))).toBeUndefined()
  })

  it("returns the same reference when the entity does not match", () => {
    const current = { _id: "listing-1", rent: 10000 }
    expect(removeSingle(current, byId("listing-2"))).toBe(current)
  })

  it("does not mutate a frozen entity when leaving it unmatched", () => {
    const current = Object.freeze({ _id: "listing-1", rent: 10000 })
    expect(removeSingle(current, byId("listing-2"))).toBe(current)
    expect(current).toEqual({ _id: "listing-1", rent: 10000 })
  })

  it("removes a frozen matching entity by returning undefined", () => {
    const current = Object.freeze({ _id: "listing-1", rent: 10000 })
    expect(removeSingle(current, byId("listing-1"))).toBeUndefined()
    expect(current).toEqual({ _id: "listing-1", rent: 10000 })
  })

  it("leaves nested values alone", () => {
    const nested = { listing: { _id: "listing-1", rent: 1 } }
    expect(removeSingle(nested, byId("listing-1"))).toBe(nested)

    const wrapped = { data: { _id: "listing-1" }, pagination: { total: 1 } }
    expect(removeSingle(wrapped, byId("listing-1"))).toBe(wrapped)

    const infinite = {
      pages: [{ data: [{ _id: "listing-1" }] }],
      pageParams: [1],
    }
    expect(removeSingle(infinite, byId("listing-1"))).toBe(infinite)
  })

  it("supports records with a null prototype", () => {
    const current = Object.assign(Object.create(null), {
      _id: "listing-1",
      rent: 10000,
    }) as Record<string, unknown>

    expect(removeSingle(current, byId("listing-1"))).toBeUndefined()
    expect(removeSingle(current, byId("listing-2"))).toBe(current)
  })

  it("treats non-boolean matcher results as no match", () => {
    const current = { _id: "listing-1", rent: 10000 }
    expect(removeSingle(current, (() => "yes") as never)).toBe(current)
    expect(removeSingle(current, (() => 1) as never)).toBe(current)
    expect(removeSingle(current, (() => ({}) as never))).toBe(current)
    expect(removeSingle(current, (() => false) as never)).toBe(current)
  })

  it("never throws on bad matchers or async matcher results", async () => {
    const current = { _id: "listing-1", rent: 10000 }

    expect(removeSingle(current, null as never)).toBe(current)
    expect(removeSingle(current, undefined as never)).toBe(current)
    expect(removeSingle(current, 1 as never)).toBe(current)
    expect(
      removeSingle(current, () => {
        throw new Error("match boom")
      }),
    ).toBe(current)
    expect(
      removeSingle(current, (() => Promise.resolve(true)) as never),
    ).toBe(current)
    expect(
      removeSingle(current, (() => Promise.reject(new Error("async"))) as never),
    ).toBe(current)

    await Promise.resolve()
  })

  it("never throws for revoked proxies", () => {
    const currentProxy = Proxy.revocable({ _id: "listing-1" }, {})
    currentProxy.revoke()

    expect(() => removeSingle(currentProxy.proxy, () => true)).not.toThrow()
    expect(removeSingle(currentProxy.proxy, () => true)).toBe(currentProxy.proxy)
  })

  it("does not call matchers for non-record inputs", () => {
    const match = vi.fn(() => true)
    removeSingle(null, match)
    removeSingle([{ _id: "x" }], match)
    expect(match).not.toHaveBeenCalled()
  })
})

describe("removeSingleInQueries", () => {
  it("removes only matching single-resource query entries", () => {
    const queryClient = new QueryClient()
    const detailKey = ["listing", "listing-1"] as const
    const otherKey = ["listing", "listing-2"] as const

    queryClient.setQueryData(detailKey, { _id: "listing-1", rent: 10000 })
    queryClient.setQueryData(otherKey, { _id: "listing-2", rent: 20000 })

    removeSingleInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(detailKey)).toBeUndefined()
    expect(queryClient.getQueryState(detailKey)).toBeUndefined()
    expect(queryClient.getQueryData(otherKey)).toEqual({
      _id: "listing-2",
      rent: 20000,
    })
  })

  it("dedupes overlapping key prefixes", () => {
    const queryClient = new QueryClient()
    const detailKey = ["listing", "listing-1"] as const
    const removeQueries = vi.spyOn(queryClient, "removeQueries")

    queryClient.setQueryData(detailKey, { _id: "listing-1", rent: 10000 })

    removeSingleInQueries(
      queryClient,
      [["listing"], ["listing", "listing-1"]],
      byId("listing-1"),
    )

    expect(removeQueries).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(detailKey)).toBeUndefined()
  })

  it("leaves flat and infinite collection cache shapes untouched", () => {
    const queryClient = new QueryClient()
    const flatKey = ["listing-search", "flat"] as const
    const infiniteKey = ["listing-search", "infinite"] as const
    const flat = { data: [{ _id: "listing-1" }], pagination: { total: 1 } }
    const infinite = { pages: [flat], pageParams: [1] }

    queryClient.setQueryData(flatKey, flat)
    queryClient.setQueryData(infiniteKey, infinite)

    removeSingleInQueries(queryClient, [["listing-search"]], byId("listing-1"))

    expect(queryClient.getQueryData(flatKey)).toBe(flat)
    expect(queryClient.getQueryData(infiniteKey)).toBe(infinite)
  })

  it("does not clear queries whose cached value is not a matching single entity", () => {
    const queryClient = new QueryClient()
    const flatKey = ["listing", "flat"] as const
    const infiniteKey = ["listing", "infinite"] as const
    const otherKey = ["listing", "other"] as const
    const flat = { data: [{ _id: "listing-1" }], pagination: { total: 1 } }
    const infinite = { pages: [flat], pageParams: [1] }
    const other = { _id: "listing-2", rent: 20000 }

    queryClient.setQueryData(flatKey, flat)
    queryClient.setQueryData(infiniteKey, infinite)
    queryClient.setQueryData(otherKey, other)

    removeSingleInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(queryClient.getQueryData(flatKey)).toBe(flat)
    expect(queryClient.getQueryData(infiniteKey)).toBe(infinite)
    expect(queryClient.getQueryData(otherKey)).toBe(other)
  })

  it("continues removing other queries when one clear path fully fails", () => {
    const firstKey = ["listing", "listing-1"] as const
    const secondKey = ["listing", "listing-2"] as const
    const store = new Map<string, unknown>([
      [JSON.stringify(firstKey), { _id: "listing-1", rent: 10000 }],
      [JSON.stringify(secondKey), { _id: "listing-2", rent: 20000 }],
    ])

    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [
          { queryHash: "listing-1", queryKey: firstKey },
          { queryHash: "listing-2", queryKey: secondKey },
        ],
      }),
      getQueryData: (key: unknown) => store.get(JSON.stringify(key)),
      removeQueries: ({ queryKey }: { queryKey: unknown }) => {
        if (JSON.stringify(queryKey) === JSON.stringify(firstKey)) {
          throw new Error("remove failed")
        }
        store.delete(JSON.stringify(queryKey))
      },
      setQueryData: (key: unknown, value: unknown) => {
        if (JSON.stringify(key) === JSON.stringify(firstKey)) {
          throw new Error("set failed too")
        }
        store.set(JSON.stringify(key), value)
      },
    } as unknown as QueryClient

    expect(() =>
      removeSingleInQueries(queryClient, [["listing"]], () => true),
    ).not.toThrow()

    expect(store.get(JSON.stringify(firstKey))).toEqual({
      _id: "listing-1",
      rent: 10000,
    })
    expect(store.has(JSON.stringify(secondKey))).toBe(false)
  })

  it("falls back to setQueryData(undefined) when removeQueries is unavailable", () => {
    const detailKey = ["listing", "listing-1"] as const
    let data: unknown = { _id: "listing-1", rent: 10000 }
    const setQueryData = vi.fn((_key: unknown, value: unknown) => {
      data = value
    })

    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [{ queryHash: "listing-1", queryKey: detailKey }],
      }),
      getQueryData: () => data,
      setQueryData,
    } as unknown as QueryClient

    removeSingleInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(setQueryData).toHaveBeenCalledWith(detailKey, undefined)
    expect(data).toBeUndefined()
  })

  it("falls back to setQueryData(undefined) when removeQueries throws", () => {
    const detailKey = ["listing", "listing-1"] as const
    let data: unknown = { _id: "listing-1", rent: 10000 }
    const setQueryData = vi.fn((_key: unknown, value: unknown) => {
      data = value
    })
    const removeQueries = vi.fn(() => {
      throw new Error("removeQueries unavailable")
    })

    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [{ queryHash: "listing-1", queryKey: detailKey }],
      }),
      getQueryData: () => data,
      removeQueries,
      setQueryData,
    } as unknown as QueryClient

    expect(() =>
      removeSingleInQueries(queryClient, [["listing"]], byId("listing-1")),
    ).not.toThrow()

    expect(removeQueries).toHaveBeenCalled()
    expect(setQueryData).toHaveBeenCalledWith(detailKey, undefined)
    expect(data).toBeUndefined()
  })

  it("does not clear when getQueryData fails", () => {
    const detailKey = ["listing", "listing-1"] as const
    const removeQueries = vi.fn()
    const setQueryData = vi.fn()

    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [{ queryHash: "listing-1", queryKey: detailKey }],
      }),
      getQueryData: () => {
        throw new Error("read failed")
      },
      removeQueries,
      setQueryData,
    } as unknown as QueryClient

    expect(() =>
      removeSingleInQueries(queryClient, [["listing"]], byId("listing-1")),
    ).not.toThrow()
    expect(removeQueries).not.toHaveBeenCalled()
    expect(setQueryData).not.toHaveBeenCalled()
  })

  it("does not clear when getQueryData is missing", () => {
    const detailKey = ["listing", "listing-1"] as const
    const removeQueries = vi.fn()
    const setQueryData = vi.fn()

    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [{ queryHash: "listing-1", queryKey: detailKey }],
      }),
      removeQueries,
      setQueryData,
    } as unknown as QueryClient

    expect(() =>
      removeSingleInQueries(queryClient, [["listing"]], byId("listing-1")),
    ).not.toThrow()
    expect(removeQueries).not.toHaveBeenCalled()
    expect(setQueryData).not.toHaveBeenCalled()
  })

  it("skips entries whose queryKey is not a valid key array", () => {
    const removeQueries = vi.fn()
    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [
          { queryHash: "bad", queryKey: "listing" },
          {
            queryHash: "good",
            queryKey: ["listing", "listing-1"],
          },
        ],
      }),
      getQueryData: (key: unknown) =>
        Array.isArray(key) && key[1] === "listing-1"
          ? { _id: "listing-1" }
          : undefined,
      removeQueries,
      setQueryData: vi.fn(),
    } as unknown as QueryClient

    removeSingleInQueries(queryClient, [["listing"]], byId("listing-1"))

    expect(removeQueries).toHaveBeenCalledTimes(1)
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: ["listing", "listing-1"],
      exact: true,
    })
  })

  it("is a no-op for empty keys, missing cache data, or invalid callbacks", () => {
    const queryClient = new QueryClient()
    const existingKey = ["listing", "listing-1"] as const
    const existing = { _id: "listing-1", rent: 10000 }
    queryClient.setQueryData(existingKey, existing)

    removeSingleInQueries(queryClient, [], byId("listing-1"))
    removeSingleInQueries(queryClient, [["missing"]], byId("listing-1"))
    removeSingleInQueries(queryClient, [["listing"]], null as never)
    removeSingleInQueries(queryClient, [["listing"]], undefined as never)
    removeSingleInQueries(queryClient, [["listing"]], 1 as never)

    expect(queryClient.getQueryData(existingKey)).toBe(existing)
    expect(queryClient.getQueryData(["missing"])).toBeUndefined()
  })

  it("never throws for invalid client, keys, or revoked proxies", () => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(["listing", "listing-1"], {
      _id: "listing-1",
      rent: 10000,
    })

    expect(() =>
      removeSingleInQueries(null as never, [["listing"]], byId("listing-1")),
    ).not.toThrow()
    expect(() =>
      removeSingleInQueries(queryClient, null as never, byId("listing-1")),
    ).not.toThrow()
    expect(() =>
      removeSingleInQueries(
        queryClient,
        [null as never, "listing" as never, ["listing"]],
        byId("listing-2"),
      ),
    ).not.toThrow()

    const clientProxy = Proxy.revocable(new QueryClient(), {})
    clientProxy.revoke()
    expect(() =>
      removeSingleInQueries(
        clientProxy.proxy,
        [["listing"]],
        byId("listing-1"),
      ),
    ).not.toThrow()

    const keysProxy = Proxy.revocable([["listing"]], {})
    keysProxy.revoke()
    expect(() =>
      removeSingleInQueries(
        new QueryClient(),
        keysProxy.proxy,
        byId("listing-1"),
      ),
    ).not.toThrow()
  })

  it("never throws when removeQueries and setQueryData both throw", () => {
    const detailKey = ["listing", "listing-1"] as const
    const queryClient = {
      getQueryCache: () => ({
        findAll: () => [{ queryHash: "listing-1", queryKey: detailKey }],
      }),
      getQueryData: () => ({ _id: "listing-1" }),
      removeQueries: () => {
        throw new Error("remove")
      },
      setQueryData: () => {
        throw new Error("set")
      },
    } as unknown as QueryClient

    expect(() =>
      removeSingleInQueries(queryClient, [["listing"]], byId("listing-1")),
    ).not.toThrow()
  })
})
