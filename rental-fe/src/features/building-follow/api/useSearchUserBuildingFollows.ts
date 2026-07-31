import {
  infiniteQueryOptions,
  useInfiniteQuery,
} from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  getNextPageParam,
  readPageParam,
} from "@/lib/query-pagination"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import { searchUserBuildingFollows } from "./searchUserBuildingFollows"

export const buildingFollowsQueryKey = ({
  userId,
  limit,
}: {
  userId: string
  limit: number
}) => queryKeys.buildingFollows.list({ userId, limit })

type UseSearchUserBuildingFollowsInput = {
  userId?: string
  limit?: number
  enabled?: boolean
}

export const buildingFollowsQueryOptions = ({
  userId = "",
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchUserBuildingFollowsInput = {}) => {
  const normalizedUserId = userId.trim()

  return infiniteQueryOptions({
    queryKey: buildingFollowsQueryKey({
      userId: normalizedUserId,
      limit,
    }),
    enabled: enabled && normalizedUserId.length > 0,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchUserBuildingFollows({
        userId: normalizedUserId,
        page: readPageParam(pageParam),
        limit,
        signal,
      }),
    getNextPageParam,
  })
}

export function useSearchUserBuildingFollows({
  userId,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchUserBuildingFollowsInput = {}) {
  return useInfiniteQuery(
    buildingFollowsQueryOptions({ userId, limit, enabled }),
  )
}
