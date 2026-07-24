import { ApiError, apiClient } from "@/lib/api-client"

import type { SavedListing } from "./createSavedListing"
import { parseSavedListingResponse } from "./savedListingParsers"

export type DeleteSavedListingInput = {
  listingId: string
  signal?: AbortSignal
}

export function isSavedListingNotFoundError(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.code === "SAVED_LISTING_NOT_FOUND" || error.status === 404)
  )
}

export function isSavedListingAlreadyExistsError(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.code === "SAVED_LISTING_ALREADY_EXISTS" || error.status === 409)
  )
}

export async function deleteSavedListing({
  listingId,
  signal,
}: DeleteSavedListingInput): Promise<SavedListing> {
  const normalizedListingId = listingId.trim()

  if (!normalizedListingId) {
    throw new ApiError(
      "Listing id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.delete<unknown>(
    `/saved-listings/${encodeURIComponent(normalizedListingId)}`,
    undefined,
    true,
    signal,
  )

  return parseSavedListingResponse(response.data)
}
