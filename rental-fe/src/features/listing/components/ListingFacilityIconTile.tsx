import { BuildingAmenityRailItem } from "@/features/buildings/components/BuildingAmenityRailItem"

import {
  getListingFacilityIcon,
  getListingFacilityLabel,
} from "../utils/listingFacilityDisplay"

type ListingFacilityIconTileProps = {
  value: string
}

/** Icon-in-circle + caption tile for a listing facility value. */
export function ListingFacilityIconTile({
  value,
}: ListingFacilityIconTileProps) {
  const label = getListingFacilityLabel(value)
  if (!label) return null

  return (
    <BuildingAmenityRailItem
      label={label}
      icon={getListingFacilityIcon(value)}
    />
  )
}
