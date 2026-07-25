import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query"

export type StatusItem = { _id: string; status: string }
export type StatusPage<TItem extends StatusItem> = {
  data: TItem[]
  pagination: { total: number }
}
export type StatusInfiniteData<
  TItem extends StatusItem,
  TPage extends StatusPage<TItem>,
> = InfiniteData<TPage>

export type StatusCacheSnapshot<
  TItem extends StatusItem,
  TPage extends StatusPage<TItem>,
> = {
  detailData: TItem | undefined
  detailKey: QueryKey
  listData: [QueryKey, StatusInfiniteData<TItem, TPage> | undefined][]
}

export function statusFilterFromQueryKey(queryKey: QueryKey) {
  return typeof queryKey[1] === "string" ? queryKey[1] : undefined
}

export function findStatusItem<
  TItem extends StatusItem,
  TPage extends StatusPage<TItem>,
>(
  detail: TItem | undefined,
  lists: [QueryKey, StatusInfiniteData<TItem, TPage> | undefined][],
  itemId: string,
) {
  if (detail?._id === itemId) return detail

  for (const [, current] of lists) {
    const item = current?.pages
      .flatMap((page) => page.data)
      .find((candidate) => candidate._id === itemId)
    if (item) return item
  }

  return undefined
}

export function transitionStatusItemInInfiniteData<
  TItem extends StatusItem,
  TPage extends StatusPage<TItem>,
>(
  current: StatusInfiniteData<TItem, TPage> | undefined,
  statusFilter: string | undefined,
  transitionedItem: TItem,
): StatusInfiniteData<TItem, TPage> | undefined {
  if (!current) return current

  const containsItem = current.pages.some((page) =>
    page.data.some((item) => item._id === transitionedItem._id),
  )
  // Never insert into an absent paginated result. The server owns ordering,
  // filters, and page boundaries.
  if (!containsItem) return current

  const belongsInList =
    statusFilter === undefined ||
    statusFilter === "all" ||
    statusFilter === transitionedItem.status

  if (belongsInList) {
    return {
      ...current,
      pages: current.pages.map(
        (page) =>
          ({
            ...page,
            data: page.data.map((item) =>
              item._id === transitionedItem._id ? transitionedItem : item,
            ),
          }) as TPage,
      ),
    }
  }

  const removedCount = current.pages.reduce(
    (count, page) =>
      count +
      page.data.filter((item) => item._id === transitionedItem._id).length,
    0,
  )

  return {
    ...current,
    pages: current.pages.map(
      (page) =>
        ({
          ...page,
          data: page.data.filter((item) => item._id !== transitionedItem._id),
          pagination: {
            ...page.pagination,
            total: Math.max(0, page.pagination.total - removedCount),
          },
        }) as TPage,
    ),
  }
}

export async function captureStatusCache<
  TItem extends StatusItem,
  TPage extends StatusPage<TItem>,
>(
  queryClient: QueryClient,
  listsKey: QueryKey,
  detailKey: QueryKey,
): Promise<StatusCacheSnapshot<TItem, TPage>> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: listsKey }),
    queryClient.cancelQueries({ queryKey: detailKey }),
  ])

  return {
    detailKey,
    detailData: queryClient.getQueryData<TItem>(detailKey),
    listData: queryClient.getQueriesData<StatusInfiniteData<TItem, TPage>>({
      queryKey: listsKey,
    }),
  }
}

export function updateStatusCache<
  TItem extends StatusItem,
  TPage extends StatusPage<TItem>,
>(
  queryClient: QueryClient,
  snapshot: StatusCacheSnapshot<TItem, TPage>,
  item: TItem,
) {
  snapshot.listData.forEach(([queryKey]) => {
    queryClient.setQueryData<StatusInfiniteData<TItem, TPage>>(
      queryKey,
      (current) =>
        transitionStatusItemInInfiniteData(
          current,
          statusFilterFromQueryKey(queryKey),
          item,
        ),
    )
  })
  queryClient.setQueryData(snapshot.detailKey, item)
}

export function restoreStatusCache<
  TItem extends StatusItem,
  TPage extends StatusPage<TItem>,
>(
  queryClient: QueryClient,
  snapshot: StatusCacheSnapshot<TItem, TPage>,
) {
  snapshot.listData.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data)
  })
  queryClient.setQueryData(snapshot.detailKey, snapshot.detailData)
}

export async function invalidateStatusCache(
  queryClient: QueryClient,
  listsKey: QueryKey,
  detailKey: QueryKey,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: listsKey, refetchType: "active" }),
    queryClient.invalidateQueries({ queryKey: detailKey, refetchType: "active" }),
  ])
}
