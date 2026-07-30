import { apiClient } from "@/lib/api-client"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  normalizePositiveInteger,
  parseSearchUserBuildingFollowsResponse,
} from "./buildingFollowParsers"

export type SearchUserBuildingFollowsInput = {
  userId: string
  page?: number
  limit?: number
  signal?: AbortSignal
}

const clampSearchUserBuildingFollowsPage = (page: unknown) =>
  Math.min(normalizePositiveInteger(page, 1), 10000)

const clampSearchUserBuildingFollowsLimit = (limit: unknown) =>
  Math.min(normalizePositiveInteger(limit, 20), 100)

export async function searchUserBuildingFollows({
  userId,
  page = 1,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  signal,
}: SearchUserBuildingFollowsInput) {
  const normalizedUserId = userId.trim()
  const normalizedPage = clampSearchUserBuildingFollowsPage(page)
  const normalizedLimit = clampSearchUserBuildingFollowsLimit(limit)
  const searchParams = new URLSearchParams({
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  })

  const response = await apiClient.get<unknown>(
    `/building-follows/users/${encodeURIComponent(normalizedUserId)}?${searchParams.toString()}`,
    true,
    signal,
  )

  return parseSearchUserBuildingFollowsResponse(response.data, {
    page: normalizedPage,
    limit: normalizedLimit,
  })
}
