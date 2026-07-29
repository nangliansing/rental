import {
  hashKey,
  type QueryClient,
  type QueryKey,
  type QueryState,
} from "@tanstack/react-query"

export type OptimisticCachePlan = {
  /** Prefixes whose in-flight refetches could overwrite the optimistic write. */
  cancel: readonly QueryKey[]
  /** Prefixes whose concrete cached queries must be restored on failure. */
  snapshot?: readonly QueryKey[]
  /** Exact keys that may be created optimistically and must be removed on rollback. */
  snapshotExact?: readonly QueryKey[]
  /** Prefixes to mark stale after the mutation settles. */
  invalidate?: readonly QueryKey[]
}

type SnapshotEntry = {
  queryHash: string
  queryKey: QueryKey
  state: QueryState<unknown, Error>
}

export type OptimisticCacheSnapshot = {
  entries: readonly SnapshotEntry[]
  missingExactKeys: readonly QueryKey[]
}

export type OptimisticTransactionContext<TOptimisticContext> = {
  generation: number
  optimisticContext: TOptimisticContext
  plan: OptimisticCachePlan
  scopeKey: string
  snapshot: OptimisticCacheSnapshot
}

type CacheOperation =
  | "apply"
  | "cancel"
  | "invalidate"
  | "reconcile"
  | "rollback"
  | "snapshot"

type CacheErrorHandler = (input: {
  error: unknown
  operation: CacheOperation
}) => void

type TransactionInput<TVariables, TOptimisticContext> = {
  queryClient: QueryClient
  variables: TVariables
  optimisticContext: TOptimisticContext
}

type SettledInput<TData, TError, TVariables, TOptimisticContext> =
  TransactionInput<TVariables, TOptimisticContext> & {
    data: TData | undefined
    error: TError | null
  }

export type OptimisticTransactionConfig<
  TData,
  TError,
  TVariables,
  TOptimisticContext,
> = {
  queryClient: QueryClient
  getPlan: (variables: TVariables) => OptimisticCachePlan
  scopeKey: (variables: TVariables) => string
  apply: (
    input: Omit<
      TransactionInput<TVariables, TOptimisticContext>,
      "optimisticContext"
    >,
  ) => TOptimisticContext | Promise<TOptimisticContext>
  reconcile?: (
    input: TransactionInput<TVariables, TOptimisticContext> & {
      data: TData
    },
  ) => void | Promise<void>
  rollback?: (
    input: TransactionInput<TVariables, TOptimisticContext> & {
      error: TError
      snapshot: OptimisticCacheSnapshot
    },
  ) => void | Promise<void>
  shouldInvalidate?: (
    input: SettledInput<TData, TError, TVariables, TOptimisticContext>,
  ) => boolean
  onCacheError?: CacheErrorHandler
}

const MAX_TRACKED_SCOPES = 2_000
const generations = new WeakMap<QueryClient, Map<string, number>>()
let nextGeneration = 0

function reportCacheError(
  onCacheError: CacheErrorHandler | undefined,
  operation: CacheOperation,
  error: unknown,
) {
  try {
    onCacheError?.({ operation, error })
  } catch {
    // Diagnostics must never break mutation lifecycle handling.
  }
}

function uniqueKeys(keys: readonly QueryKey[]): QueryKey[] {
  const seen = new Set<string>()
  const unique: QueryKey[] = []

  for (const queryKey of keys) {
    const hash = hashKey(queryKey)
    if (seen.has(hash)) continue
    seen.add(hash)
    unique.push(queryKey)
  }

  return unique
}

function beginGeneration(queryClient: QueryClient, scopeKey: string): number {
  let scopes = generations.get(queryClient)
  if (!scopes) {
    scopes = new Map()
    generations.set(queryClient, scopes)
  }

  const generation = ++nextGeneration
  // Reinsert to maintain least-recently-used order.
  scopes.delete(scopeKey)
  scopes.set(scopeKey, generation)

  if (scopes.size > MAX_TRACKED_SCOPES) {
    const oldestScope = scopes.keys().next().value
    if (typeof oldestScope === "string") scopes.delete(oldestScope)
  }

  return generation
}

function isCurrentGeneration(
  queryClient: QueryClient,
  scopeKey: string,
  generation: number,
): boolean {
  return generations.get(queryClient)?.get(scopeKey) === generation
}

async function cancelPlan(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
) {
  const results = await Promise.allSettled(
    uniqueKeys(queryKeys).map(async queryKey =>
      queryClient.cancelQueries({ queryKey }),
    ),
  )
  const failures = results
    .filter(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected",
    )
    .map(result => result.reason)

  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      "Unable to cancel every query in the optimistic cache plan.",
    )
  }
}

export function captureOptimisticSnapshot(
  queryClient: QueryClient,
  familyKeys: readonly QueryKey[],
  exactKeys: readonly QueryKey[] = [],
): OptimisticCacheSnapshot {
  const entries = new Map<string, SnapshotEntry>()

  for (const queryKey of uniqueKeys(familyKeys)) {
    for (const query of queryClient.getQueryCache().findAll({ queryKey })) {
      if (entries.has(query.queryHash)) continue
      entries.set(query.queryHash, {
          queryHash: query.queryHash,
          queryKey: query.queryKey,
          state: query.state,
      })
    }
  }

  const missingExactKeys: QueryKey[] = []
  for (const queryKey of uniqueKeys(exactKeys)) {
    const query = queryClient.getQueryCache().find({
      queryKey,
      exact: true,
    })
    if (!query) {
      missingExactKeys.push(queryKey)
      continue
    }
    if (!entries.has(query.queryHash)) {
      entries.set(query.queryHash, {
        queryHash: query.queryHash,
        queryKey: query.queryKey,
        state: query.state,
      })
    }
  }

  return {
    entries: [...entries.values()],
    missingExactKeys,
  }
}

export function restoreOptimisticSnapshot(
  queryClient: QueryClient,
  snapshot: OptimisticCacheSnapshot,
  onCacheError?: CacheErrorHandler,
) {
  for (const queryKey of snapshot.missingExactKeys) {
    try {
      queryClient.removeQueries({ queryKey, exact: true })
    } catch (error) {
      reportCacheError(onCacheError, "rollback", error)
    }
  }

  for (const { queryKey, state } of snapshot.entries) {
    try {
      const queryCache = queryClient.getQueryCache()
      const existing = queryCache.find({ queryKey, exact: true })

      if (existing) {
        existing.setState(state)
      } else {
        queryCache.build(queryClient, { queryKey }, state)
      }
    } catch (error) {
      reportCacheError(onCacheError, "rollback", error)
    }
  }
}

async function invalidatePlan(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
  onCacheError?: CacheErrorHandler,
) {
  const results = await Promise.allSettled(
    uniqueKeys(queryKeys).map(async queryKey =>
      queryClient.invalidateQueries({
        queryKey,
        refetchType: "active",
      }),
    ),
  )

  for (const result of results) {
    if (result.status === "rejected") {
      reportCacheError(onCacheError, "invalidate", result.reason)
    }
  }
}

/**
 * Builds TanStack mutation lifecycle callbacks for one optimistic transaction.
 *
 * An older failed mutation never restores over a newer generation in the same
 * scope. The stale generation still invalidates its plan on settlement so the
 * server remains the final source of truth.
 */
export function createOptimisticTransaction<
  TData,
  TError = Error,
  TVariables = void,
  TOptimisticContext = void,
>(
  config: OptimisticTransactionConfig<
    TData,
    TError,
    TVariables,
    TOptimisticContext
  >,
) {
  const {
    queryClient,
    getPlan,
    scopeKey: getScopeKey,
    apply,
    reconcile,
    rollback,
    shouldInvalidate = () => true,
    onCacheError,
  } = config

  return {
    onMutate: async (
      variables: TVariables,
    ): Promise<OptimisticTransactionContext<TOptimisticContext>> => {
      const plan = getPlan(variables)
      const scopeKey = getScopeKey(variables)
      const generation = beginGeneration(queryClient, scopeKey)

      try {
        await cancelPlan(queryClient, plan.cancel)
      } catch (error) {
        reportCacheError(onCacheError, "cancel", error)
        throw error
      }

      let snapshot: OptimisticCacheSnapshot
      try {
        snapshot = captureOptimisticSnapshot(
          queryClient,
          plan.snapshot ?? plan.cancel,
          plan.snapshotExact,
        )
      } catch (error) {
        reportCacheError(onCacheError, "snapshot", error)
        throw error
      }

      try {
        const optimisticContext = await apply({ queryClient, variables })
        return {
          generation,
          optimisticContext,
          plan,
          scopeKey,
          snapshot,
        }
      } catch (error) {
        restoreOptimisticSnapshot(queryClient, snapshot, onCacheError)
        reportCacheError(onCacheError, "apply", error)
        throw error
      }
    },

    onError: async (
      error: TError,
      variables: TVariables,
      context:
        | OptimisticTransactionContext<TOptimisticContext>
        | undefined,
    ) => {
      if (!context) return
      if (
        !isCurrentGeneration(
          queryClient,
          context.scopeKey,
          context.generation,
        )
      ) {
        return
      }

      if (!rollback) {
        restoreOptimisticSnapshot(queryClient, context.snapshot, onCacheError)
        return
      }

      try {
        await rollback({
          queryClient,
          variables,
          optimisticContext: context.optimisticContext,
          error,
          snapshot: context.snapshot,
        })
      } catch (rollbackError) {
        reportCacheError(onCacheError, "rollback", rollbackError)
        restoreOptimisticSnapshot(
          queryClient,
          context.snapshot,
          onCacheError,
        )
      }
    },

    ...(reconcile
      ? {
          onSuccess: async (
            data: TData,
            variables: TVariables,
            context:
              | OptimisticTransactionContext<TOptimisticContext>
              | undefined,
          ) => {
            if (!context) return
            if (
              !isCurrentGeneration(
                queryClient,
                context.scopeKey,
                context.generation,
              )
            ) {
              return
            }

            try {
              await reconcile({
                queryClient,
                variables,
                optimisticContext: context.optimisticContext,
                data,
              })
            } catch (error) {
              reportCacheError(onCacheError, "reconcile", error)
            }
          },
        }
      : {}),

    onSettled: async (
      data: TData | undefined,
      error: TError | null,
      variables: TVariables,
      context:
        | OptimisticTransactionContext<TOptimisticContext>
        | undefined,
    ) => {
      if (!context) return

      let invalidate = true
      try {
        invalidate = shouldInvalidate({
          queryClient,
          variables,
          optimisticContext: context.optimisticContext,
          data,
          error,
        })
      } catch (cacheError) {
        reportCacheError(onCacheError, "invalidate", cacheError)
      }

      if (!invalidate) return
      await invalidatePlan(
        queryClient,
        context.plan.invalidate ?? [],
        onCacheError,
      )
    },
  } as const
}
