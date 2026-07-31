import { cn } from "@/lib/utils"

import type { SearchBuildingFollower } from "../api/buildingFollowParsers"
import { formatBuildingFollowersPreviewAriaLabel } from "../utils/buildingFollowerDisplay"
import { BUILDING_FOLLOWERS_PREVIEW_BUTTON_CLASS } from "../utils/buildingFollowersPreviewLayout"

import { BuildingFollowerAvatarStack } from "./BuildingFollowerAvatarStack"
import { BuildingFollowersSocialProofText } from "./BuildingFollowersSocialProofText"

type BuildingFollowersPreviewRowProps = {
  buildingName?: string | null
  followers: readonly SearchBuildingFollower[]
  totalFollowers: number
  hasFollowers: boolean
  onOpen?: () => void
  className?: string
}

export function BuildingFollowersPreviewRow({
  buildingName,
  followers,
  totalFollowers,
  hasFollowers,
  onOpen,
  className,
}: BuildingFollowersPreviewRowProps) {
  const ariaLabel = formatBuildingFollowersPreviewAriaLabel(
    buildingName,
    totalFollowers,
  )

  const handleOpen = () => {
    onOpen?.()
  }

  return (
    <button
      type="button"
      className={cn(BUILDING_FOLLOWERS_PREVIEW_BUTTON_CLASS, className)}
      aria-label={ariaLabel}
      onClick={handleOpen}
    >
      {hasFollowers && (
        <BuildingFollowerAvatarStack
          followers={followers}
          total={totalFollowers}
        />
      )}
      <BuildingFollowersSocialProofText
        followers={followers}
        total={totalFollowers}
      />
    </button>
  )
}
