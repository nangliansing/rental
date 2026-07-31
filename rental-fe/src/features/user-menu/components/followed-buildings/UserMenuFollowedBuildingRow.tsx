import { Building2 } from "lucide-react"
import { Link } from "react-router-dom"

import type { SearchBuildingFollow } from "@/features/building-follow/api"
import { cn } from "@/lib/utils"

import {
  getFollowedBuildingAddress,
  getFollowedBuildingLabel,
  getFollowedBuildingPath,
  normalizeFollowedBuildingFollowId,
} from "../../utils/followedBuildingDisplay"

type UserMenuFollowedBuildingRowProps = {
  follow: SearchBuildingFollow
  className?: string
  onNavigate?: () => void
}

export function UserMenuFollowedBuildingRow({
  follow,
  className,
  onNavigate,
}: UserMenuFollowedBuildingRowProps) {
  const followId = normalizeFollowedBuildingFollowId(follow)
  if (!followId) return null

  const buildingPath = getFollowedBuildingPath(follow)
  const label = getFollowedBuildingLabel(follow)
  const address = getFollowedBuildingAddress(follow)

  if (!buildingPath) {
    return (
      <div className={cn("flex items-start gap-3 py-3", className)}>
        <FollowedBuildingIcon />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{label}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Building unavailable
          </p>
        </div>
      </div>
    )
  }

  return (
    <Link
      to={buildingPath}
      className={cn(
        "flex items-start gap-3 py-3 transition-colors hover:bg-slate-50",
        className,
      )}
      onClick={onNavigate}
    >
      <FollowedBuildingIcon />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-950">{label}</p>
        {address ? (
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
            {address}
          </p>
        ) : null}
      </div>
    </Link>
  )
}

function FollowedBuildingIcon() {
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
      <Building2 aria-hidden="true" className="h-4 w-4" />
    </span>
  )
}
