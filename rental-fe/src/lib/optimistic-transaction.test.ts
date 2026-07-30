import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

import {
  captureOptimisticSnapshot,
  createOptimisticTransaction,
  restoreOptimisticSnapshot,
} from "./optimistic-transaction"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

describe("optimistic transaction snapshots", () => {
  it("deduplicates overlapping query families", () => {
    const queryClient = createQueryClient()
    queryClient.setQueryData(["listings", "list", "public"], ["a"])
    queryClient.setQueryData(["listings", "detail", "1"], { id: "1" })

    const snapshot = captureOptimisticSnapshot(queryClient, [
      ["listings"],
      ["listings", "list"],
      ["listings"],
    ])

    expect(snapshot.entries).toHaveLength(2)
  })

  it("restores previous data and removes exact entries created optimistically", () => {
    const queryClient = createQueryClient()
    const existingKey = ["listing", "1"] as const
    const createdKey = ["listing", "optimistic"] as const
    queryClient.setQueryData(existingKey, { rent: 10_000 })

    const snapshot = captureOptimisticSnapshot(
      queryClient,
      [existingKey],
      [createdKey],
    )

    queryClient.setQueryData(existingKey, { rent: 20_000 })
    queryClient.setQueryData(createdKey, { rent: 30_000 })
    restoreOptimisticSnapshot(queryClient, snapshot)

    expect(queryClient.getQueryData(existingKey)).toEqual({ rent: 10_000 })
    expect(queryClient.getQueryState(createdKey)).toBeUndefined()
  })

  it("continues restoration when one cache operation throws", () => {
    const queryClient = createQueryClient()
    const firstKey = ["listing", "1"] as const
    const secondKey = ["listing", "2"] as const
    queryClient.setQueryData(firstKey, { rent: 10_000 })
    queryClient.setQueryData(secondKey, { rent: 20_000 })
    const snapshot = captureOptimisticSnapshot(queryClient, [
      firstKey,
      secondKey,
    ])
    queryClient.setQueryData(firstKey, { rent: 30_000 })
    queryClient.setQueryData(secondKey, { rent: 40_000 })

    const cacheErrors: unknown[] = []
    const firstQuery = queryClient.getQueryCache().find({
      queryKey: firstKey,
      exact: true,
    })
    if (!firstQuery) throw new Error("Expected the first test query.")
    vi.spyOn(firstQuery, "setState").mockImplementation(() => {
      throw new Error("broken cache entry")
    })

    restoreOptimisticSnapshot(queryClient, snapshot, input => {
      cacheErrors.push(input)
    })

    expect(queryClient.getQueryData(secondKey)).toEqual({ rent: 20_000 })
    expect(cacheErrors).toHaveLength(1)
  })

  it("restores the full previous query state, including undefined data", () => {
    const queryClient = createQueryClient()
    const key = ["listing", "pending"] as const
    const query = queryClient.getQueryCache().build(queryClient, {
      queryKey: key,
    })
    const previousState = query.state
    const snapshot = captureOptimisticSnapshot(queryClient, [key])

    queryClient.setQueryData(key, { optimistic: true })
    restoreOptimisticSnapshot(queryClient, snapshot)

    expect(queryClient.getQueryState(key)).toEqual(previousState)
    expect(queryClient.getQueryData(key)).toBeUndefined()
  })

  it("recreates a snapshotted query that was removed during optimism", () => {
    const queryClient = createQueryClient()
    const key = ["listing", "1"] as const
    queryClient.setQueryData(key, { rent: 10_000 })
    const previousState = queryClient.getQueryState(key)
    const snapshot = captureOptimisticSnapshot(queryClient, [key])

    queryClient.removeQueries({ queryKey: key, exact: true })
    restoreOptimisticSnapshot(queryClient, snapshot)

    expect(queryClient.getQueryState(key)).toEqual(previousState)
    expect(queryClient.getQueryData(key)).toEqual({ rent: 10_000 })
  })
})

describe("createOptimisticTransaction", () => {
  it("cancels, snapshots, applies, reconciles, and invalidates once per key", async () => {
    const queryClient = createQueryClient()
    const family = ["listings"] as const
    const detailKey = ["listings", "detail", "1"] as const
    queryClient.setQueryData(detailKey, { rent: 10_000 })
    const cancelSpy = vi.spyOn(queryClient, "cancelQueries")
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const reconcile = vi.fn(({ queryClient: client, data }) => {
      client.setQueryData(detailKey, data)
    })

    const transaction = createOptimisticTransaction<
      { rent: number },
      Error,
      { id: string; rent: number },
      { previousRent: number }
    >({
      queryClient,
      scopeKey: variables => `listing:${variables.id}`,
      getPlan: () => ({
        cancel: [family, family],
        snapshot: [family, family],
        invalidate: [family, family],
      }),
      apply: ({ variables }) => {
        const previous = queryClient.getQueryData<{ rent: number }>(detailKey)
        queryClient.setQueryData(detailKey, { rent: variables.rent })
        return { previousRent: previous?.rent ?? 0 }
      },
      reconcile,
    })

    const variables = { id: "1", rent: 20_000 }
    const context = await transaction.onMutate(variables)
    await transaction.onSuccess({ rent: 21_000 }, variables, context)
    await transaction.onSettled(
      { rent: 21_000 },
      null,
      variables,
      context,
    )

    expect(cancelSpy).toHaveBeenCalledTimes(1)
    expect(reconcile).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(detailKey)).toEqual({ rent: 21_000 })
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: family,
      refetchType: "active",
    })
  })

  it("rolls back the current generation on error", async () => {
    const queryClient = createQueryClient()
    const detailKey = ["listing", "1"] as const
    queryClient.setQueryData(detailKey, { rent: 10_000 })

    const transaction = createOptimisticTransaction<
      never,
      Error,
      { rent: number }
    >({
      queryClient,
      scopeKey: () => "listing:1",
      getPlan: () => ({ cancel: [detailKey] }),
      apply: ({ variables }) => {
        queryClient.setQueryData(detailKey, { rent: variables.rent })
      },
    })

    const variables = { rent: 20_000 }
    const context = await transaction.onMutate(variables)
    await transaction.onError(new Error("failed"), variables, context)

    expect(queryClient.getQueryData(detailKey)).toEqual({ rent: 10_000 })
  })

  it("restores immediately when the optimistic apply step throws", async () => {
    const queryClient = createQueryClient()
    const detailKey = ["listing", "1"] as const
    queryClient.setQueryData(detailKey, { rent: 10_000 })

    const transaction = createOptimisticTransaction<
      never,
      Error,
      { rent: number }
    >({
      queryClient,
      scopeKey: () => "listing:1",
      getPlan: () => ({ cancel: [detailKey] }),
      apply: ({ variables }) => {
        queryClient.setQueryData(detailKey, { rent: variables.rent })
        throw new Error("apply failed")
      },
    })

    await expect(transaction.onMutate({ rent: 20_000 })).rejects.toThrow(
      "apply failed",
    )
    expect(queryClient.getQueryData(detailKey)).toEqual({ rent: 10_000 })
  })

  it("does not apply when cancellation fails", async () => {
    const queryClient = createQueryClient()
    const apply = vi.fn()
    vi.spyOn(queryClient, "cancelQueries").mockRejectedValue(
      new Error("cancel failed"),
    )

    const transaction = createOptimisticTransaction<
      never,
      Error,
      string
    >({
      queryClient,
      scopeKey: id => id,
      getPlan: () => ({ cancel: [["listing"]] }),
      apply,
    })

    await expect(transaction.onMutate("1")).rejects.toThrow(
      "Unable to cancel every query",
    )
    expect(apply).not.toHaveBeenCalled()
  })

  it("attempts every planned cancellation before rejecting", async () => {
    const queryClient = createQueryClient()
    const cancel = vi
      .spyOn(queryClient, "cancelQueries")
      .mockRejectedValueOnce(new Error("first cancellation failed"))
      .mockResolvedValue(undefined)
    const apply = vi.fn()
    const transaction = createOptimisticTransaction<never, Error>({
      queryClient,
      scopeKey: () => "listing:1",
      getPlan: () => ({
        cancel: [["listing", "1"], ["listing", "2"]],
      }),
      apply,
    })

    await expect(transaction.onMutate()).rejects.toThrow(
      "Unable to cancel every query",
    )

    expect(cancel).toHaveBeenCalledTimes(2)
    expect(apply).not.toHaveBeenCalled()
  })

  it("does not apply when a complete snapshot cannot be captured", async () => {
    const queryClient = createQueryClient()
    const apply = vi.fn()
    vi.spyOn(queryClient.getQueryCache(), "findAll").mockImplementation(() => {
      throw new Error("snapshot failed")
    })

    const transaction = createOptimisticTransaction<
      never,
      Error,
      string
    >({
      queryClient,
      scopeKey: id => id,
      getPlan: () => ({
        cancel: [],
        snapshot: [["listing"]],
      }),
      apply,
    })

    await expect(transaction.onMutate("1")).rejects.toThrow("snapshot failed")
    expect(apply).not.toHaveBeenCalled()
  })

  it("is safe when no matching cache entries exist", async () => {
    const queryClient = createQueryClient()
    const absentKey = ["listing", "absent"] as const
    const transaction = createOptimisticTransaction<never, Error>({
      queryClient,
      scopeKey: () => "listing:absent",
      getPlan: () => ({
        cancel: [absentKey],
        snapshot: [absentKey],
      }),
      apply: () => undefined,
    })

    const context = await transaction.onMutate()
    await expect(
      transaction.onError(new Error("failed"), undefined, context),
    ).resolves.toBeUndefined()

    expect(queryClient.getQueryData(absentKey)).toBeUndefined()
    expect(
      queryClient.getQueryCache().find({ queryKey: absentKey, exact: true }),
    ).toBeUndefined()
  })

  it("tolerates missing context in every post-mutation callback", async () => {
    const queryClient = createQueryClient()
    const reconcile = vi.fn()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    const transaction = createOptimisticTransaction<string, Error>({
      queryClient,
      scopeKey: () => "listing:1",
      getPlan: () => ({
        cancel: [],
        invalidate: [["listing"]],
      }),
      apply: () => undefined,
      reconcile,
    })

    await expect(
      transaction.onError(new Error("failed"), undefined, undefined),
    ).resolves.toBeUndefined()
    await expect(
      transaction.onSuccess("server", undefined, undefined),
    ).resolves.toBeUndefined()
    await expect(
      transaction.onSettled("server", null, undefined, undefined),
    ).resolves.toBeUndefined()

    expect(reconcile).not.toHaveBeenCalled()
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("skips a stale rollback that would overwrite a newer mutation", async () => {
    const queryClient = createQueryClient()
    const detailKey = ["listing", "1"] as const
    queryClient.setQueryData(detailKey, { rent: 10_000 })

    const transaction = createOptimisticTransaction<
      never,
      Error,
      { rent: number }
    >({
      queryClient,
      scopeKey: () => "listing:1",
      getPlan: () => ({
        cancel: [detailKey],
        invalidate: [detailKey],
      }),
      apply: ({ variables }) => {
        queryClient.setQueryData(detailKey, { rent: variables.rent })
      },
    })

    const firstVariables = { rent: 20_000 }
    const firstContext = await transaction.onMutate(firstVariables)
    const secondVariables = { rent: 30_000 }
    const secondContext = await transaction.onMutate(secondVariables)

    await transaction.onError(
      new Error("older failed"),
      firstVariables,
      firstContext,
    )
    expect(queryClient.getQueryData(detailKey)).toEqual({ rent: 30_000 })

    await transaction.onError(
      new Error("newer failed"),
      secondVariables,
      secondContext,
    )
    expect(queryClient.getQueryData(detailKey)).toEqual({ rent: 20_000 })
  })

  it("keeps independent mutation scopes isolated", async () => {
    const queryClient = createQueryClient()
    const firstKey = ["listing", "1"] as const
    const secondKey = ["listing", "2"] as const
    queryClient.setQueryData(firstKey, { rent: 10_000 })
    queryClient.setQueryData(secondKey, { rent: 20_000 })

    const transaction = createOptimisticTransaction<
      never,
      Error,
      { id: string; rent: number }
    >({
      queryClient,
      scopeKey: variables => `listing:${variables.id}`,
      getPlan: variables => ({
        cancel: [["listing", variables.id]],
      }),
      apply: ({ variables }) => {
        queryClient.setQueryData(
          ["listing", variables.id],
          { rent: variables.rent },
        )
      },
    })

    const firstVariables = { id: "1", rent: 30_000 }
    const secondVariables = { id: "2", rent: 40_000 }
    const firstContext = await transaction.onMutate(firstVariables)
    const secondContext = await transaction.onMutate(secondVariables)

    await transaction.onError(
      new Error("first failed"),
      firstVariables,
      firstContext,
    )

    expect(queryClient.getQueryData(firstKey)).toEqual({ rent: 10_000 })
    expect(queryClient.getQueryData(secondKey)).toEqual({ rent: 40_000 })

    await transaction.onError(
      new Error("second failed"),
      secondVariables,
      secondContext,
    )
    expect(queryClient.getQueryData(secondKey)).toEqual({ rent: 20_000 })
  })

  it("skips stale server reconciliation from an older generation", async () => {
    const queryClient = createQueryClient()
    const detailKey = ["listing", "1"] as const
    const reconcile = vi.fn(({ data }) => {
      queryClient.setQueryData(detailKey, data)
    })

    const transaction = createOptimisticTransaction<
      { rent: number },
      Error,
      { rent: number }
    >({
      queryClient,
      scopeKey: () => "listing:1",
      getPlan: () => ({ cancel: [detailKey] }),
      apply: ({ variables }) => {
        queryClient.setQueryData(detailKey, variables)
      },
      reconcile,
    })

    const firstVariables = { rent: 20_000 }
    const firstContext = await transaction.onMutate(firstVariables)
    const secondVariables = { rent: 30_000 }
    const secondContext = await transaction.onMutate(secondVariables)

    await transaction.onSuccess({ rent: 21_000 }, firstVariables, firstContext)
    expect(reconcile).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(detailKey)).toEqual({ rent: 30_000 })

    await transaction.onSuccess(
      { rent: 31_000 },
      secondVariables,
      secondContext,
    )
    expect(reconcile).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(detailKey)).toEqual({ rent: 31_000 })
  })

  it("isolates reconciliation and diagnostics failures", async () => {
    const queryClient = createQueryClient()
    const transaction = createOptimisticTransaction<string, Error, string>({
      queryClient,
      scopeKey: id => id,
      getPlan: () => ({ cancel: [] }),
      apply: () => undefined,
      reconcile: () => {
        throw new Error("reconcile failed")
      },
      onCacheError: () => {
        throw new Error("diagnostics failed")
      },
    })

    const context = await transaction.onMutate("1")
    await expect(
      transaction.onSuccess("server", "1", context),
    ).resolves.toBeUndefined()
  })

  it("supports domain-aware rollback without discarding concurrent cache updates", async () => {
    const queryClient = createQueryClient()
    const notificationsKey = ["notifications", "me"] as const
    queryClient.setQueryData(notificationsKey, {
      unread: ["existing"],
      received: [] as string[],
    })

    const transaction = createOptimisticTransaction<
      never,
      Error,
      void,
      { previouslyUnread: string[] }
    >({
      queryClient,
      scopeKey: () => "notifications:me",
      getPlan: () => ({ cancel: [notificationsKey] }),
      apply: () => {
        const current = queryClient.getQueryData<{
          unread: string[]
          received: string[]
        }>(notificationsKey)
        queryClient.setQueryData(notificationsKey, {
          ...current,
          unread: [],
        })
        return { previouslyUnread: current?.unread ?? [] }
      },
      rollback: ({ optimisticContext }) => {
        queryClient.setQueryData<{
          unread: string[]
          received: string[]
        }>(notificationsKey, current => ({
          unread: optimisticContext.previouslyUnread,
          received: current?.received ?? [],
        }))
      },
    })

    const context = await transaction.onMutate()
    queryClient.setQueryData(notificationsKey, {
      unread: [],
      received: ["socket-event"],
    })
    await transaction.onError(new Error("failed"), undefined, context)

    expect(queryClient.getQueryData(notificationsKey)).toEqual({
      unread: ["existing"],
      received: ["socket-event"],
    })
  })

  it("falls back to the captured snapshot when custom rollback fails", async () => {
    const queryClient = createQueryClient()
    const detailKey = ["listing", "1"] as const
    const cacheErrors: Array<{ operation: string; error: unknown }> = []
    queryClient.setQueryData(detailKey, { rent: 10_000 })

    const transaction = createOptimisticTransaction<never, Error>({
      queryClient,
      scopeKey: () => "listing:1",
      getPlan: () => ({ cancel: [detailKey] }),
      apply: () => {
        queryClient.setQueryData(detailKey, { rent: 20_000 })
      },
      rollback: () => {
        throw new Error("domain rollback failed")
      },
      onCacheError: error => cacheErrors.push(error),
    })

    const context = await transaction.onMutate()
    await transaction.onError(new Error("mutation failed"), undefined, context)

    expect(queryClient.getQueryData(detailKey)).toEqual({ rent: 10_000 })
    expect(cacheErrors).toEqual([
      expect.objectContaining({ operation: "rollback" }),
    ])
  })

  it("supports conditional invalidation and isolates invalidation failures", async () => {
    const queryClient = createQueryClient()
    const cacheErrors: unknown[] = []
    const invalidateSpy = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockRejectedValue(new Error("invalidate failed"))

    const transaction = createOptimisticTransaction<
      string,
      Error,
      string
    >({
      queryClient,
      scopeKey: id => id,
      getPlan: () => ({
        cancel: [],
        invalidate: [["listing"]],
      }),
      apply: () => undefined,
      shouldInvalidate: ({ error }) => error === null,
      onCacheError: input => cacheErrors.push(input),
    })

    const context = await transaction.onMutate("1")
    await transaction.onSettled(undefined, new Error("failed"), "1", context)
    expect(invalidateSpy).not.toHaveBeenCalled()

    await transaction.onSettled("ok", null, "1", context)
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(cacheErrors).toHaveLength(1)
  })

  it("attempts every invalidation when one query family fails", async () => {
    const queryClient = createQueryClient()
    const cacheErrors: unknown[] = []
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockRejectedValueOnce(new Error("first invalidation failed"))
      .mockResolvedValue(undefined)
    const transaction = createOptimisticTransaction<string, Error>({
      queryClient,
      scopeKey: () => "listing:1",
      getPlan: () => ({
        cancel: [],
        invalidate: [["listing"], ["map-search"]],
      }),
      apply: () => undefined,
      onCacheError: error => cacheErrors.push(error),
    })

    const context = await transaction.onMutate("1")
    await transaction.onSettled("ok", null, "1", context)

    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(cacheErrors).toEqual([
      expect.objectContaining({ operation: "invalidate" }),
    ])
  })

  it("falls back to invalidation when its predicate throws", async () => {
    const queryClient = createQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const transaction = createOptimisticTransaction<string, Error, string>({
      queryClient,
      scopeKey: id => id,
      getPlan: () => ({
        cancel: [],
        invalidate: [["listing"]],
      }),
      apply: () => undefined,
      shouldInvalidate: () => {
        throw new Error("predicate failed")
      },
    })

    const context = await transaction.onMutate("1")
    await transaction.onSettled("ok", null, "1", context)

    expect(invalidateSpy).toHaveBeenCalledTimes(1)
  })
})
