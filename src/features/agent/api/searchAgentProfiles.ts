import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseListingMedia,
  parseReviewSummary,
  readBoolean,
  readNullableString,
  readRecord,
  readString,
  readStringArray,
} from "@/features/listing/api/listingResponseParsers"
import type { ListingMedia } from "@/features/map-search/types"
import type { ListerReviewSummary } from "@/features/lister-review/api"

export type SearchAgentProfile = {
  _id: string
  displayName: string | null
  profilePhoto: ListingMedia | null
  description: string | null
  supportLanguages: string[]
  reviewSummary: ListerReviewSummary
  isVerified: boolean
  isOnline: boolean
  createdAt: string
  updatedAt: string
}

export type SearchAgentProfilesInput = {
  query: string
  limit?: number
  signal?: AbortSignal
}

const INVALID_SEARCH_AGENT_PROFILES_RESPONSE =
  "INVALID_SEARCH_AGENT_PROFILES_RESPONSE"

const EMPTY_REVIEW_SUMMARY: ListerReviewSummary = {
  averageRating: 0,
  reviewCount: 0,
  ratingCounts: {
    oneStar: 0,
    twoStars: 0,
    threeStars: 0,
    fourStars: 0,
    fiveStars: 0,
  },
  tagCounts: [],
}

const parseSearchAgentProfile = (value: unknown): SearchAgentProfile => {
  const agentProfile = readRecord(value)
  const id = readString(agentProfile._id)

  if (!id) {
    throw new ApiError(
      "Search agent profiles response is missing agent profile data.",
      500,
      INVALID_SEARCH_AGENT_PROFILES_RESPONSE,
    )
  }

  return {
    _id: id,
    displayName: readNullableString(agentProfile.displayName),
    profilePhoto: parseListingMedia(agentProfile.profilePhoto),
    description: readNullableString(agentProfile.description),
    supportLanguages: readStringArray(agentProfile.supportLanguages),
    reviewSummary:
      parseReviewSummary(agentProfile.reviewSummary) ?? EMPTY_REVIEW_SUMMARY,
    isVerified: readBoolean(agentProfile.isVerified),
    isOnline: readBoolean(agentProfile.isOnline),
    createdAt: readString(agentProfile.createdAt),
    updatedAt: readString(agentProfile.updatedAt),
  }
}

export const parseSearchAgentProfilesResponse = (
  value: unknown,
): SearchAgentProfile[] => {
  const response = readRecord(value)

  return Array.isArray(response.data)
    ? response.data.map(parseSearchAgentProfile)
    : []
}

export async function searchAgentProfiles({
  query,
  limit = 10,
  signal,
}: SearchAgentProfilesInput) {
  const searchParams = new URLSearchParams({
    query,
    limit: String(limit),
  })

  const response = await apiClient.get<unknown>(
    `/search/agents?${searchParams.toString()}`,
    true,
    signal,
  )

  return parseSearchAgentProfilesResponse(response.data)
}
