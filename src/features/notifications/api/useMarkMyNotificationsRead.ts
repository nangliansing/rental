import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import { markMyNotificationsRead } from "./markMyNotificationsRead"
import {
  markNotificationsReadInCache,
  rollbackNotificationsReadInCache,
  type NotificationsInfiniteData,
} from "./notificationCache"

export function useMarkMyNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: "mark-my-notifications-read" },
    mutationFn: markMyNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.me })
      const snapshot = queryClient.getQueryData<NotificationsInfiniteData>(
        queryKeys.notifications.me,
      )
      queryClient.setQueryData<NotificationsInfiniteData>(
        queryKeys.notifications.me,
        markNotificationsReadInCache,
      )
      return { snapshot }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData<NotificationsInfiniteData>(
        queryKeys.notifications.me,
        (current) =>
          rollbackNotificationsReadInCache(current, context?.snapshot),
      )
    },
    onSettled: async (_data, error) => {
      if (error) return
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.me,
        refetchType: "active",
      })
    },
  })
}
