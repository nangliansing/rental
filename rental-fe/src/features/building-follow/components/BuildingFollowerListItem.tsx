import { BadgeCheck } from "lucide-react"

import { Avatar } from "@/shared/components/data-display/Avatar"
import { cn } from "@/lib/utils"

import type { SearchBuildingFollower } from "../api/buildingFollowParsers"
import {
  formatBuildingFollowedSince,
  getBuildingFollowerDisplayName,
} from "../utils/buildingFollowerDisplay"
import { BuildingUnfollowButton } from "./BuildingUnfollowButton"

type BuildingFollowerListItemProps = {
  follower: SearchBuildingFollower
  isViewer?: boolean
  isUnfollowing?: boolean
  onUnfollow?: (follower: SearchBuildingFollower) => void
  className?: string
}

export function BuildingFollowerListItem({
  follower,
  isViewer = false,
  isUnfollowing = false,
  onUnfollow,
  className,
}: BuildingFollowerListItemProps) {
  const displayName = getBuildingFollowerDisplayName(
    follower.user,
    follower.userId,
  )
  const followedSince = formatBuildingFollowedSince(follower.createdAt)

  return (
    <article
      className={cn(
        "flex items-center gap-3 px-4 py-3 sm:px-5",
        className,
      )}
      aria-label={`Follower ${displayName}`}
    >
      <Avatar
        displayName={displayName}
        photo={follower.user?.profilePhoto}
        colorKey={follower.user?._id ?? follower.userId}
        size="sm"
      />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-slate-950">
            {displayName}
          </p>
          {follower.user?.isVerified && (
            <BadgeCheck
              aria-label="Verified follower"
              className="h-4 w-4 shrink-0 text-sky-600"
            />
          )}
        </div>
        <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
          {followedSince}
        </p>
      </div>

      {isViewer && onUnfollow ? (
        <BuildingUnfollowButton
          subjectLabel={displayName}
          isUnfollowing={isUnfollowing}
          onClick={() => onUnfollow(follower)}
        />
      ) : null}
    </article>
  )
}
