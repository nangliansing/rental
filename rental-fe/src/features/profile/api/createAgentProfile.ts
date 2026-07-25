import { ApiError, apiClient } from "@/lib/api-client"

import type {
    ListerReviewSummary,
    ListerReviewTag,
    ListerReviewTagCount,
} from "@/features/lister-review/api"
import type { UploadedMedia } from "@/features/uploads"

import type { AgentProfileFormValues } from "../components/AgentProfileForm"

export type AgentProfileListingSummary = {
    activeCount: number
    pendingCount: number
    rejectedCount: number
}

export type AgentProfile = AgentProfileFormValues & {
    _id: string
    userId: string
    isOnline: boolean
    isDeleted: boolean
    deletedAt: string | null
    deletedBy: string | null
    deleteReason: string | null
    isVerified: boolean
    verifiedBy: string | null
    verifiedAt: string | null
    listingSummary?: AgentProfileListingSummary
    reviewSummary?: ListerReviewSummary
    createdAt: string
    updatedAt: string
}

type CreateAgentProfileResponse = {
    success: true
    data: AgentProfile
}

const LISTER_REVIEW_TAGS = new Set<ListerReviewTag>([
    "RESPONSIVE",
    "HELPFUL",
    "ACCURATE_INFO",
    "FRIENDLY",
    "CLEAR_COMMUNICATION",
    "FAST_FOLLOW_UP",
    "UNRESPONSIVE",
    "INACCURATE_INFO",
    "RUDE",
    "SUSPICIOUS",
    "PRESSURE_TACTICS",
])

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

const readNullableString = (value: unknown) => {
    return typeof value === "string" ? value : null
}

const readBoolean = (value: unknown, fallback = false) => {
    return typeof value === "boolean" ? value : fallback
}

const readNumber = (value: unknown, fallback = 0) => {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

const readNullableNumber = (value: unknown) => {
    return typeof value === "number" && Number.isFinite(value) ? value : null
}

const readStringArray = (value: unknown) => {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : []
}

const parseUploadedMedia = (value: unknown): UploadedMedia | null => {
    if (!isRecord(value)) return null

    const publicId = readString(value.publicId)
    const secureUrl = readString(value.secureUrl)

    if (!publicId || !secureUrl) return null

    return {
        publicId,
        secureUrl,
        resourceType: readString(value.resourceType, "image"),
        format: readNullableString(value.format),
        width: readNullableNumber(value.width),
        height: readNullableNumber(value.height),
        bytes: readNullableNumber(value.bytes),
        position: readNumber(value.position),
        alt: readNullableString(value.alt),
        isCover: readBoolean(value.isCover),
    }
}

const parseRatingCounts = (value: unknown) => {
    const ratingCounts = isRecord(value) ? value : {}

    return {
        oneStar: readNumber(ratingCounts.oneStar),
        twoStars: readNumber(ratingCounts.twoStars),
        threeStars: readNumber(ratingCounts.threeStars),
        fourStars: readNumber(ratingCounts.fourStars),
        fiveStars: readNumber(ratingCounts.fiveStars),
    }
}

const parseTagCounts = (value: unknown): ListerReviewTagCount[] => {
    if (!Array.isArray(value)) return []

    return value.flatMap((item) => {
        if (!isRecord(item)) return []

        const tag = item.tag

        if (typeof tag !== "string" || !LISTER_REVIEW_TAGS.has(tag as ListerReviewTag)) {
            return []
        }

        return [
            {
                tag: tag as ListerReviewTag,
                count: readNumber(item.count),
            },
        ]
    })
}

const parseReviewSummary = (value: unknown): ListerReviewSummary | undefined => {
    if (!isRecord(value)) return undefined

    return {
        averageRating: readNumber(value.averageRating),
        reviewCount: readNumber(value.reviewCount),
        ratingCounts: parseRatingCounts(value.ratingCounts),
        tagCounts: parseTagCounts(value.tagCounts),
    }
}

const parseListingSummary = (
    value: unknown
): AgentProfileListingSummary | undefined => {
    if (!isRecord(value)) return undefined

    return {
        activeCount: readNumber(value.activeCount),
        pendingCount: readNumber(value.pendingCount),
        rejectedCount: readNumber(value.rejectedCount),
    }
}

export const parseAgentProfile = (value: unknown): AgentProfile => {
    const profile = isRecord(value) ? value : {}
    const id = readString(profile._id)
    const userId = readString(profile.userId)

    if (!id || !userId) {
        throw new ApiError(
            "Agent profile response is missing required data.",
            500,
            "INVALID_AGENT_PROFILE_RESPONSE"
        )
    }

    return {
        _id: id,
        userId,
        isOnline: readBoolean(profile.isOnline),
        isDeleted: readBoolean(profile.isDeleted),
        deletedAt: readNullableString(profile.deletedAt),
        deletedBy: readNullableString(profile.deletedBy),
        deleteReason: readNullableString(profile.deleteReason),
        isVerified: readBoolean(profile.isVerified),
        verifiedBy: readNullableString(profile.verifiedBy),
        verifiedAt: readNullableString(profile.verifiedAt),
        listingSummary: parseListingSummary(profile.listingSummary),
        reviewSummary: parseReviewSummary(profile.reviewSummary),
        createdAt: readString(profile.createdAt),
        updatedAt: readString(profile.updatedAt),
        displayName: readString(profile.displayName),
        profilePhoto: parseUploadedMedia(profile.profilePhoto),
        description: readString(profile.description),
        phone: readString(profile.phone),
        lineUrl: readString(profile.lineUrl),
        whatsappPhone: readString(profile.whatsappPhone),
        telegramUrl: readString(profile.telegramUrl),
        viberPhone: readString(profile.viberPhone),
        supportLanguages: readStringArray(profile.supportLanguages),
    }
}

export const parseAgentProfileResponse = (value: unknown) => {
    return parseAgentProfile(readRecord(value, "data"))
}

const buildCreateAgentProfilePayload = (
    values: AgentProfileFormValues
): AgentProfileFormValues => {
    return {
        displayName: values.displayName,
        profilePhoto: values.profilePhoto,
        description: values.description,
        phone: values.phone,
        lineUrl: values.lineUrl,
        whatsappPhone: values.whatsappPhone,
        telegramUrl: values.telegramUrl,
        viberPhone: values.viberPhone,
        supportLanguages: values.supportLanguages,
    }
}

export async function createAgentProfile(values: AgentProfileFormValues) {
    const response = await apiClient.post<CreateAgentProfileResponse>(
        "/agent-profiles",
        buildCreateAgentProfilePayload(values)
    )

    return parseAgentProfileResponse(response.data)
}
