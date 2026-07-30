import { ApiError, apiClient } from "@/lib/api-client"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import type { Pagination } from "@/features/map-search/types"

import type { OwnerListing, OwnerListingAgentProfile } from "./getOwnerListingById"
import {
  parseOwnerListing,
  parseOwnerListingAgentProfile,
  readRecord,
} from "./listingResponseParsers"

export type OwnerListingFilter = "all" | "now" | "soon" | "private"
export type OwnerListingSort = "latest" | "oldest"

export type SearchOwnerListingsInput = {
  filter?: OwnerListingFilter
  sort?: OwnerListingSort
  page?: number
  limit?: number
  signal?: AbortSignal
}

export type SearchOwnerListingsResponse = {
  success: true
  data: {
    agentProfile: OwnerListingAgentProfile | null
    listings: OwnerListing[]
  }
  pagination: Pagination
}

const INVALID_OWNER_LISTINGS_RESPONSE = "INVALID_OWNER_LISTINGS_RESPONSE"
const LISTING_FILTERS: OwnerListingFilter[] = ["all", "now", "soon", "private"]
const SORT_OPTIONS: OwnerListingSort[] = ["latest", "oldest"]

const invalidResponse = () =>
  new ApiError(
    "Unable to load your listings. Please try again.",
    500,
    INVALID_OWNER_LISTINGS_RESPONSE,
  )

const validateIntegerRange = (
  value: number,
  field: "page" | "limit",
  maximum: number,
) => {
  if (!Number.isFinite(value)) {
    throw new ApiError(`${field} must be a number`, 422, "VALIDATION_ERROR")
  }

  if (!Number.isInteger(value)) {
    throw new ApiError(`${field} must be an integer`, 422, "VALIDATION_ERROR")
  }

  if (value < 1 || value > maximum) {
    throw new ApiError(
      `${field} must be between 1 and ${maximum}`,
      422,
      "VALIDATION_ERROR",
    )
  }

  return value
}

const parsePagination = (
  value: unknown,
  expected: { page: number; limit: number },
): Pagination => {
  const pagination = readRecord(value)
  const page = pagination.page
  const limit = pagination.limit
  const total = pagination.total

  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    !Number.isInteger(total) ||
    page !== expected.page ||
    limit !== expected.limit ||
    (total as number) < 0
  ) {
    throw invalidResponse()
  }

  return {
    page: page as number,
    limit: limit as number,
    total: total as number,
  }
}

const parseSearchOwnerListingsResponse = (
  value: unknown,
  expected: { page: number; limit: number },
): SearchOwnerListingsResponse => {
  const body = readRecord(value)
  const data = readRecord(body.data)

  if (body.success !== true || !Array.isArray(data.listings)) {
    throw invalidResponse()
  }

  return {
    success: true,
    data: {
      agentProfile: parseOwnerListingAgentProfile(data.agentProfile, {
        errorMessage: "Owner listings response has invalid agent profile data.",
        errorCode: INVALID_OWNER_LISTINGS_RESPONSE,
      }),
      listings: data.listings.map((listing) =>
        parseOwnerListing(listing, {
          errorMessage: "Owner listing response is missing listing data.",
          errorCode: INVALID_OWNER_LISTINGS_RESPONSE,
        }),
      ),
    },
    pagination: parsePagination(body.pagination, expected),
  }
}

export async function searchOwnerListings({
  filter = "all",
  sort = "latest",
  page = 1,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  signal,
}: SearchOwnerListingsInput = {}) {
  if (!LISTING_FILTERS.includes(filter)) {
    throw new ApiError(
      `Invalid filter: ${String(filter)}`,
      422,
      "VALIDATION_ERROR",
    )
  }

  if (!SORT_OPTIONS.includes(sort)) {
    throw new ApiError(
      `Invalid sort: ${String(sort)}`,
      422,
      "VALIDATION_ERROR",
    )
  }

  const normalizedPage = validateIntegerRange(page, "page", 10000)
  const normalizedLimit = validateIntegerRange(limit, "limit", 100)
  const searchParams = new URLSearchParams({
    filter,
    sort,
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  })

  const response = await apiClient.get<unknown>(
    `/listings?${searchParams.toString()}`,
    true,
    signal,
  )

  return parseSearchOwnerListingsResponse(response.data, {
    page: normalizedPage,
    limit: normalizedLimit,
  })
}
