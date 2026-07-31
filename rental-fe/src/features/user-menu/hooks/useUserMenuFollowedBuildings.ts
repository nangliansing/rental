import { useMemo } from "react"

import { useSearchUserBuildingFollows } from "@/features/building-follow/api"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"

import { USER_MENU_BUILDING_FOLLOWS_PAGE_SIZE } from "../constants"
import {
  isRenderableFollowedBuilding,
  normalizeFollowedBuildingFollowId,
} from "../utils/followedBuildingDisplay"
import { normalizeUserMenuUserId } from "../utils/userMenuDisplay"

type UseUserMenuFollowedBuildingsInput = {
  userId?: string | null
  enabled?: boolean
}

export function useUserMenuFollowedBuildings({
  userId,
  enabled = true,
}: UseUserMenuFollowedBuildingsInput) {
  const normalizedUserId = normalizeUserMenuUserId(userId)
  const isQueryEnabled = enabled && normalizedUserId.length > 0

  const query = useSearchUserBuildingFollows({
    userId: normalizedUserId,
    limit: USER_MENU_BUILDING_FOLLOWS_PAGE_SIZE,
    enabled: isQueryEnabled,
  })

  const followedBuildings = useMemo(() => {
    const items = flattenUniqueInfiniteItems({
      data: query.data,
      getItems: (page) => page.data?.followings ?? [],
      getKey: (follow) => normalizeFollowedBuildingFollowId(follow) ?? "",
    })

    return items.filter(isRenderableFollowedBuilding)
  }, [query.data])

  const totalFollowedBuildings = query.data?.pages[0]?.pagination.total ?? 0

  return {
    followedBuildings,
    totalFollowedBuildings,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isError: query.isError,
    isFetchNextPageError: query.isFetchNextPageError ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    isQueryEnabled,
    refetch: query.refetch,
  }
}
