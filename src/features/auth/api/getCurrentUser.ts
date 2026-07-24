// src/features/auth/api/getCurrentUser.ts
import { apiClient } from "@/lib/api-client"

import type { AuthUser } from "../types"
import { parseGetCurrentUserResponse } from "./authResponseParsers"

type GetCurrentUserResponse = {
  success: true
  data: {
    user: AuthUser
  }
}

export async function getCurrentUser() {
  const response = await apiClient.get<GetCurrentUserResponse>("/users/me")

  return parseGetCurrentUserResponse(response.data)
}
