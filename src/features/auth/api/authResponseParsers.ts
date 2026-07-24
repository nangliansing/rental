// src/features/auth/api/authResponseParsers.ts
import { ApiError } from "@/lib/api-client"

import type { AuthUser, AuthUserStatus } from "../types"

const AUTH_USER_STATUSES = new Set<AuthUserStatus>([
    "ACTIVE",
    "INACTIVE",
    "SUSPENDED",
    "UNKNOWN",
])
const AUTH_USER_ROLES = new Set(["USER", "ADMIN", "OWNER"])
const AUTH_PROVIDERS = new Set(["GOOGLE", "PASSWORD"])

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

const readRecord = (value: unknown, key: string): Record<string, unknown> => {
    if (!isRecord(value)) return {}

    const child = value[key]

    return isRecord(child) ? child : {}
}

const readString = (value: unknown, fallback = "") => {
    return typeof value === "string" ? value : fallback
}

const readAuthUserStatus = (value: unknown): AuthUserStatus => {
    if (typeof value === "string" && AUTH_USER_STATUSES.has(value as AuthUserStatus)) {
        return value as AuthUserStatus
    }

    return "UNKNOWN"
}

export const parseAuthUser = (value: unknown): AuthUser => {
    const user = isRecord(value) ? value : {}

    return {
        _id: readString(user._id),
        name: readString(user.name),
        email: readString(user.email),
        authProvider: readString(user.authProvider, "UNKNOWN"),
        role: readString(user.role, "USER"),
        status: readAuthUserStatus(user.status),
        createdAt: readString(user.createdAt),
        updatedAt: readString(user.updatedAt),
    }
}

export const parseLoginWithPasswordResponse = (value: unknown) => {
    const data = readRecord(value, "data")
    const accessToken = readString(data.accessToken)

    if (!accessToken) {
        throw new ApiError("Unable to log in. Please try again.", 500, "INVALID_AUTH_RESPONSE")
    }

    return {
        user: parseAuthUser(data.user),
        accessToken,
    }
}

export const parseSignupWithPasswordResponse = (value: unknown) => {
    return parseAuthUser(readRecord(value, "data"))
}

export const parseGetCurrentUserResponse = (value: unknown) => {
    const response = isRecord(value) ? value : {}
    const userRecord = readRecord(readRecord(response, "data"), "user")
    const user = parseAuthUser(userRecord)

    if (
        response.success !== true ||
        !user._id.trim() ||
        !user.name.trim() ||
        !user.email.trim() ||
        !AUTH_PROVIDERS.has(user.authProvider) ||
        !AUTH_USER_ROLES.has(user.role) ||
        user.status === "UNKNOWN" ||
        !user.createdAt.trim() ||
        !user.updatedAt.trim()
    ) {
        throw new ApiError(
            "Your session returned an invalid response.",
            500,
            "INVALID_AUTH_RESPONSE",
        )
    }

    return user
}
