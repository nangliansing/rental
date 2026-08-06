import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseGetOwnerSavedSearchByIdResponse,
  type SavedSearch,
} from "./savedSearchParsers"

export type UpdateOwnerSavedSearchStatusInput = {
  savedSearchId: string
  /** Only Closed is accepted by the owner status endpoint. */
  status: "Closed"
}

export async function updateOwnerSavedSearchStatus({
  savedSearchId,
  status,
}: UpdateOwnerSavedSearchStatusInput): Promise<SavedSearch> {
  const normalizedSavedSearchId = savedSearchId.trim()

  if (!normalizedSavedSearchId) {
    throw new ApiError(
      "Saved search id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  if (status !== "Closed") {
    throw new ApiError(
      "status must be Closed.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.patch<unknown>(
    `/saved-searches/${encodeURIComponent(normalizedSavedSearchId)}/status`,
    { status: "Closed" },
  )

  return parseGetOwnerSavedSearchByIdResponse(response.data).data
}
