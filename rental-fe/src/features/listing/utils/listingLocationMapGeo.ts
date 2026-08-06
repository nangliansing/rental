import type { BuildingLocation } from "@/features/map-search/types"
import { getPositionFromBuildingLocation } from "@/features/map-search/utils/map-position"
import type { ReadOnlyMapPointGeo } from "@/shared/google-maps/readonly-map"

type BuildingLocationSource = {
  location?: BuildingLocation | null
} | null | undefined

/** Valid building point for a read-only map pin, or null when coords are missing/invalid. */
export function listingBuildingToReadOnlyMapGeo(
  building: BuildingLocationSource,
): ReadOnlyMapPointGeo | null {
  const position = getPositionFromBuildingLocation(building?.location ?? null)
  if (!position) return null

  return {
    kind: "point",
    position,
  }
}
