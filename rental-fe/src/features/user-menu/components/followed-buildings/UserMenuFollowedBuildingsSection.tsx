import type { RefObject } from "react"
import { useCallback, useState } from "react"

import type { SearchBuildingFollow } from "@/features/building-follow/api"
import { useDeleteBuildingFollow } from "@/features/building-follow/api/useDeleteBuildingFollow"
import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"

import { useUserMenuFollowedBuildings } from "../../hooks/useUserMenuFollowedBuildings"
import {
  getFollowedBuildingId,
  normalizeFollowedBuildingFollowId,
} from "../../utils/followedBuildingDisplay"
import { normalizeUserMenuUserId } from "../../utils/userMenuDisplay"
import { UserMenuFollowedBuildingRow } from "./UserMenuFollowedBuildingRow"
import { UserMenuFollowedBuildingsEmpty } from "./UserMenuFollowedBuildingsEmpty"
import { UserMenuFollowedBuildingsError } from "./UserMenuFollowedBuildingsError"
import { UserMenuFollowedBuildingsSkeleton } from "./UserMenuFollowedBuildingsSkeleton"
import { UserMenuSectionHeading } from "./UserMenuSectionHeading"

type UserMenuFollowedBuildingsSectionProps = {
  userId?: string | null
  enabled?: boolean
  rootRef?: RefObject<HTMLDivElement | null>
  onNavigate?: () => void
}

export function UserMenuFollowedBuildingsSection({
  userId,
  enabled = true,
  rootRef,
  onNavigate,
}: UserMenuFollowedBuildingsSectionProps) {
  const normalizedUserId = normalizeUserMenuUserId(userId)
  const [unfollowingBuildingId, setUnfollowingBuildingId] = useState<string | null>(
    null,
  )
  const unfollowMutation = useDeleteBuildingFollow()
  const {
    followedBuildings,
    totalFollowedBuildings,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchNextPageError,
    isFetchingNextPage,
    isLoading,
    isQueryEnabled,
    refetch,
  } = useUserMenuFollowedBuildings({
    userId: normalizedUserId,
    enabled,
  })

  const handleUnfollow = useCallback(
    (follow: SearchBuildingFollow) => {
      const buildingId = getFollowedBuildingId(follow)
      if (!buildingId || unfollowMutation.isPending) return

      setUnfollowingBuildingId(buildingId)
      unfollowMutation.mutate(
        { buildingId },
        {
          onSettled: () => {
            setUnfollowingBuildingId((current) =>
              current === buildingId ? null : current,
            )
          },
        },
      )
    },
    [unfollowMutation],
  )

  if (!isQueryEnabled) {
    return null
  }

  return (
    <section aria-label="Followed buildings" className="px-5 py-4">
      <UserMenuSectionHeading
        title="Followed buildings"
        total={totalFollowedBuildings}
      />

      {isLoading ? (
        <UserMenuFollowedBuildingsSkeleton className="mt-3" />
      ) : isError ? (
        <UserMenuFollowedBuildingsError onRetry={() => void refetch()} />
      ) : followedBuildings.length === 0 ? (
        <UserMenuFollowedBuildingsEmpty />
      ) : (
        <div className="mt-2 divide-y divide-slate-100">
          {followedBuildings.map((follow) => {
            const buildingId = getFollowedBuildingId(follow)
            const followKey = normalizeFollowedBuildingFollowId(follow) ?? buildingId

            return (
              <UserMenuFollowedBuildingRow
                key={followKey}
                follow={follow}
                isUnfollowing={buildingId === unfollowingBuildingId}
                isDisabled={unfollowMutation.isPending}
                onNavigate={onNavigate}
                onUnfollow={handleUnfollow}
              />
            )
          })}

          <InfiniteScrollSentinel
            rootRef={rootRef}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
            errorMessage="Could not load more followed buildings."
            onFetchNextPage={() => void fetchNextPage()}
            endMessage={
              totalFollowedBuildings > 0
                ? `${totalFollowedBuildings} followed building${totalFollowedBuildings === 1 ? "" : "s"}`
                : undefined
            }
          />
        </div>
      )}
    </section>
  )
}
