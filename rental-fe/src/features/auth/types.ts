// src/features/auth/types.ts
export type AuthUserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "UNKNOWN"

export type AuthUser = {
    _id: string
    name: string
    email: string
    authProvider: string
    role: string
    status: AuthUserStatus
    createdAt: string
    updatedAt: string
}

export type LoginWithPasswordResponse = {
    success: true
    data: {
        user: AuthUser
        accessToken: string
    }
}

export type SignupWithPasswordResponse = {
    success: true
    data: AuthUser
}
