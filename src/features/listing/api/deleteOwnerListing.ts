import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseUpdateOwnerListingResponse,
  type UpdatedOwnerListing,
} from "./updateOwnerListing"

export type DeletedOwnerListing = Omit<
  UpdatedOwnerListing,
  "visibility" | "isDeleted" | "deletedAt" | "deletedBy" | "deleteReason"
> & {
  visibility: "PRIVATE"
  isDeleted: true
  deletedAt: string
  deletedBy: string
  deleteReason: null
}

export type DeleteOwnerListingResponse = {
  success: true
  data: DeletedOwnerListing
}

const INVALID_DELETE_OWNER_LISTING_RESPONSE =
  "INVALID_DELETE_OWNER_LISTING_RESPONSE"

const invalidResponse = () =>
  new ApiError(
    "Could not confirm that the listing was deleted.",
    500,
    INVALID_DELETE_OWNER_LISTING_RESPONSE,
  )

export function isOwnerListingNotFoundError(error: unknown) {
  return error instanceof ApiError && error.code === "LISTING_NOT_FOUND"
}

export const parseDeleteOwnerListingResponse = (
  value: unknown,
): DeleteOwnerListingResponse => {
  let listing: UpdatedOwnerListing

  try {
    listing = parseUpdateOwnerListingResponse(value).data
  } catch {
    throw invalidResponse()
  }

  if (
    listing.visibility !== "PRIVATE" ||
    listing.isDeleted !== true ||
    !listing.deletedAt ||
    !listing.deletedBy ||
    listing.deleteReason !== null
  ) {
    throw invalidResponse()
  }

  return {
    success: true,
    data: {
      ...listing,
      visibility: listing.visibility,
      isDeleted: listing.isDeleted,
      deletedAt: listing.deletedAt,
      deletedBy: listing.deletedBy,
      deleteReason: listing.deleteReason,
    },
  }
}

export async function deleteOwnerListing(listingId: string) {
  const normalizedListingId = listingId.trim()

  if (!normalizedListingId) {
    throw new ApiError(
      "Listing id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.delete<unknown>(
    `/listings/${encodeURIComponent(normalizedListingId)}`,
  )

  return parseDeleteOwnerListingResponse(response.data).data
}
