import { useRef } from "react"

import type { BuildingSummaryData } from "@/features/buildings/utils/buildingSummaryDisplay"
import { ModalDismissHeader } from "@/shared/components/navigation/ModalDismissHeader"
import { ResponsiveScreenModal } from "@/shared/components/modals/ResponsiveScreenModal"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import { useSearchBuildingFollowers } from "../api"
import {
  formatBuildingFollowerCount,
  formatBuildingFollowersModalAriaLabel,
  getBuildingFollowersModalTitle,
  normalizeBuildingFollowersBuildingId,
  normalizeFollowerTotal,
} from "../utils/buildingFollowerDisplay"
import { BUILDING_FOLLOWERS_MODAL_BODY_CLASS } from "../utils/buildingFollowersModalLayout"
import { BuildingFollowersList } from "./BuildingFollowersList"

type BuildingFollowersModalProps = {
  isOpen: boolean
  building?: BuildingSummaryData | null
  buildingId?: string | null
  viewerUserId?: string | null
  onClose: () => void
  trackBrowserHistory?: boolean
}

export function BuildingFollowersModal({
  isOpen,
  building,
  buildingId,
  viewerUserId,
  onClose,
  trackBrowserHistory = true,
}: BuildingFollowersModalProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const normalizedBuildingId =
    normalizeBuildingFollowersBuildingId(buildingId) ||
    normalizeBuildingFollowersBuildingId(building?._id)

  const followersQuery = useSearchBuildingFollowers({
    buildingId: normalizedBuildingId,
    limit: DEFAULT_LISTING_PAGE_SIZE,
    enabled: isOpen && normalizedBuildingId.length > 0,
  })

  if (!isOpen || !normalizedBuildingId) {
    return null
  }

  const modalTitle = getBuildingFollowersModalTitle(building?.name)
  const ariaLabel = formatBuildingFollowersModalAriaLabel(building?.name)
  const totalFollowers = normalizeFollowerTotal(
    followersQuery.data?.pages[0]?.pagination.total,
  )
  const followerCountDescription =
    followersQuery.isPending && followersQuery.data == null
      ? undefined
      : formatBuildingFollowerCount(totalFollowers)

  return (
    <ResponsiveScreenModal
      isOpen
      onClose={onClose}
      ariaLabel={ariaLabel}
      trackBrowserHistory={trackBrowserHistory}
    >
      {({ requestClose }) => (
        <>
          <ModalDismissHeader
            onClose={requestClose}
            closeLabel="Close followers"
            title={modalTitle}
            description={followerCountDescription}
          />

          <div ref={scrollRef} className={BUILDING_FOLLOWERS_MODAL_BODY_CLASS}>
            <BuildingFollowersList
              buildingId={normalizedBuildingId}
              viewerUserId={viewerUserId}
              enabled={isOpen}
              rootRef={scrollRef}
            />
          </div>
        </>
      )}
    </ResponsiveScreenModal>
  )
}
