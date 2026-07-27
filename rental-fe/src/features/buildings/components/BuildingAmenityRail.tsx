import { ExploreNeighbourhoodButton } from "@/features/buildings/neighbourhood-explore/components/ExploreNeighbourhoodButton"
import { cn } from "@/lib/utils"

import {
  getBuildingAmenityIcon,
  getBuildingAmenityLabel,
} from "../utils/buildingAmenityDisplay"
import {
  BUILDING_AMENITY_RAIL_DIVIDER_CLASS,
  BUILDING_AMENITY_RAIL_SCROLL_CLASS,
  BUILDING_AMENITY_RAIL_TRACK_CLASS,
  collectBuildingAmenityItems,
  shouldRenderBuildingAmenityRail,
  shouldShowBuildingAmenityRailDivider,
} from "../utils/buildingAmenityRailLayout"
import { BuildingAmenityRailItem } from "./BuildingAmenityRailItem"

type BuildingAmenityRailProps = {
  facilities?: readonly string[] | null
  security?: readonly string[] | null
  className?: string
  onExploreNeighbourhood?: (trigger: HTMLButtonElement) => void
  isExploreOpen?: boolean
}

export function BuildingAmenityRail({
  facilities,
  security,
  className,
  onExploreNeighbourhood,
  isExploreOpen = false,
}: BuildingAmenityRailProps) {
  const items = collectBuildingAmenityItems(facilities, security)
  const hasExploreAction = typeof onExploreNeighbourhood === "function"

  if (!shouldRenderBuildingAmenityRail(items, hasExploreAction)) {
    return null
  }

  return (
    <div
      className={cn(BUILDING_AMENITY_RAIL_SCROLL_CLASS, className)}
      aria-label="Building facilities and security"
    >
      <div className={BUILDING_AMENITY_RAIL_TRACK_CLASS}>
        {hasExploreAction && onExploreNeighbourhood && (
          <>
            <ExploreNeighbourhoodButton
              variant="rail"
              isOpen={isExploreOpen}
              onClick={onExploreNeighbourhood}
            />

            {shouldShowBuildingAmenityRailDivider(items.length, hasExploreAction) && (
              <div className={BUILDING_AMENITY_RAIL_DIVIDER_CLASS} aria-hidden="true" />
            )}
          </>
        )}

        {items.map((item) => (
          <BuildingAmenityRailItem
            key={item}
            label={getBuildingAmenityLabel(item)}
            icon={getBuildingAmenityIcon(item)}
          />
        ))}
      </div>
    </div>
  )
}
