import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import {
  captureAdminUserProjections,
  patchAdminUserProjections,
  restoreAdminUserProjections,
} from "./adminUserProjectionCache"
import {
  removePlatformAdminFromInfiniteData,
  type AdminPlatformAdminsInfiniteData,
} from "./adminPlatformAdminCache"
import { removeAdminRole, type RemoveAdminRoleInput } from "./removeAdminRole"

export function useRemoveAdminRole() {
  const queryClient = useQueryClient()
  const platformAdminsKey = queryKeys.admin.platformAdmins.list

  return useMutation({
    scope: { id: "remove-admin-role" },
    mutationFn: (input: RemoveAdminRoleInput) => removeAdminRole(input),
    onMutate: async (input) => {
      const userId = input.userId.trim()
      const [, userSnapshot] = await Promise.all([
        queryClient.cancelQueries({ queryKey: platformAdminsKey }),
        captureAdminUserProjections(queryClient, userId),
      ])
      const platformAdminsSnapshot =
        queryClient.getQueryData<AdminPlatformAdminsInfiniteData>(
          platformAdminsKey,
        )

      queryClient.setQueryData<AdminPlatformAdminsInfiniteData>(
        platformAdminsKey,
        (current) => removePlatformAdminFromInfiniteData(current, userId),
      )
      patchAdminUserProjections(queryClient, userId, { role: "USER" })

      return { platformAdminsSnapshot, userId, userSnapshot }
    },
    onError: (_error, _input, context) => {
      if (!context) return
      queryClient.setQueryData(
        platformAdminsKey,
        context.platformAdminsSnapshot,
      )
      restoreAdminUserProjections(queryClient, context.userSnapshot)
    },
    onSuccess: (user, _input, context) => {
      patchAdminUserProjections(
        queryClient,
        context?.userId ?? user._id,
        user,
      )
    },
    onSettled: async (_user, error) => {
      if (error) return
      await queryClient.invalidateQueries({
        queryKey: platformAdminsKey,
        refetchType: "active",
      })
    },
  })
}
