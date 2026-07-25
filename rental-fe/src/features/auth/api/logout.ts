import { ApiError, apiClient } from "@/lib/api-client"

type LogoutResponse = {
  success: true
  message: string
}

export async function logout() {
  const response = await apiClient.post<unknown>(
    "/users/logout",
    {},
    false,
  )

  const data =
    typeof response.data === "object" && response.data !== null
      ? (response.data as Record<string, unknown>)
      : null

  if (!data || data.success !== true || typeof data.message !== "string") {
    throw new ApiError(
      "Logout returned an invalid response.",
      500,
      "INVALID_LOGOUT_RESPONSE",
    )
  }

  return data as LogoutResponse
}
