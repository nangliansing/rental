import { ApiError, apiClient } from "@/lib/api-client"

import type { ListingMedia } from "@/features/map-search/types"

import { parseSavedListingResponse } from "./savedListingParsers"

export type SavedListingSnapshot = {
  rent: number | null
  visibility: "PUBLIC" | "PRIVATE"
  buildingName: string | null
  coverPhoto: ListingMedia | null
}

export type SavedListing = {
  _id: string
  userId: string
  listingId: string
  buildingId: string
  listedBy: string
  snapshot: SavedListingSnapshot
  createdAt: string
  updatedAt: string
}

export type CreateSavedListingInput = {
  listingId: string
  signal?: AbortSignal
}

type CreateSavedListingResponse = {
  success: true
  data: SavedListing
}

export async function createSavedListing({
  listingId,
  signal,
}: CreateSavedListingInput) {
  const normalizedListingId = listingId.trim()

  if (!normalizedListingId) {
    throw new ApiError(
      "Listing id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.post<CreateSavedListingResponse>(
    `/saved-listings/${encodeURIComponent(normalizedListingId)}`,
    {},
    true,
    signal,
  )

  return parseSavedListingResponse(response.data)
}
