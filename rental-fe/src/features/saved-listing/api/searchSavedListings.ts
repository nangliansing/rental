import { apiClient } from "@/lib/api-client"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import type {
  Pagination,
  SearchListing,
  SearchListingsBuilding,
} from "@/features/map-search/types"

import type { SavedListing, SavedListingSnapshot } from "./createSavedListing"
import {
  normalizePositiveInteger,
  parseSearchSavedListingsResponse,
} from "./savedListingParsers"

export type SavedListingLiveListing = SearchListing & {
  building: SearchListingsBuilding
}

export type SearchSavedListing = Omit<SavedListing, "snapshot" | "userId"> & {
  snapshot?: SavedListingSnapshot | null
  listing: SavedListingLiveListing | null
}

export type SearchSavedListingsInput = {
  page?: number
  limit?: number
  signal?: AbortSignal
}

export type SearchSavedListingsResponse = {
  success: true
  data: {
    savedListings: SearchSavedListing[]
  }
  pagination: Pagination
}

const clampSearchSavedListingsPage = (page: unknown) =>
  Math.min(normalizePositiveInteger(page, 1), 10000)

const clampSearchSavedListingsLimit = (limit: unknown) =>
  Math.min(normalizePositiveInteger(limit, 20), 100)

export async function searchSavedListings({
  page = 1,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  signal,
}: SearchSavedListingsInput = {}) {
  const normalizedPage = clampSearchSavedListingsPage(page)
  const normalizedLimit = clampSearchSavedListingsLimit(limit)
  const searchParams = new URLSearchParams({
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  })

  const response = await apiClient.get<SearchSavedListingsResponse>(
    `/saved-listings?${searchParams.toString()}`,
    true,
    signal,
  )

  return parseSearchSavedListingsResponse(response.data, {
    page: normalizedPage,
    limit: normalizedLimit,
  })
}
