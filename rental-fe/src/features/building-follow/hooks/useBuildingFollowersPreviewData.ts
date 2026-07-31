import { useMemo } from "react"

import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"

import { useSearchBuildingFollowers } from "../api"
import type { SearchBuildingFollower } from "../api/buildingFollowParsers"
import {
  BUILDING_FOLLOWERS_PREVIEW_FETCH_LIMIT,
  getBuildingFollowerListKey,
  normalizeBuildingFollowersBuildingId,
  normalizeFollowerTotal,
} from "../utils/buildingFollowerDisplay"

type UseBuildingFollowersPreviewDataInput = {
  buildingId?: string | null
  enabled?: boolean
}

export type BuildingFollowersPreviewDataState = {
  buildingId: string
  followers: SearchBuildingFollower[]
  totalFollowers: number
  hasFollowers: boolean
  isInitialLoading: boolean
  isError: boolean
  isEnabled: boolean
  shouldRender: boolean
}

export function useBuildingFollowersPreviewData({
  buildingId,
  enabled = true,
}: UseBuildingFollowersPreviewDataInput = {}): BuildingFollowersPreviewDataState {
  const normalizedBuildingId = normalizeBuildingFollowersBuildingId(buildingId)
  const isEnabled = enabled && normalizedBuildingId.length > 0

  const followersQuery = useSearchBuildingFollowers({
    buildingId: normalizedBuildingId,
    limit: BUILDING_FOLLOWERS_PREVIEW_FETCH_LIMIT,
    enabled: isEnabled,
  })

  const followers = useMemo(() => {
    return flattenUniqueInfiniteItems({
      data: followersQuery.data,
      getItems: (page) => page.data?.followers ?? [],
      getKey: getBuildingFollowerListKey,
    })
  }, [followersQuery.data])

  const totalFollowers = normalizeFollowerTotal(
    followersQuery.data?.pages[0]?.pagination.total ?? followers.length,
  )
  const isInitialLoading =
    followersQuery.isPending && followers.length === 0 && totalFollowers === 0
  const isError = followersQuery.isError
  const hasFollowers = totalFollowers > 0
  const shouldRender = isEnabled && (isInitialLoading || !isError)

  return {
    buildingId: normalizedBuildingId,
    followers,
    totalFollowers,
    hasFollowers,
    isInitialLoading,
    isError,
    isEnabled,
    shouldRender,
  }
}
