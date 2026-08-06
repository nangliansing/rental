import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseGetOwnerSavedSearchByIdResponse,
  type SavedSearch,
} from "./savedSearchParsers"

export async function getOwnerSavedSearchById(
  savedSearchId: string,
  signal?: AbortSignal,
): Promise<SavedSearch> {
  const normalizedSavedSearchId = savedSearchId.trim()

  if (!normalizedSavedSearchId) {
    throw new ApiError(
      "Saved search id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.get<unknown>(
    `/saved-searches/${encodeURIComponent(normalizedSavedSearchId)}`,
    { signal },
  )

  return parseGetOwnerSavedSearchByIdResponse(response.data).data
}
