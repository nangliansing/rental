import { ApiError, apiClient } from "@/lib/api-client"

import { parseAuthUser } from "../../api/authResponseParsers"
import type {
  LoginWithGoogleInput,
  LoginWithGoogleResult,
} from "../types"

type LoginWithGoogleResponse = {
  success: true
  data: {
    user: unknown
    accessToken: string
    isNewUser: boolean
  }
}

const AUTH_ROLES = new Set(["USER", "ADMIN", "OWNER"])

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const invalidResponse = () => {
  return new ApiError(
    "Google sign-in returned an invalid response.",
    500,
    "INVALID_AUTH_RESPONSE",
  )
}

const isNonBlankString = (value: string) => Boolean(value.trim())

const isIsoDateString = (value: string) => {
  return isNonBlankString(value) && !Number.isNaN(Date.parse(value))
}

const parseLoginWithGoogleResponse = (value: unknown): LoginWithGoogleResult => {
  if (!isRecord(value) || value.success !== true || !isRecord(value.data)) {
    throw invalidResponse()
  }

  const { accessToken, isNewUser } = value.data
  const userRecord = isRecord(value.data.user) ? value.data.user : {}
  const user = parseAuthUser(value.data.user)

  if (
    typeof accessToken !== "string" ||
    !isNonBlankString(accessToken) ||
    typeof isNewUser !== "boolean" ||
    !isNonBlankString(user._id) ||
    !isNonBlankString(user.name) ||
    !isNonBlankString(user.email) ||
    user.authProvider !== "GOOGLE" ||
    typeof userRecord.role !== "string" ||
    !AUTH_ROLES.has(userRecord.role) ||
    user.status !== "ACTIVE" ||
    !isIsoDateString(user.createdAt) ||
    !isIsoDateString(user.updatedAt)
  ) {
    throw invalidResponse()
  }

  return { user, accessToken: accessToken.trim(), isNewUser }
}

export async function loginWithGoogle(
  input: LoginWithGoogleInput,
): Promise<LoginWithGoogleResult> {
  const response = await apiClient.post<LoginWithGoogleResponse>(
    "/users/login/google",
    input,
    false,
  )

  return parseLoginWithGoogleResponse(response.data)
}
