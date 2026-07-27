import type { LucideIcon } from "lucide-react"

import {
  BUILDING_AMENITY_RAIL_AMENITY_ICON_SURFACE_CLASS,
  BUILDING_AMENITY_RAIL_ICON_CLASS,
  BUILDING_AMENITY_RAIL_ITEM_CLASS,
  BUILDING_AMENITY_RAIL_LABEL_CLASS,
} from "../utils/buildingAmenityRailLayout"

type BuildingAmenityRailItemProps = {
  label: string
  icon: LucideIcon
}

export function BuildingAmenityRailItem({
  label,
  icon: Icon,
}: BuildingAmenityRailItemProps) {
  return (
    <div className={BUILDING_AMENITY_RAIL_ITEM_CLASS}>
      <div className={BUILDING_AMENITY_RAIL_AMENITY_ICON_SURFACE_CLASS}>
        <Icon
          aria-hidden="true"
          className={BUILDING_AMENITY_RAIL_ICON_CLASS}
          strokeWidth={2}
        />
      </div>
      <span className={BUILDING_AMENITY_RAIL_LABEL_CLASS}>{label}</span>
    </div>
  )
}
