type InfinitePages<TPage> = {
  pages?: readonly TPage[] | null
} | null | undefined

export function uniqueItemsByKey<TItem>({
  items,
  getKey,
}: {
  items: readonly (TItem | null | undefined)[]
  getKey: (item: TItem) => string | null | undefined
}) {
  const seenKeys = new Set<string>()

  return items.filter((item): item is TItem => {
    if (item == null) return false

    const key = getKey(item)?.trim()
    if (!key || seenKeys.has(key)) return false

    seenKeys.add(key)
    return true
  })
}

export function flattenUniqueInfiniteItems<TPage, TItem>({
  data,
  getItems,
  getKey,
}: {
  data: InfinitePages<TPage>
  getItems: (page: TPage) => readonly (TItem | null | undefined)[]
  getKey: (item: TItem) => string | null | undefined
}) {
  return uniqueItemsByKey({
    items: (data?.pages ?? []).flatMap((page) => getItems(page)),
    getKey,
  })
}
