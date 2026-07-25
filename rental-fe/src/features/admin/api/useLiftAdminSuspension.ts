import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import {
  captureStatusCache,
  findStatusItem,
  invalidateStatusCache,
  restoreStatusCache,
  updateStatusCache,
  type StatusCacheSnapshot,
} from "@/lib/status-transition-cache"

import {
  captureAdminUserProjections,
  patchAdminUserProjections,
  restoreAdminUserProjections,
} from "./adminUserProjectionCache"
import {
  liftAdminSuspension,
  type LiftAdminSuspensionInput,
} from "./liftAdminSuspension"
import type {
  AdminSuspensionListItem,
  SearchAdminSuspensionsResponse,
} from "./searchAdminSuspensions"

export type LiftAdminSuspensionVariables = LiftAdminSuspensionInput & {
  userId: string
}

type SuspensionSnapshot = StatusCacheSnapshot<
  AdminSuspensionListItem,
  SearchAdminSuspensionsResponse
>

export function useLiftAdminSuspension() {
  const queryClient = useQueryClient()

  const captureSuspension = (suspensionId: string) =>
    captureStatusCache<
      AdminSuspensionListItem,
      SearchAdminSuspensionsResponse
    >(
      queryClient,
      queryKeys.admin.suspensions.lists,
      queryKeys.admin.suspensions.detail(suspensionId),
    )

  return useMutation({
    scope: { id: "lift-admin-suspension" },
    mutationFn: (input: LiftAdminSuspensionVariables) =>
      liftAdminSuspension({
        suspensionId: input.suspensionId,
        liftReason: input.liftReason,
      }),
    onMutate: async (input) => {
      const suspensionId = input.suspensionId.trim()
      const userId = input.userId.trim()
      const [suspensionSnapshot, userSnapshot] = await Promise.all([
        captureSuspension(suspensionId),
        captureAdminUserProjections(queryClient, userId),
      ])
      const currentSuspension = findStatusItem(
        suspensionSnapshot.detailData,
        suspensionSnapshot.listData,
        suspensionId,
      )

      if (currentSuspension) {
        updateStatusCache(queryClient, suspensionSnapshot, {
          ...currentSuspension,
          status: "LIFTED",
          liftedAt: new Date().toISOString(),
          liftReason: input.liftReason.trim(),
          user:
            currentSuspension.user?._id === userId
              ? { ...currentSuspension.user, status: "ACTIVE" }
              : currentSuspension.user,
        })
      }
      patchAdminUserProjections(queryClient, userId, { status: "ACTIVE" })

      return { suspensionSnapshot, userId, userSnapshot }
    },
    onError: (_error, _input, context) => {
      if (!context) return
      restoreStatusCache(queryClient, context.suspensionSnapshot)
      restoreAdminUserProjections(queryClient, context.userSnapshot)
    },
    onSuccess: async (result, _input, context) => {
      const suspensionSnapshot: SuspensionSnapshot =
        context?.suspensionSnapshot ??
        (await captureSuspension(result.suspension._id))
      updateStatusCache(queryClient, suspensionSnapshot, result.suspension)
      patchAdminUserProjections(
        queryClient,
        context?.userId ?? result.user._id,
        result.user,
      )
    },
    onSettled: async (result, error, input) => {
      if (error) return
      await invalidateStatusCache(
        queryClient,
        queryKeys.admin.suspensions.lists,
        queryKeys.admin.suspensions.detail(
          result?.suspension._id ?? input.suspensionId.trim(),
        ),
      )
    },
  })
}
