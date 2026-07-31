import { useMutation, useQueryClient } from "@tanstack/react-query"

import { patchAdminUserProjections } from "@/features/admin/api/adminUserProjectionCache"
import { ApiError } from "@/lib/api-client"
import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import {
  cacheCurrentUser,
  CURRENT_USER_WRITE_SCOPE_ID,
  currentUserProjectionQueryKeys,
  patchCurrentUser,
} from "../api/authUserMutationCache"
import { updateMyUser } from "../api/updateMyUser"
import type { AuthUser } from "../types"

export function useUpdateMyUser() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof updateMyUser>>,
    Error,
    Parameters<typeof updateMyUser>[0],
    { userId: string | null }
  >({
    queryClient,
    scopeKey: () => CURRENT_USER_WRITE_SCOPE_ID,
    getPlan: () => ({
      cancel: currentUserProjectionQueryKeys,
      snapshot: currentUserProjectionQueryKeys,
    }),
    apply: ({ queryClient: client, variables }) => {
      const currentUser = client.getQueryData<AuthUser>(
        queryKeys.auth.currentUser,
      )
      const userId = currentUser?._id ?? null

      if (userId) {
        patchCurrentUser(client, userId, variables)
      }

      return { userId }
    },
    reconcile: ({ queryClient: client, data }) => {
      cacheCurrentUser(client, data)
      patchAdminUserProjections(client, data._id, data)
    },
    shouldInvalidate: () => false,
  })

  return useMutation({
    scope: { id: CURRENT_USER_WRITE_SCOPE_ID },
    mutationFn: (values) => {
      const currentUser = queryClient.getQueryData<AuthUser>(
        queryKeys.auth.currentUser,
      )

      if (!currentUser?._id || currentUser.status !== "ACTIVE") {
        throw new ApiError(
          "Your account is no longer available to update.",
          409,
          "CURRENT_USER_UNAVAILABLE",
        )
      }

      return updateMyUser(values)
    },
    ...transaction,
  })
}
