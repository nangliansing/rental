import { queryOptions } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"

import { getCurrentUser } from "./api/getCurrentUser"

export const CURRENT_USER_QUERY_KEY = queryKeys.auth.currentUser

export const currentUserQueryOptions = () =>
  queryOptions({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: ({ signal }) => getCurrentUser(signal),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
