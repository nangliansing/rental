import type React from "react"

import { cn } from "@/lib/utils"

import type { SearchBuilding } from "../../types"
import { getBuildingListItemGapClass } from "../../utils/building-list-layout"
import { BuildingCard } from "./BuildingCard"

export type BuildingListRowProps = {
  building: SearchBuilding
  index: number
  totalCount: number
  selectedBuildingId: string | null
  isListingSearch: boolean
  canCreateListing: boolean
  onBuildingSelect: (building: SearchBuilding) => void
  onBuildingHoverChange: (buildingId: string | null) => void
  onListExistingBuilding: (building: SearchBuilding) => void
  className?: string
  style?: React.CSSProperties
  listItemRef?: React.Ref<HTMLDivElement>
  dataIndex?: number
}

export function BuildingListRow({
  building,
  index,
  totalCount,
  selectedBuildingId,
  isListingSearch,
  canCreateListing,
  onBuildingSelect,
  onBuildingHoverChange,
  onListExistingBuilding,
  className,
  style,
  listItemRef,
  dataIndex,
}: BuildingListRowProps) {
  return (
    <div
      ref={listItemRef}
      role="listitem"
      data-index={dataIndex}
      className={cn(getBuildingListItemGapClass(index, totalCount), className)}
      style={style}
    >
      <BuildingCard
        building={building}
        isSelected={selectedBuildingId === building._id}
        isListingSearch={isListingSearch}
        canCreateListing={canCreateListing}
        onSelect={onBuildingSelect}
        onHoverChange={onBuildingHoverChange}
        onListHere={onListExistingBuilding}
      />
    </div>
  )
}
