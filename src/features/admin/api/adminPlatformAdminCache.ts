import type { InfiniteData } from "@tanstack/react-query"

import type { SearchAdminPlatformAdminsResponse } from "./searchAdminPlatformAdmins"

export type AdminPlatformAdminsInfiniteData = InfiniteData<
  SearchAdminPlatformAdminsResponse
>

export function removePlatformAdminFromInfiniteData(
  current: AdminPlatformAdminsInfiniteData | undefined,
  userId: string,
) {
  if (!current) return current

  const removedCount = current.pages.reduce(
    (count, page) =>
      count + page.data.filter((admin) => admin._id === userId).length,
    0,
  )
  if (removedCount === 0) return current

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: page.data.filter((admin) => admin._id !== userId),
      pagination: {
        ...page.pagination,
        total: Math.max(0, page.pagination.total - removedCount),
      },
    })),
  }
}
