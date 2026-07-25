import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseAdminReportListing,
  type AdminReportListing,
} from "./searchAdminReports"

export type DeleteAdminListingInput = {
  listingId: string
  reason: string
}

export type DeleteAdminListingResponse = {
  success: true
  data: AdminReportListing
}

export async function deleteAdminListing({
  listingId,
  reason,
}: DeleteAdminListingInput) {
  const normalizedListingId = listingId.trim()
  const normalizedReason = reason.trim()

  if (!normalizedListingId) {
    throw new ApiError("Listing id is required.", 422, "VALIDATION_ERROR")
  }
  if (!normalizedReason) {
    throw new ApiError(
      "Deletion reason is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.delete<unknown>(
    `/admin/listings/${encodeURIComponent(normalizedListingId)}`,
    { reason: normalizedReason },
  )
  const responseData = response.data as Partial<DeleteAdminListingResponse>
  const parsedListing = parseAdminReportListing(
    responseData.data,
  )

  if (!parsedListing) {
    throw new ApiError(
      "Admin delete listing response is missing listing data.",
      500,
      "INVALID_ADMIN_DELETE_LISTING_RESPONSE",
    )
  }

  return parsedListing
}

export function isAdminListingNotFoundError(error: unknown) {
  return (
    error instanceof ApiError &&
    (error.status === 404 || error.code === "LISTING_NOT_FOUND")
  )
}
