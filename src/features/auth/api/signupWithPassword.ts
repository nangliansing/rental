// src/features/auth/api/signupWithPassword.ts
import { apiClient } from "@/lib/api-client"

import type { SignupWithPasswordResponse } from "../types"
import { parseSignupWithPasswordResponse } from "./authResponseParsers"

type SignupWithPasswordInput = {
    name: string
    email: string
    password: string
}

export async function signupWithPassword(input: SignupWithPasswordInput) {
    const response = await apiClient.post<SignupWithPasswordResponse>(
        "/users/signup/password",
        {
            name: input.name,
            email: input.email,
            password: input.password,
        },
        false
    )

    return parseSignupWithPasswordResponse(response.data)
}
