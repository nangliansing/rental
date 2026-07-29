import { infiniteQueryOptions } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import {
  getNextPageParam,
  readPageParam,
} from "@/lib/query-pagination"

import { getMyNotifications } from "./getMyNotifications"

export const NOTIFICATIONS_QUERY_KEY = queryKeys.notifications.me
export const NOTIFICATIONS_PAGE_SIZE = 20

export const notificationsQueryOptions = (enabled = true) =>
  infiniteQueryOptions({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    initialPageParam: 1,
    enabled,
    queryFn: ({ pageParam, signal }) =>
      getMyNotifications({
        page: readPageParam(pageParam),
        limit: NOTIFICATIONS_PAGE_SIZE,
        signal,
      }),
    getNextPageParam,
  })
