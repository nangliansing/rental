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

export const buildingFollowsQueryKey = ({ limit }: { limit: number }) =>
  queryKeys.buildingFollows.list({ limit })

type UseSearchUserBuildingFollowsInput = {
  userId?: string
  limit?: number
  enabled?: boolean
}

export const buildingFollowsQueryOptions = ({
  userId = "",
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchUserBuildingFollowsInput = {}) =>
  infiniteQueryOptions({
    queryKey: buildingFollowsQueryKey({ limit }),
    enabled: enabled && userId.trim().length > 0,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchUserBuildingFollows({
        userId,
        page: readPageParam(pageParam),
        limit,
        signal,
      }),
    getNextPageParam,
  })

export function useSearchUserBuildingFollows({
  userId,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchUserBuildingFollowsInput = {}) {
  return useInfiniteQuery(
    buildingFollowsQueryOptions({ userId, limit, enabled }),
  )
}
