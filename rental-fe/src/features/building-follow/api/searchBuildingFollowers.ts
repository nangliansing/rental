import { apiClient } from "@/lib/api-client"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  normalizePositiveInteger,
  parseSearchBuildingFollowersResponse,
} from "./buildingFollowParsers"

export type SearchBuildingFollowersInput = {
  buildingId: string
  page?: number
  limit?: number
  signal?: AbortSignal
}

const clampSearchBuildingFollowersPage = (page: unknown) =>
  Math.min(normalizePositiveInteger(page, 1), 10000)

const clampSearchBuildingFollowersLimit = (limit: unknown) =>
  Math.min(normalizePositiveInteger(limit, 20), 100)

export async function searchBuildingFollowers({
  buildingId,
  page = 1,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  signal,
}: SearchBuildingFollowersInput) {
  const normalizedBuildingId = buildingId.trim()
  const normalizedPage = clampSearchBuildingFollowersPage(page)
  const normalizedLimit = clampSearchBuildingFollowersLimit(limit)
  const searchParams = new URLSearchParams({
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  })

  const response = await apiClient.get<unknown>(
    `/building-follows/buildings/${encodeURIComponent(normalizedBuildingId)}?${searchParams.toString()}`,
    { signal },
  )

  return parseSearchBuildingFollowersResponse(response.data, {
    page: normalizedPage,
    limit: normalizedLimit,
  })
}
