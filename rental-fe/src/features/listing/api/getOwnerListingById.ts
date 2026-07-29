import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseOwnerListing,
  parseOwnerListingAgentProfile,
  readRecord,
  type ListingWithOptionalBuilding,
  type ParsedOwnerListingAgentProfile,
} from "./listingResponseParsers"

export type OwnerListing = ListingWithOptionalBuilding

export type OwnerListingAgentProfile = ParsedOwnerListingAgentProfile

export type GetOwnerListingByIdResponse = {
  success: true
  data: {
    agentProfile: OwnerListingAgentProfile | null
    listing: OwnerListing
  }
}

const INVALID_OWNER_LISTING_RESPONSE = "INVALID_OWNER_LISTING_RESPONSE"

const parseGetOwnerListingByIdResponse = (
  value: unknown,
): GetOwnerListingByIdResponse => {
  const body = readRecord(value)
  const data = readRecord(body.data)

  if (body.success !== true) {
    throw new ApiError(
      "Unable to load this listing. Please try again.",
      500,
      INVALID_OWNER_LISTING_RESPONSE,
    )
  }

  return {
    success: true,
    data: {
      agentProfile: parseOwnerListingAgentProfile(data.agentProfile, {
        errorMessage: "Owner listing response has invalid agent profile data.",
        errorCode: INVALID_OWNER_LISTING_RESPONSE,
      }),
      listing: parseOwnerListing(data.listing, {
        errorMessage: "Owner listing response is missing listing data.",
        errorCode: INVALID_OWNER_LISTING_RESPONSE,
      }),
    },
  }
}

export async function getOwnerListingById(
  listingId: string,
  signal?: AbortSignal,
) {
  const normalizedListingId = listingId.trim()

  if (!normalizedListingId) {
    throw new ApiError(
      "Listing id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.get<unknown>(
    `/listings/${encodeURIComponent(normalizedListingId)}`,
    { signal },
  )

  return parseGetOwnerListingByIdResponse(response.data).data
}
