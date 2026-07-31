import { Users } from "lucide-react"
import { useCallback, useMemo, useState, type RefObject } from "react"

import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"
import {
  ListingCollectionMessage,
} from "@/shared/components/collections/ListingCollectionState"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"
import { cn } from "@/lib/utils"

import {
  useSearchBuildingFollowers,
  type SearchBuildingFollower,
} from "../api"
import { useDeleteBuildingFollow } from "../api/useDeleteBuildingFollow"
import {
  getBuildingFollowerListKey,
} from "../utils/buildingFollowerDisplay"
import { BuildingFollowerListItem } from "./BuildingFollowerListItem"
import { BuildingFollowersListSkeleton } from "./BuildingFollowersListSkeleton"

type BuildingFollowersListProps = {
  buildingId?: string
  viewerUserId?: string | null
  enabled?: boolean
  limit?: number
  rootRef?: RefObject<HTMLElement | null>
  className?: string
}

export function BuildingFollowersList({
  buildingId,
  viewerUserId,
  enabled = true,
  limit = DEFAULT_LISTING_PAGE_SIZE,
  rootRef,
  className,
}: BuildingFollowersListProps) {
  const [unfollowingUserId, setUnfollowingUserId] = useState<string | null>(
    null,
  )
  const unfollowMutation = useDeleteBuildingFollow()
  const followersQuery = useSearchBuildingFollowers({
    buildingId,
    limit,
    enabled,
  })

  const followers = useMemo(() => {
    return flattenUniqueInfiniteItems({
      data: followersQuery.data,
      getItems: (page) => page.data?.followers ?? [],
      getKey: getBuildingFollowerListKey,
    })
  }, [followersQuery.data])

  const hasFollowers = followers.length > 0
  const isInitialLoading = followersQuery.isPending && !hasFollowers
  const isInitialError = followersQuery.isError && !hasFollowers
  const isBackgroundFetching =
    followersQuery.isFetching &&
    !followersQuery.isFetchingNextPage &&
    hasFollowers

  const handleUnfollow = useCallback(
    (follower: SearchBuildingFollower) => {
      if (!buildingId) return

      setUnfollowingUserId(follower.userId)
      unfollowMutation.mutate(
        { buildingId },
        { onSettled: () => setUnfollowingUserId(null) },
      )
    },
    [buildingId, unfollowMutation],
  )

  if (isInitialLoading) {
    return <BuildingFollowersListSkeleton className={className} />
  }

  if (isInitialError) {
    return (
      <ListingCollectionMessage
        title="Could not load followers"
        description="Please try again in a moment."
        onRetry={() => void followersQuery.refetch()}
        className={className}
      />
    )
  }

  if (!hasFollowers) {
    return (
      <ListingCollectionMessage
        icon={Users}
        title="No followers yet"
        description="When people follow this building, they will appear here."
        className={className}
      />
    )
  }

  return (
    <section
      className={cn("min-w-0", className)}
      aria-label="Building followers"
      aria-busy={isBackgroundFetching || undefined}
    >
      {followersQuery.isError && hasFollowers && (
        <div className="bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 sm:px-5">
          Could not refresh followers. Showing the previous list.{" "}
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => void followersQuery.refetch()}
          >
            Try again
          </button>
        </div>
      )}

      {isBackgroundFetching && (
        <p className="px-4 py-2 text-xs font-medium text-slate-500 sm:px-5">
          Updating followers...
        </p>
      )}

      <div>
        {followers.map((follower) => (
          <BuildingFollowerListItem
            key={getBuildingFollowerListKey(follower)}
            follower={follower}
            isViewer={Boolean(viewerUserId && follower.userId === viewerUserId)}
            isUnfollowing={unfollowingUserId === follower.userId}
            onUnfollow={handleUnfollow}
          />
        ))}

        <InfiniteScrollSentinel
          rootRef={rootRef}
          hasNextPage={Boolean(followersQuery.hasNextPage)}
          isFetchingNextPage={followersQuery.isFetchingNextPage}
          isFetchNextPageError={followersQuery.isFetchNextPageError}
          errorMessage="Could not load more followers."
          onFetchNextPage={() => void followersQuery.fetchNextPage()}
          endMessage="No more followers"
        />
      </div>
    </section>
  )
}
