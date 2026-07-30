import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createOptimisticTransaction } from "@/lib/optimistic-transaction"
import { queryKeys } from "@/lib/query-keys"

import { markMyNotificationsRead } from "./markMyNotificationsRead"
import {
  markNotificationsReadInCache,
  rollbackNotificationsReadInCache,
  type NotificationsInfiniteData,
} from "./notificationCache"

export function useMarkMyNotificationsRead() {
  const queryClient = useQueryClient()
  const transaction = createOptimisticTransaction<
    Awaited<ReturnType<typeof markMyNotificationsRead>>,
    Error,
    void,
    { snapshot: NotificationsInfiniteData | undefined }
  >({
    queryClient,
    scopeKey: () => "notifications:mark-read:me",
    getPlan: () => ({
      cancel: [queryKeys.notifications.me],
      snapshot: [queryKeys.notifications.me],
      invalidate: [queryKeys.notifications.me],
    }),
    apply: ({ queryClient: client }) => {
      const snapshot = client.getQueryData<NotificationsInfiniteData>(
        queryKeys.notifications.me,
      )

      client.setQueryData<NotificationsInfiniteData>(
        queryKeys.notifications.me,
        markNotificationsReadInCache,
      )

      return { snapshot }
    },
    rollback: ({ queryClient: client, optimisticContext }) => {
      client.setQueryData<NotificationsInfiniteData>(
        queryKeys.notifications.me,
        (current) =>
          rollbackNotificationsReadInCache(
            current,
            optimisticContext.snapshot,
          ),
      )
    },
    shouldInvalidate: ({ error }) => error === null,
  })

  return useMutation({
    scope: { id: "mark-my-notifications-read" },
    mutationFn: markMyNotificationsRead,
    ...transaction,
  })
}
