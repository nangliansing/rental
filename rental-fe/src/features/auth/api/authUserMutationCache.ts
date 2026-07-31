import type { QueryClient, QueryKey } from "@tanstack/react-query"

import { patchAdminUserProjections } from "@/features/admin/api/adminUserProjectionCache"
import { queryKeys } from "@/lib/query-keys"

import type { AuthUser } from "../types"

export const CURRENT_USER_WRITE_SCOPE_ID = "current-user-write"

export const currentUserProjectionQueryKeys: QueryKey[] = [
  queryKeys.auth.currentUser,
]

function definedChanges(changes: Partial<AuthUser>) {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  )
}

export function cacheCurrentUser(queryClient: QueryClient, user: AuthUser) {
  queryClient.setQueryData(queryKeys.auth.currentUser, user)
}

export function patchCurrentUser(
  queryClient: QueryClient,
  userId: string,
  changes: Partial<AuthUser>,
) {
  const patch = definedChanges(changes)
  if (Object.keys(patch).length === 0) return

  queryClient.setQueryData<AuthUser>(queryKeys.auth.currentUser, (current) =>
    current?._id === userId ? { ...current, ...patch } : current,
  )

  patchAdminUserProjections(queryClient, userId, patch)
}
