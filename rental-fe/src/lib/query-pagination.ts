type PagePagination = {
  page: number
  limit: number
  total: number
}

/**
 * Shared page-number pagination for `useInfiniteQuery`.
 * Malformed server pagination terminates fetching instead of creating an
 * unbounded request loop.
 */
export function getNextPageParam(lastPage: {
  pagination: PagePagination
}): number | undefined {
  const { page, limit, total } = lastPage.pagination

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    !Number.isSafeInteger(total) ||
    total < 0
  ) {
    return undefined
  }

  return page * limit < total ? page + 1 : undefined
}

/** Converts an unknown TanStack pageParam into a safe positive page number. */
export function readPageParam(pageParam: unknown): number {
  const page =
    typeof pageParam === "number"
      ? pageParam
      : typeof pageParam === "string" && pageParam.trim() !== ""
        ? Number(pageParam)
        : Number.NaN

  return Number.isSafeInteger(page) && page > 0 ? page : 1
}
