import { BadgeCheck } from "lucide-react"

import { cn } from "@/lib/utils"

import type { SearchBuildingFollower } from "../api/buildingFollowParsers"
import {
  getBuildingFollowersSocialProofParts,
  normalizeFollowerTotal,
} from "../utils/buildingFollowerDisplay"
import {
  BUILDING_FOLLOWERS_PREVIEW_EMPTY_TEXT_CLASS,
  BUILDING_FOLLOWERS_PREVIEW_SOCIAL_PROOF_CLASS,
} from "../utils/buildingFollowersPreviewLayout"

type BuildingFollowersSocialProofTextProps = {
  followers: readonly SearchBuildingFollower[]
  total?: number | null
  className?: string
}

export function BuildingFollowersSocialProofText({
  followers,
  total,
  className,
}: BuildingFollowersSocialProofTextProps) {
  const safeTotal = normalizeFollowerTotal(total ?? followers.length)
  const parts = getBuildingFollowersSocialProofParts(followers, safeTotal)

  if (parts.kind === "empty") {
    return (
      <p className={cn(BUILDING_FOLLOWERS_PREVIEW_EMPTY_TEXT_CLASS, className)}>
        {parts.text}
      </p>
    )
  }

  if (parts.fullText) {
    return (
      <p className={cn(BUILDING_FOLLOWERS_PREVIEW_SOCIAL_PROOF_CLASS, className)}>
        {parts.fullText}
      </p>
    )
  }

  return (
    <p className={cn(BUILDING_FOLLOWERS_PREVIEW_SOCIAL_PROOF_CLASS, className)}>
      {parts.primaryName && (
        <span className="font-semibold text-slate-950">{parts.primaryName}</span>
      )}
      {parts.isVerified && parts.primaryName && (
        <>
          {" "}
          <BadgeCheck
            aria-label="Verified follower"
            className="mb-0.5 inline h-3.5 w-3.5 shrink-0 text-sky-600"
          />
        </>
      )}
      {parts.suffix}
    </p>
  )
}
