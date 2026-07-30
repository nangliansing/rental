import type { QueryClient, QueryKey } from "@tanstack/react-query"

import type { AuthUser } from "@/features/auth/types"
import { queryKeys } from "@/lib/query-keys"
import { updateDeepInQueries } from "@/lib/query-state"

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

const isAdminUserProjection =
  (userId: string) =>
  (value: Record<string, unknown>) =>
    value._id === userId &&
    typeof value.status === "string" &&
    (typeof value.email === "string" || "authProvider" in value)

function definedChanges(changes: Partial<AuthUser>) {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  )
}

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

export function patchAdminUserProjections(
  queryClient: QueryClient,
  userId: string,
  changes: Partial<AuthUser>,
) {
  const patch = definedChanges(changes)
  if (Object.keys(patch).length === 0) return

  updateDeepInQueries(
    queryClient,
    adminUserProjectionKeys(userId),
    isAdminUserProjection(userId),
    (current) => ({ ...current, ...patch }),
  )
}

export function restoreAdminUserProjections(
  queryClient: QueryClient,
  snapshot: AdminUserProjectionSnapshot,
) {
  snapshot.forEach(({ queryKey, data }) => {
    queryClient.setQueryData(queryKey, data)
  })
}
