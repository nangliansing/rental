import { useAuth } from "@/features/auth/hooks/useAuth"
import { ApiError } from "@/lib/api-client"

import { useMyAgentProfile } from "../api"

type UseMyProfileGateOptions = {
  enabled?: boolean
}

export function useMyProfileGate({ enabled = true }: UseMyProfileGateOptions = {}) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const profileQuery = useMyAgentProfile({
    enabled: enabled && !isAuthLoading && isAuthenticated,
  })

  const isUnauthorized =
    profileQuery.error instanceof ApiError && profileQuery.error.status === 401

  const errorMessage =
    profileQuery.error instanceof Error
      ? profileQuery.error.message
      : "Could not load your profile."

  const isProfileLoading =
    isAuthLoading || (isAuthenticated && profileQuery.isPending)

  const showLogin =
    !isAuthLoading && (!isAuthenticated || isUnauthorized)

  const showProfileError =
    !isAuthLoading &&
    isAuthenticated &&
    profileQuery.isError &&
    !profileQuery.data &&
    !profileQuery.isMissing &&
    !isUnauthorized

  return {
    isAuthenticated,
    isAuthLoading,
    isUnauthorized,
    isProfileLoading,
    isMissing: profileQuery.isMissing,
    profile: profileQuery.data,
    profileQuery,
    errorMessage,
    showLogin,
    showProfileError,
  }
}
