import { useCallback, useSyncExternalStore } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { readBuildingFollowingFromCache } from "../utils/buildingFollowCache"

type UseBuildingFollowingFromCacheInput = {
  buildingId: string
  fallbackIsFollowing: boolean
  enabled?: boolean
}

export function useBuildingFollowingFromCache({
  buildingId,
  fallbackIsFollowing,
  enabled = true,
}: UseBuildingFollowingFromCacheInput): boolean {
  const queryClient = useQueryClient()

  const getSnapshot = useCallback(() => {
    if (!enabled || !buildingId) return fallbackIsFollowing

    return (
      readBuildingFollowingFromCache(queryClient, buildingId) ??
      fallbackIsFollowing
    )
  }, [buildingId, enabled, fallbackIsFollowing, queryClient])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!enabled || !buildingId) return () => undefined

      let previous = readBuildingFollowingFromCache(queryClient, buildingId)

      return queryClient.getQueryCache().subscribe(() => {
        const next = readBuildingFollowingFromCache(queryClient, buildingId)
        if (next === previous) return
        previous = next
        onStoreChange()
      })
    },
    [buildingId, enabled, queryClient],
  )

  const getServerSnapshot = useCallback(
    () => fallbackIsFollowing,
    [fallbackIsFollowing],
  )

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
