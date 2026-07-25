const REDIRECT_BASE_URL = "https://rental.local"

export const getSafeAuthRedirect = (
  requestedRedirect: string | null,
  fallback = "/profile",
) => {
  if (
    !requestedRedirect ||
    !requestedRedirect.startsWith("/") ||
    requestedRedirect.startsWith("//") ||
    requestedRedirect.includes("\\")
  ) {
    return fallback
  }

  try {
    const redirectUrl = new URL(requestedRedirect, REDIRECT_BASE_URL)

    if (redirectUrl.origin !== REDIRECT_BASE_URL) return fallback

    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
  } catch {
    return fallback
  }
}

