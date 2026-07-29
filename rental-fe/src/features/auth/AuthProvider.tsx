import { useEffect, useMemo, type ReactNode } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { ApiError, subscribeToAuthInvalidation } from "@/lib/api-client"

import { AuthContext } from "./auth-context"
import { currentUserQueryOptions } from "./auth-query"
import { clearAuthSession } from "./utils/authSession"

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const currentUserQuery = useQuery(currentUserQueryOptions())

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
