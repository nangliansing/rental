// src/features/auth/types.ts
import type { UploadedMedia } from "@/features/uploads"

export type AuthUserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "UNKNOWN"

export type AuthUser = {
    _id: string
    name: string
    email: string
    profilePhoto: UploadedMedia | null
    authProvider: string
    role: string
    status: AuthUserStatus
    createdAt: string
    updatedAt: string
}

export type UpdateMyUserInput = {
    name?: string
    profilePhoto?: UploadedMedia | null
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
