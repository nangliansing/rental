import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import {
  captureAdminUserProjections,
  patchAdminUserProjections,
  restoreAdminUserProjections,
} from "./adminUserProjectionCache"
import {
  createAdminSuspension,
  type CreateAdminSuspensionInput,
} from "./createAdminSuspension"

export function useCreateAdminSuspension() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "create-admin-suspension" },
    mutationFn: (input: CreateAdminSuspensionInput) =>
      createAdminSuspension(input),
    onMutate: async (input) => {
      const userId = input.userId.trim()
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: queryKeys.admin.suspensions.lists,
        }),
        queryClient.cancelQueries({
          queryKey: queryKeys.admin.suspensions.details,
        }),
      ])
      const userSnapshot = await captureAdminUserProjections(
        queryClient,
        userId,
      )

      patchAdminUserProjections(queryClient, userId, {
        status: "SUSPENDED",
      })

      return { userId, userSnapshot }
    },
    onError: (_error, _input, context) => {
      if (context) {
        restoreAdminUserProjections(queryClient, context.userSnapshot)
      }
    },
    onSuccess: (result, _input, context) => {
      patchAdminUserProjections(
        queryClient,
        context?.userId ?? result.user._id,
        result.user,
      )
      queryClient.setQueryData(
        queryKeys.admin.suspensions.detail(result.suspension._id),
        result.suspension,
      )
    },
    onSettled: async (result, error) => {
      if (error) return

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.suspensions.lists,
          refetchType: "active",
        }),
        result
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.admin.suspensions.detail(
                result.suspension._id,
              ),
              refetchType: "active",
            })
          : Promise.resolve(),
      ])
    },
  })
}
