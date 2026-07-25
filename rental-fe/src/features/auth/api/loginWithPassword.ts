// src/features/auth/api/loginWithPassword.ts
import { apiClient } from "@/lib/api-client"

import type { LoginWithPasswordResponse } from "../types"
import { parseLoginWithPasswordResponse } from "./authResponseParsers"

type LoginWithPasswordInput = {
    email: string
    password: string
}

export async function loginWithPassword(input: LoginWithPasswordInput) {
    const response = await apiClient.post<LoginWithPasswordResponse>(
        "/users/login/password",
        input
    )

    return parseLoginWithPasswordResponse(response.data)
}
