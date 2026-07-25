import type { QueryClient } from "@tanstack/react-query"

import { clearAccessToken, setAccessToken } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import type { AuthUser } from "../types"

function clearSessionScopedQueries(queryClient: QueryClient) {
  queryClient.removeQueries({
    predicate: (query) =>
      !(
        query.queryKey.length === queryKeys.auth.currentUser.length &&
        query.queryKey.every(
          (value, index) => value === queryKeys.auth.currentUser[index],
        )
      ),
  })
}

export function establishAuthSession(
  queryClient: QueryClient,
  user: AuthUser,
  accessToken: string,
) {
  setAccessToken(accessToken)
  clearSessionScopedQueries(queryClient)
  queryClient.setQueryData(queryKeys.auth.currentUser, user)
}

export function clearAuthSession(queryClient: QueryClient) {
  clearAccessToken()
  clearSessionScopedQueries(queryClient)
  queryClient.setQueryData(queryKeys.auth.currentUser, null)
}
