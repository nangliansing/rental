import type { QueryClient, QueryKey } from "@tanstack/react-query"

import type { AuthUser } from "@/features/auth/types"
import { queryKeys } from "@/lib/query-keys"

export type AdminUserProjectionSnapshot = Array<{
  data: unknown
  queryKey: QueryKey
}>

export const adminUserProjectionKeys = (userId: string): QueryKey[] => [
  queryKeys.admin.users.detail(userId),
  queryKeys.admin.pendingPosts.lists,
  queryKeys.admin.buildingEditRequests.lists,
  queryKeys.admin.buildingEditRequests.details,
  queryKeys.admin.reports.lists,
  queryKeys.admin.reports.details,
  queryKeys.admin.reviewReports.lists,
  queryKeys.admin.reviewReports.details,
  queryKeys.admin.suspensions.lists,
  queryKeys.admin.suspensions.details,
]

export async function captureAdminUserProjections(
  queryClient: QueryClient,
  userId: string,
) {
  const keys = adminUserProjectionKeys(userId)
  await Promise.all(
    keys.map((queryKey) => queryClient.cancelQueries({ queryKey })),
  )

  const captured = new Map<string, AdminUserProjectionSnapshot[number]>()
  keys.forEach((queryKey) => {
    queryClient.getQueryCache().findAll({ queryKey }).forEach((query) => {
      captured.set(query.queryHash, {
        queryKey: query.queryKey,
        data: query.state.data,
      })
    })
  })
  return [...captured.values()]
}

function patchUser<T>(value: T, userId: string, changes: Partial<AuthUser>): T {
  if (Array.isArray(value)) {
    return value.map((item) => patchUser(item, userId, changes)) as T
  }
  if (!value || typeof value !== "object") return value

  const record = value as Record<string, unknown>
  let next = record
  const isUserProjection =
    record._id === userId &&
    typeof record.status === "string" &&
    (typeof record.email === "string" || "authProvider" in record)

  if (isUserProjection) next = { ...record, ...changes }

  for (const [key, child] of Object.entries(next)) {
    const patched = patchUser(child, userId, changes)
    if (patched === child) continue
    if (next === record) next = { ...record }
    next[key] = patched
  }
  return next as T
}

export function patchAdminUserProjections(
  queryClient: QueryClient,
  userId: string,
  changes: Partial<AuthUser>,
) {
  adminUserProjectionKeys(userId).forEach((queryKey) => {
    queryClient.setQueriesData({ queryKey }, (current: unknown) =>
      patchUser(current, userId, changes),
    )
  })
}

export function restoreAdminUserProjections(
  queryClient: QueryClient,
  snapshot: AdminUserProjectionSnapshot,
) {
  snapshot.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data)
  })
}
