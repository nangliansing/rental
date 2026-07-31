import { useBuildingFollowersPreviewData } from "../hooks/useBuildingFollowersPreviewData"
import { BuildingFollowersPreviewRow } from "./BuildingFollowersPreviewRow"
import { BuildingFollowersPreviewSkeleton } from "./BuildingFollowersPreviewSkeleton"

type BuildingFollowersPreviewProps = {
  buildingId?: string | null
  buildingName?: string | null
  enabled?: boolean
  onOpen?: () => void
  className?: string
}

export function BuildingFollowersPreview({
  buildingId,
  buildingName,
  enabled = true,
  onOpen,
  className,
}: BuildingFollowersPreviewProps) {
  const preview = useBuildingFollowersPreviewData({ buildingId, enabled })

  if (!preview.shouldRender) {
    return null
  }

  if (preview.isInitialLoading) {
    return <BuildingFollowersPreviewSkeleton className={className} />
  }

  return (
    <BuildingFollowersPreviewRow
      buildingName={buildingName}
      followers={preview.followers}
      totalFollowers={preview.totalFollowers}
      hasFollowers={preview.hasFollowers}
      onOpen={onOpen}
      className={className}
    />
  )
}
