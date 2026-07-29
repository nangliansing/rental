import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseSearchListing,
  readRecord,
  type ListingWithBuilding,
} from "./listingResponseParsers"

export type PublicListing = ListingWithBuilding

export type GetPublicListingByIdResponse = {
  success: true
  data: {
    listing: PublicListing
  }
}

const parsePublicListingByIdResponse = (
  value: unknown,
): GetPublicListingByIdResponse => {
  const body = readRecord(value)
  const data = readRecord(body.data)

  return {
    success: true,
    data: {
      listing: parseSearchListing(data.listing, {
        errorMessage: "Public listing response is missing listing data.",
        errorCode: "INVALID_PUBLIC_LISTING_RESPONSE",
      }),
    },
  }
}

export async function getPublicListingById(
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

  const response = await apiClient.get<GetPublicListingByIdResponse>(
    `/search/listings/${encodeURIComponent(normalizedListingId)}`,
    { signal },
  )

  return parsePublicListingByIdResponse(response.data).data.listing
}
