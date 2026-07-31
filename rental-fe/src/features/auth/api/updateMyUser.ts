import { apiClient } from "@/lib/api-client"

import type { AuthUser, UpdateMyUserInput } from "../types"
import { parseGetCurrentUserResponse } from "./authResponseParsers"

type UpdateMyUserResponse = {
  success: true
  data: {
    user: AuthUser
  }
}

export async function updateMyUser(values: UpdateMyUserInput) {
  const payload = buildUpdateMyUserPayload(values)

  const response = await apiClient.patch<UpdateMyUserResponse>(
    "/users/me",
    payload,
  )

  return parseGetCurrentUserResponse(response.data)
}

function buildUpdateMyUserPayload(
  values: UpdateMyUserInput,
): UpdateMyUserInput {
  const payload: UpdateMyUserInput = {}

  if (values.name !== undefined) {
    payload.name = values.name
  }

  if (values.profilePhoto !== undefined) {
    payload.profilePhoto = values.profilePhoto
  }

  return payload
}
