import { useCallback, useState } from "react"

import type { BuildingSummaryData } from "@/features/buildings/utils/buildingSummaryDisplay"
import { cn } from "@/lib/utils"

import { normalizeBuildingFollowersBuildingId } from "../utils/buildingFollowerDisplay"
import { BuildingFollowersModal } from "./BuildingFollowersModal"
import { BuildingFollowersPreview } from "./BuildingFollowersPreview"

type BuildingFollowersSectionProps = {
  building?: BuildingSummaryData | null
  viewerUserId?: string | null
  enabled?: boolean
  className?: string
  trackBrowserHistory?: boolean
}

export function BuildingFollowersSection({
  building,
  viewerUserId,
  enabled = true,
  className,
  trackBrowserHistory = true,
}: BuildingFollowersSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const buildingId = normalizeBuildingFollowersBuildingId(building?._id)

  const openModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  if (!buildingId || !enabled) {
    return null
  }

  return (
    <div className={cn("min-w-0", className)}>
      <BuildingFollowersPreview
        buildingId={buildingId}
        buildingName={building?.name}
        enabled={enabled}
        onOpen={openModal}
      />

      <BuildingFollowersModal
        isOpen={isModalOpen}
        building={building}
        buildingId={buildingId}
        viewerUserId={viewerUserId}
        onClose={closeModal}
        trackBrowserHistory={trackBrowserHistory}
      />
    </div>
  )
}
