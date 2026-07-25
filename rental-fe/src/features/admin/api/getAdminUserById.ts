import { ApiError, apiClient } from "@/lib/api-client"

import type { AuthUser } from "@/features/auth/types"
import type { UploadedMedia } from "@/features/uploads"

import { parseAuthUser } from "./createAdminSuspension"

export type AdminUserAgentProfile = {
  _id: string
  userId: string
  isOnline: boolean
  isDeleted?: boolean
  displayName: string | null
  profilePhoto: UploadedMedia | null
  description: string | null
  phone: string | null
  lineUrl: string | null
  whatsappPhone: string | null
  telegramUrl: string | null
  viberPhone: string | null
  supportLanguages: string[]
  isVerified: boolean
  verifiedBy: string | null
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export type AdminUserDetails = AuthUser & {
  agentProfile: AdminUserAgentProfile | null
}

export type GetAdminUserByIdResponse = {
  success: true
  data: AdminUserDetails
}

const INVALID_ADMIN_USER_RESPONSE = "INVALID_ADMIN_USER_RESPONSE"

function readRecord(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function readNullableString(value: unknown) {
  return typeof value === "string" ? value : null
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback
}

function readNumber(value: unknown, fallback?: number) {
  return typeof value === "number" ? value : fallback
}

function readNullableNumber(value: unknown) {
  return typeof value === "number" ? value : null
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function parseUploadedMedia(value: unknown): UploadedMedia | null {
  if (value == null) return null

  const media = readRecord(value)
  const publicId = readString(media.publicId)
  const secureUrl = readString(media.secureUrl)

  if (!publicId || !secureUrl) return null

  return {
    publicId,
    secureUrl,
    resourceType: readString(media.resourceType, "image"),
    format: readNullableString(media.format),
    width: readNullableNumber(media.width),
    height: readNullableNumber(media.height),
    bytes: readNullableNumber(media.bytes),
    position: readNumber(media.position, 0) ?? 0,
    alt: readNullableString(media.alt),
    isCover: readBoolean(media.isCover),
  }
}

function parseAdminUserAgentProfile(
  value: unknown,
): AdminUserAgentProfile | null {
  if (value === null || value === undefined) return null

  const profile = readRecord(value)

  if (
    typeof profile._id !== "string" ||
    typeof profile.userId !== "string" ||
    typeof profile.isVerified !== "boolean" ||
    typeof profile.createdAt !== "string" ||
    typeof profile.updatedAt !== "string"
  ) {
    throw new ApiError(
      "Admin user response is missing agent profile data.",
      500,
      INVALID_ADMIN_USER_RESPONSE,
    )
  }

  return {
    _id: profile._id,
    userId: profile.userId,
    isOnline: readBoolean(profile.isOnline),
    isDeleted:
      typeof profile.isDeleted === "boolean" ? profile.isDeleted : undefined,
    displayName: readNullableString(profile.displayName),
    profilePhoto: parseUploadedMedia(profile.profilePhoto),
    description: readNullableString(profile.description),
    phone: readNullableString(profile.phone),
    lineUrl: readNullableString(profile.lineUrl),
    whatsappPhone: readNullableString(profile.whatsappPhone),
    telegramUrl: readNullableString(profile.telegramUrl),
    viberPhone: readNullableString(profile.viberPhone),
    supportLanguages: readStringArray(profile.supportLanguages),
    isVerified: profile.isVerified,
    verifiedBy: readNullableString(profile.verifiedBy),
    verifiedAt: readNullableString(profile.verifiedAt),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
}

function parseGetAdminUserByIdResponse(value: unknown): AdminUserDetails {
  const response = readRecord(value)
  const data = readRecord(response.data)
  const user = parseAuthUser(data)

  if (response.success !== true || !user) {
    throw new ApiError(
      "Admin user response is missing user data.",
      500,
      INVALID_ADMIN_USER_RESPONSE,
    )
  }

  return {
    ...user,
    agentProfile: parseAdminUserAgentProfile(data.agentProfile),
  }
}

export async function getAdminUserById(userId: string) {
  const response = await apiClient.get<unknown>(
    `/admin/users/${encodeURIComponent(userId)}`,
  )

  return parseGetAdminUserByIdResponse(response.data)
}
