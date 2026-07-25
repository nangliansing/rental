import { ApiError, apiClient } from "@/lib/api-client"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  parseListingMedia,
  parsePagination,
  parseSearchListing,
  readBoolean,
  readNullableString,
  readRecord,
  readString,
  readStringArray,
} from "@/features/listing/api/listingResponseParsers"
import type {
  ListingAgentProfile,
  Pagination,
  SearchListing,
} from "@/features/map-search/types"

export type SearchListingsByAgentInput = {
  agentProfileId: string
  page?: number
  limit?: number
  sort?: SearchListingsByAgentSort
  signal?: AbortSignal
}

export type SearchListingsByAgentSort = "latest" | "oldest"

export type SearchListingsByAgentProfile = Omit<
  ListingAgentProfile,
  "userId" | "reviewSummary"
> & {
  description: string | null
  isActive?: boolean
  createdAt: string
}

export type SearchListingsByAgentResponse = {
  success: true
  data: {
    agentProfile: SearchListingsByAgentProfile
    listings: SearchListing[]
  }
  pagination: Pagination
}

const INVALID_SEARCH_LISTINGS_BY_AGENT_RESPONSE =
  "INVALID_SEARCH_LISTINGS_BY_AGENT_RESPONSE"

const parseSearchListingsByAgentProfile = (
  value: unknown,
): SearchListingsByAgentProfile => {
  const agentProfile = readRecord(value)
  const id = readString(agentProfile._id)

  if (!id) {
    throw new ApiError(
      "Search listings by agent response is missing agent profile data.",
      500,
      INVALID_SEARCH_LISTINGS_BY_AGENT_RESPONSE,
    )
  }

  const parsedProfile: SearchListingsByAgentProfile = {
    _id: id,
    displayName: readString(agentProfile.displayName),
    profilePhoto: parseListingMedia(agentProfile.profilePhoto),
    description: readNullableString(agentProfile.description),
    phone: readNullableString(agentProfile.phone),
    lineUrl: readNullableString(agentProfile.lineUrl),
    whatsappPhone: readNullableString(agentProfile.whatsappPhone),
    telegramUrl: readNullableString(agentProfile.telegramUrl),
    viberPhone: readNullableString(agentProfile.viberPhone),
    supportLanguages: readStringArray(agentProfile.supportLanguages),
    isVerified: readBoolean(agentProfile.isVerified),
    isOnline: readBoolean(agentProfile.isOnline),
    createdAt: readString(agentProfile.createdAt),
  }

  if (typeof agentProfile.isActive === "boolean") {
    parsedProfile.isActive = agentProfile.isActive
  }

  return parsedProfile
}

export const parseSearchListingsByAgentResponse = (
  value: unknown,
  fallback: { page: number; limit: number },
): SearchListingsByAgentResponse => {
  const response = readRecord(value)
  const data = readRecord(response.data)

  return {
    success: true,
    data: {
      agentProfile: parseSearchListingsByAgentProfile(data.agentProfile),
      listings: Array.isArray(data.listings)
        ? data.listings.map((listing) =>
            parseSearchListing(listing, {
              errorMessage:
                "Search listings by agent response is missing listing data.",
              errorCode: INVALID_SEARCH_LISTINGS_BY_AGENT_RESPONSE,
            }),
          )
        : [],
    },
    pagination: parsePagination(response.pagination, fallback),
  }
}

export async function searchListingsByAgent({
  agentProfileId,
  page = 1,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  sort = "latest",
  signal,
}: SearchListingsByAgentInput) {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort,
  })

  const response = await apiClient.get<unknown>(
    `/search/agents/${agentProfileId}/listings?${searchParams.toString()}`,
    true,
    signal,
  )

  return parseSearchListingsByAgentResponse(response.data, { page, limit })
}
