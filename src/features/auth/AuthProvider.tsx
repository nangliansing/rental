import { useEffect, useMemo, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiError, subscribeToAuthInvalidation } from "@/lib/api-client"

import { getCurrentUser } from "./api/getCurrentUser"
import { AuthContext } from "./auth-context"
import { CURRENT_USER_QUERY_KEY } from "./auth-query"
import { clearAuthSession } from "./utils/authSession"

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const currentUserQuery = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    return subscribeToAuthInvalidation(() => {
      clearAuthSession(queryClient)
    })
  }, [queryClient])

  const value = useMemo(() => {
    const candidate = currentUserQuery.data
    const user = candidate?._id && candidate.status === "ACTIVE" ? candidate : null
    const isUnauthorized =
      currentUserQuery.error instanceof ApiError &&
      currentUserQuery.error.status === 401

    return {
      user,
      userId: user?._id,
      isAuthenticated: Boolean(user),
      isLoading: currentUserQuery.isLoading,
      isFetching: currentUserQuery.isFetching,
      isUnauthorized,
      refetchUser: currentUserQuery.refetch,
    }
  }, [currentUserQuery.data, currentUserQuery.error, currentUserQuery.isFetching, currentUserQuery.isLoading, currentUserQuery.refetch])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
