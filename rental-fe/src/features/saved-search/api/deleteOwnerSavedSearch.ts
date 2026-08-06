import { ApiError, apiClient } from "@/lib/api-client"

import {
  parseGetOwnerSavedSearchByIdResponse,
  type SavedSearch,
} from "./savedSearchParsers"

export type DeletedOwnerSavedSearch = SavedSearch & {
  isDeleted: true
  deletedAt: string
}

export type DeleteOwnerSavedSearchInput = {
  savedSearchId: string
}

export type DeleteOwnerSavedSearchResponse = {
  success: true
  data: DeletedOwnerSavedSearch
}

const INVALID_DELETE_OWNER_SAVED_SEARCH_RESPONSE =
  "INVALID_SAVED_SEARCH_RESPONSE"

const invalidResponse = () =>
  new ApiError(
    "Could not confirm that the saved search was deleted.",
    500,
    INVALID_DELETE_OWNER_SAVED_SEARCH_RESPONSE,
  )

export function isOwnerSavedSearchNotFoundError(error: unknown) {
  return (
    error instanceof ApiError && error.code === "SAVED_SEARCH_NOT_FOUND"
  )
}

export const parseDeleteOwnerSavedSearchResponse = (
  value: unknown,
): DeleteOwnerSavedSearchResponse => {
  let savedSearch: SavedSearch

  try {
    savedSearch = parseGetOwnerSavedSearchByIdResponse(value).data
  } catch {
    throw invalidResponse()
  }

  if (savedSearch.isDeleted !== true || !savedSearch.deletedAt) {
    throw invalidResponse()
  }

  return {
    success: true,
    data: {
      ...savedSearch,
      isDeleted: true,
      deletedAt: savedSearch.deletedAt,
    },
  }
}

export async function deleteOwnerSavedSearch({
  savedSearchId,
}: DeleteOwnerSavedSearchInput): Promise<DeletedOwnerSavedSearch> {
  const normalizedSavedSearchId = savedSearchId.trim()

  if (!normalizedSavedSearchId) {
    throw new ApiError(
      "Saved search id is required.",
      422,
      "VALIDATION_ERROR",
    )
  }

  const response = await apiClient.delete<unknown>(
    `/saved-searches/${encodeURIComponent(normalizedSavedSearchId)}`,
  )

  return parseDeleteOwnerSavedSearchResponse(response.data).data
}
