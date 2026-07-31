import { Avatar } from "@/shared/components/data-display/Avatar"
import { cn } from "@/lib/utils"

import type { SearchBuildingFollower } from "../api/buildingFollowParsers"
import {
  BUILDING_FOLLOWERS_PREVIEW_AVATAR_LIMIT,
  getBuildingFollowerDisplayName,
  getBuildingFollowerListKey,
  normalizeFollowerTotal,
} from "../utils/buildingFollowerDisplay"
import {
  BUILDING_FOLLOWERS_PREVIEW_AVATAR_OVERLAP_CLASS,
  BUILDING_FOLLOWERS_PREVIEW_AVATAR_RING_CLASS,
  BUILDING_FOLLOWERS_PREVIEW_COMPACT_AVATAR_CLASS,
} from "../utils/buildingFollowersPreviewLayout"

type BuildingFollowerAvatarStackProps = {
  followers: readonly SearchBuildingFollower[]
  total?: number | null
  maxVisible?: number
  className?: string
}

export function BuildingFollowerAvatarStack({
  followers,
  total,
  maxVisible = BUILDING_FOLLOWERS_PREVIEW_AVATAR_LIMIT,
  className,
}: BuildingFollowerAvatarStackProps) {
  const safeTotal = normalizeFollowerTotal(total ?? followers.length)
  const safeMaxVisible =
    typeof maxVisible === "number" &&
    Number.isFinite(maxVisible) &&
    maxVisible > 0
      ? Math.floor(maxVisible)
      : BUILDING_FOLLOWERS_PREVIEW_AVATAR_LIMIT
  const visibleFollowers = followers.slice(0, safeMaxVisible)

  if (safeTotal === 0 || visibleFollowers.length === 0) {
    return null
  }

  return (
    <div
      className={cn("flex shrink-0 items-center", className)}
      aria-hidden="true"
    >
      {visibleFollowers.map((follower, index) => {
        const displayName = getBuildingFollowerDisplayName(
          follower.user,
          follower.userId,
        )

        return (
          <span
            key={getBuildingFollowerListKey(follower)}
            className={cn(
              BUILDING_FOLLOWERS_PREVIEW_AVATAR_RING_CLASS,
              index > 0 && BUILDING_FOLLOWERS_PREVIEW_AVATAR_OVERLAP_CLASS,
            )}
            style={{ zIndex: visibleFollowers.length - index }}
          >
            <Avatar
              displayName={displayName}
              photo={follower.user?.profilePhoto}
              colorKey={follower.user?._id ?? follower.userId}
              size="xs"
              className={BUILDING_FOLLOWERS_PREVIEW_COMPACT_AVATAR_CLASS}
            />
          </span>
        )
      })}
    </div>
  )
}
