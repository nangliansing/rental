import type { QueryClient, QueryKey } from "@tanstack/react-query"

export type QueryCacheSnapshot = Array<{
  data: unknown
  queryKey: QueryKey
}>

export async function cancelQueriesByKey(
  queryClient: QueryClient,
  queryKeys: QueryKey[],
) {
  await Promise.all(
    queryKeys.map((queryKey) => queryClient.cancelQueries({ queryKey })),
  )
}

export function captureQueriesByKey(
  queryClient: QueryClient,
  queryKeys: QueryKey[],
) {
  const snapshots = new Map<string, QueryCacheSnapshot[number]>()

  queryKeys.forEach((queryKey) => {
    queryClient.getQueryCache().findAll({ queryKey }).forEach((query) => {
      snapshots.set(query.queryHash, {
        queryKey: query.queryKey,
        data: query.state.data,
      })
    })
  })

  return [...snapshots.values()]
}

export function restoreQueryCacheSnapshot(
  queryClient: QueryClient,
  snapshots: QueryCacheSnapshot,
) {
  snapshots.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data)
  })
}
