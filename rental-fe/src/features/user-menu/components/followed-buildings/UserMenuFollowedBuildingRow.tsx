import { Building2 } from "lucide-react"
import { Link } from "react-router-dom"

import type { SearchBuildingFollow } from "@/features/building-follow/api"
import { BuildingUnfollowButton } from "@/features/building-follow/components/BuildingUnfollowButton"
import { cn } from "@/lib/utils"

import {
  getFollowedBuildingAddress,
  getFollowedBuildingId,
  getFollowedBuildingLabel,
  getFollowedBuildingPath,
  normalizeFollowedBuildingFollowId,
} from "../../utils/followedBuildingDisplay"

type UserMenuFollowedBuildingRowProps = {
  follow: SearchBuildingFollow
  className?: string
  isUnfollowing?: boolean
  isDisabled?: boolean
  onNavigate?: () => void
  onUnfollow?: (follow: SearchBuildingFollow) => void
}

export function UserMenuFollowedBuildingRow({
  follow,
  className,
  isUnfollowing = false,
  isDisabled = false,
  onNavigate,
  onUnfollow,
}: UserMenuFollowedBuildingRowProps) {
  const followId = normalizeFollowedBuildingFollowId(follow)
  if (!followId) return null

  const buildingId = getFollowedBuildingId(follow)
  const buildingPath = getFollowedBuildingPath(follow)
  const label = getFollowedBuildingLabel(follow)
  const address = getFollowedBuildingAddress(follow)
  const canUnfollow = Boolean(buildingId && onUnfollow)

  return (
    <article
      className={cn("flex items-start gap-2 py-3", className)}
      aria-label={`Followed building ${label}`}
    >
      {buildingPath ? (
        <Link
          to={buildingPath}
          className="flex min-w-0 flex-1 items-start gap-3 rounded-lg transition-colors hover:bg-slate-50"
          onClick={onNavigate}
        >
          <FollowedBuildingDetails label={label} address={address} />
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <FollowedBuildingDetails
            label={label}
            address={address}
            unavailable
          />
        </div>
      )}

      {canUnfollow ? (
        <BuildingUnfollowButton
          subjectLabel={label}
          isUnfollowing={isUnfollowing}
          disabled={isDisabled}
          onClick={() => onUnfollow?.(follow)}
        />
      ) : null}
    </article>
  )
}

function FollowedBuildingDetails({
  label,
  address,
  unavailable = false,
}: {
  label: string
  address: string | null
  unavailable?: boolean
}) {
  return (
    <>
      <FollowedBuildingIcon />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{label}</p>
        {unavailable ? (
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Building unavailable
          </p>
        ) : address ? (
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
            {address}
          </p>
        ) : null}
      </div>
    </>
  )
}

function FollowedBuildingIcon() {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
      <Building2 aria-hidden="true" className="h-4 w-4" />
    </span>
  )
}
