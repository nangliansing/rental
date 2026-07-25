import { getSafeAuthRedirect } from "./getSafeAuthRedirect"

export function getPostLoginRedirect({
  isNewUser,
  requestedRedirect,
  onboardingPath = "/profile",
}: {
  isNewUser: boolean
  requestedRedirect: string | null
  onboardingPath?: string
}) {
  if (isNewUser) {
    return onboardingPath
  }

  return getSafeAuthRedirect(requestedRedirect, onboardingPath)
}
