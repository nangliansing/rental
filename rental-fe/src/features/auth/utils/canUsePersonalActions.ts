type PersonalActionAuth = {
  user?: { status?: string | null } | null
  isAuthenticated: boolean
  isLoading: boolean
}

/** Shared gate for personal chrome (nav, saved searches, map Plus menu). */
export function canUsePersonalActions({
  user,
  isAuthenticated,
  isLoading,
}: PersonalActionAuth): boolean {
  return !isLoading && isAuthenticated && user?.status === "ACTIVE"
}
