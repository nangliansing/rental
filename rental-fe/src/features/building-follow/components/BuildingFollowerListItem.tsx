import { BadgeCheck } from "lucide-react"

import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import { Avatar } from "@/shared/components/data-display/Avatar"
import { cn } from "@/lib/utils"

import type { SearchBuildingFollower } from "../api/buildingFollowParsers"
import {
  formatBuildingFollowedSince,
  getBuildingFollowerDisplayName,
} from "../utils/buildingFollowerDisplay"

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

      {isViewer && onUnfollow && (
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            "text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          aria-label={`Unfollow ${displayName}`}
          disabled={isUnfollowing}
          onClick={() => onUnfollow(follower)}
        >
          {isUnfollowing && (
            <LoaderIcon aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          Unfollow
        </button>
      )}
    </article>
  )
}
