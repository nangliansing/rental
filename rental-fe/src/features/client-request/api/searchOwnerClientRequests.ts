import { apiClient } from "@/lib/api-client"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  normalizePositiveInteger,
  parseSearchOwnerClientRequestsResponse,
  type ClientRequestStatus,
  type SearchOwnerClientRequestsResponse,
} from "./clientRequestParsers"

export type SearchOwnerClientRequestsInput = {
  status?: ClientRequestStatus
  page?: number
  limit?: number
  signal?: AbortSignal
}

const clampSearchOwnerClientRequestsPage = (page: unknown) =>
  Math.min(normalizePositiveInteger(page, 1), 10000)

const clampSearchOwnerClientRequestsLimit = (limit: unknown) =>
  Math.min(normalizePositiveInteger(limit, DEFAULT_LISTING_PAGE_SIZE), 100)

export async function searchOwnerClientRequests({
  status,
  page = 1,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  signal,
}: SearchOwnerClientRequestsInput = {}): Promise<SearchOwnerClientRequestsResponse> {
  const normalizedPage = clampSearchOwnerClientRequestsPage(page)
  const normalizedLimit = clampSearchOwnerClientRequestsLimit(limit)
  const searchParams = new URLSearchParams({
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  })

  if (status !== undefined) {
    searchParams.set("status", status)
  }

  const response = await apiClient.get<SearchOwnerClientRequestsResponse>(
    `/client-requests?${searchParams.toString()}`,
    true,
    signal,
  )

  return parseSearchOwnerClientRequestsResponse(response.data, {
    page: normalizedPage,
    limit: normalizedLimit,
  })
}
