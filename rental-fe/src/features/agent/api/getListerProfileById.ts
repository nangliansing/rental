import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseListingMedia,
  parseReviewSummary,
  readBoolean,
  readNullableString,
  readNumber,
  readRecord,
  readString,
  readStringArray,
} from "@/features/listing/api/listingResponseParsers"
import type { ListingAgentProfile } from "@/features/map-search/types"
import type { ListerReviewSummary } from "@/features/lister-review/api"

export type ListerProfileSummary = {
  activeCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
}

export type ListerProfile = Omit<ListingAgentProfile, "userId"> & {
  userId: string | null
  description: string | null
  isActive: boolean
  createdAt: string
  reviewSummary?: ListerReviewSummary
  listingSummary: ListerProfileSummary
}

const INVALID_LISTER_PROFILE_RESPONSE = "INVALID_LISTER_PROFILE_RESPONSE"

const parseListerProfileSummary = (value: unknown): ListerProfileSummary => {
  const summary = readRecord(value)

  return {
    activeCount: readNumber(summary.activeCount, 0) ?? 0,
    pendingCount: readNumber(summary.pendingCount, 0) ?? 0,
    approvedCount: readNumber(summary.approvedCount, 0) ?? 0,
    rejectedCount: readNumber(summary.rejectedCount, 0) ?? 0,
  }
}

export const parseListerProfileResponse = (
  value: unknown,
): ListerProfile => {
  const response = readRecord(value)
  const data = readRecord(response.data)
  const agentProfile = readRecord(data.agentProfile)
  const id = readString(agentProfile._id)

  if (!id) {
    throw new ApiError(
      "Lister profile response is missing agent profile data.",
      500,
      INVALID_LISTER_PROFILE_RESPONSE,
    )
  }

  return {
    _id: id,
    userId: readString(agentProfile.userId) || null,
    displayName: readString(agentProfile.displayName),
    profilePhoto: parseListingMedia(agentProfile.profilePhoto),
    description: readNullableString(agentProfile.description),
    phone: readNullableString(agentProfile.phone),
    lineUrl: readNullableString(agentProfile.lineUrl),
    whatsappPhone: readNullableString(agentProfile.whatsappPhone),
    telegramUrl: readNullableString(agentProfile.telegramUrl),
    viberPhone: readNullableString(agentProfile.viberPhone),
    supportLanguages: readStringArray(agentProfile.supportLanguages),
    reviewSummary: parseReviewSummary(agentProfile.reviewSummary),
    isVerified: readBoolean(agentProfile.isVerified),
    isOnline: readBoolean(agentProfile.isOnline),
    isActive: readBoolean(agentProfile.isActive, true),
    createdAt: readString(agentProfile.createdAt),
    listingSummary: parseListerProfileSummary(agentProfile.listingSummary),
  }
}

export async function getListerProfileById(agentProfileId: string) {
  const response = await apiClient.get<unknown>(
    `/search/agents/${agentProfileId}`,
  )

  return parseListerProfileResponse(response.data)
}
