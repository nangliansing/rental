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

import { searchBuildingFollowers } from "./searchBuildingFollowers"

export const buildingFollowersQueryKey = ({
  buildingId,
  limit,
}: {
  buildingId: string
  limit: number
}) => queryKeys.buildingFollows.buildingList({ buildingId, limit })

type UseSearchBuildingFollowersInput = {
  buildingId?: string
  limit?: number
  enabled?: boolean
}

export const buildingFollowersQueryOptions = ({
  buildingId = "",
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchBuildingFollowersInput = {}) => {
  const normalizedBuildingId = buildingId.trim()

  return infiniteQueryOptions({
    queryKey: buildingFollowersQueryKey({
      buildingId: normalizedBuildingId,
      limit,
    }),
    enabled: enabled && normalizedBuildingId.length > 0,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      searchBuildingFollowers({
        buildingId: normalizedBuildingId,
        page: readPageParam(pageParam),
        limit,
        signal,
      }),
    getNextPageParam,
  })
}

export function useSearchBuildingFollowers({
  buildingId,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  enabled = true,
}: UseSearchBuildingFollowersInput = {}) {
  return useInfiniteQuery(
    buildingFollowersQueryOptions({ buildingId, limit, enabled }),
  )
}
