import { apiClient } from "@/lib/api-client"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  normalizePositiveInteger,
  parseSearchOwnerSavedSearchesResponse,
  type SavedSearchStatus,
  type SearchOwnerSavedSearchesResponse,
} from "./savedSearchParsers"

export type SearchOwnerSavedSearchesInput = {
  status?: SavedSearchStatus
  page?: number
  limit?: number
  signal?: AbortSignal
}

const clampSearchOwnerSavedSearchesPage = (page: unknown) =>
  Math.min(normalizePositiveInteger(page, 1), 10000)

const clampSearchOwnerSavedSearchesLimit = (limit: unknown) =>
  Math.min(normalizePositiveInteger(limit, DEFAULT_LISTING_PAGE_SIZE), 100)

export async function searchOwnerSavedSearches({
  status,
  page = 1,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  signal,
}: SearchOwnerSavedSearchesInput = {}): Promise<SearchOwnerSavedSearchesResponse> {
  const normalizedPage = clampSearchOwnerSavedSearchesPage(page)
  const normalizedLimit = clampSearchOwnerSavedSearchesLimit(limit)
  const searchParams = new URLSearchParams({
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  })

  if (status !== undefined) {
    searchParams.set("status", status)
  }

  const response = await apiClient.get<SearchOwnerSavedSearchesResponse>(
    `/saved-searches?${searchParams.toString()}`,
    true,
    signal,
  )

  return parseSearchOwnerSavedSearchesResponse(response.data, {
    page: normalizedPage,
    limit: normalizedLimit,
  })
}
